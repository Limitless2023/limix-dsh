/**
 * [INPUT]: CLI 的 stdout / stderr 文本与工具错误标记。
 * [OUTPUT]: parseToolResult、resultState、metricEntries。
 * [POS]: 工具卡的展示模型；不从日志猜指标，区分预测 status 与扩展 task_status，保留降级和等待态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
type Json = Record<string, any>

function objectJson(text: string): Json | null {
  try {
    const v = JSON.parse(text)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch { return null }
}

export function parseToolResult(text: string) {
  const [stdout, stderr = ''] = text.split('\n[stderr]\n')
  const envelope = objectJson(stdout.trim())
  const data = typeof envelope?.stdout === 'string' ? objectJson(envelope.stdout) : envelope
  const errorData = objectJson(stderr.trim())
  const failed = (typeof envelope?.exitCode === 'number' && envelope.exitCode !== 0)
    || data?.ok === false || data?.success === false || ['failed', 'timeout'].includes(data?.task_status ?? data?.status)
    || (!stdout.trim() && !!stderr.trim())
  return { data, failed, error: errorData ?? data }
}

export function resultState(settled: boolean, failed: boolean, data: Json | null) {
  if (!settled) return { kind: 'running', label: '正在运行' }
  if (failed) return { kind: 'error', label: '未完成' }
  const status = data?.task_status ?? data?.status
  if (status === 'cancelled' || status === 'canceled') return { kind: 'idle', label: '已取消' }
  if (status === 'degraded_succeeded' || status === 'partially_succeeded' || status === 'partial') return { kind: 'warning', label: status === 'degraded_succeeded' ? '降级完成' : '部分完成' }
  if (data?.is_ready === false || ['accepted', 'pending', 'queued', 'running', 'processing', 'cancelling'].includes(status)) {
    return { kind: 'running', label: status === 'queued' ? '排队中' : status === 'cancelling' ? '正在取消' : '处理中' }
  }
  if (data?.task_status && status !== 'succeeded' && status !== 'reused') return { kind: 'idle', label: '状态待确认' }
  return { kind: 'done', label: data ? '已完成' : '已返回' }
}

export function metricEntries(data: Json | null): Array<{ key: string; label: string; value: string; description: string }> {
  const labels: Record<string, string> = { r2: '拟合度 R²', accuracy: '准确率', mape: '平均误差 MAPE', mae: '平均绝对误差', rmse: '均方根误差' }
  const descriptions: Record<string, string> = {
    r2: '相对直接猜平均值的改善程度。越接近 1 越好，也可能为负。',
    accuracy: '预测正确的样本占比。',
    mape: '平均相对误差，越低越好；真实值为 0 的样本不计入。',
    mae: '预测平均差多少，单位与目标值相同。',
    rmse: '对较大的误差更敏感，单位与目标值相同。',
  }
  return Object.entries(labels).flatMap(([key, label]) => {
    const value = data?.metrics?.[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) return []
    const display = key === 'accuracy' ? Number((value * 100).toFixed(2)) : Number(value.toFixed(4))
    return [{ key, label, value: `${display}${key === 'accuracy' || key === 'mape' ? '%' : ''}`, description: descriptions[key] }]
  })
}
