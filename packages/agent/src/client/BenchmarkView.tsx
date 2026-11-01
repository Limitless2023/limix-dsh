/**
 * [INPUT]: limix benchmark 的固定拆分、逐模型状态与本地指标。
 * [OUTPUT]: BenchmarkView，按数据集比较同一指标与运行状态。
 * [POS]: 工具卡的模型比较视图；失败不补零，不跨数据集混合误差。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'

interface Dataset { id: string; name: string; task_type: string; train_rows: number; test_rows: number; feature_count: number }
interface Run { dataset_id: string; model: string; status: string; metrics?: Record<string, number | null>; elapsed_seconds?: number; error?: string }
export interface BenchmarkResult { kind: 'benchmark'; datasets: Dataset[]; runs: Run[]; seed?: number }
const labels: Record<string, string> = { rmse: '均方根误差', mae: '平均绝对误差', r2: '拟合度 R²', accuracy: '准确率', balanced_accuracy: '平衡准确率', f1_macro: '宏平均 F1' }
const statuses: Record<string, string> = { succeeded: '已完成', failed: '失败', pending: '等待续查', running: '运行中', skipped: '未运行' }
const colors = ['#4168a9', '#248575', '#bb8b47', '#929baa']
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const CSS = `.lx-bench-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:16px 0}.lx-bench-controls label{display:flex;gap:7px;align-items:center}.lx-bench-controls select{font:inherit;color:inherit;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l3,#ddd);border-radius:5px;padding:4px 8px}.lx-bench-chart{width:100%;height:auto;max-height:320px}.lx-bench-table{width:100%;border-collapse:collapse;font-size:12px}.lx-bench-table th,.lx-bench-table td{text-align:left;padding:8px;border-bottom:1px solid var(--dsw-alias-border-l3,#e3e6eb);font-variant-numeric:tabular-nums}.lx-bench-scroll{overflow:auto}.lx-bench-error{color:var(--dsw-alias-label-secondary);font-size:12px;overflow-wrap:anywhere}`

export function BenchmarkView({ data }: { data: BenchmarkResult }) {
  const [datasetId, setDatasetId] = useState(data.datasets?.[0]?.id ?? '')
  const [metric, setMetric] = useState('')
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const change = (event: Event) => {
      const target = event.target as HTMLSelectElement
      if (target.dataset.bench === 'dataset') { setDatasetId(target.value); setMetric('') }
      if (target.dataset.bench === 'metric') setMetric(target.value)
    }
    el.addEventListener('change', change)
    return () => el.removeEventListener('change', change)
  }, [])
  const datasets = Array.isArray(data.datasets) ? data.datasets : []
  const dataset = datasets.find(item => item.id === datasetId) ?? datasets[0]
  const runs = (Array.isArray(data.runs) ? data.runs : []).filter(run => run.dataset_id === dataset?.id)
  const keys = dataset?.task_type === 'classification' ? ['accuracy', 'balanced_accuracy', 'f1_macro'] : ['rmse', 'mae', 'r2']
  const key = keys.includes(metric) ? metric : keys[0]
  const values = runs.filter(run => run.status === 'succeeded' && finite(run.metrics?.[key])).map(run => run.metrics![key] as number)
  const min = Math.min(0, ...values), max = Math.max(0, ...values)
  const range = max - min || 1
  const x = (value: number) => 150 + 430 * (value - min) / range
  const format = (value: unknown, name = key) => finite(value) ? (name.includes('accuracy') ? `${(value * 100).toFixed(2)}%` : String(Number(value.toFixed(4)))) : '—'
  if (!dataset) return <p className="lx-result-note">比较结果未包含数据集。</p>
  return <div ref={root} aria-label="多模型效果比较">
    <style>{CSS}</style>
    <div className="lx-bench-controls">
      <label>数据集 <select data-bench="dataset" value={dataset.id} onChange={() => {}} aria-label="比较数据集">{datasets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>指标 <select data-bench="metric" value={key} onChange={() => {}} aria-label="比较指标">{keys.map(item => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
      <span className="lx-result-meta">{key === 'rmse' || key === 'mae' ? '越低越好' : '越高越好'}</span>
    </div>
    <p className="lx-result-meta">训练 {dataset.train_rows} 行 · 测试 {dataset.test_rows} 行 · {dataset.feature_count} 个特征 · 相同拆分</p>
    <svg className="lx-bench-chart" viewBox={`0 0 700 ${runs.length * 46 + 32}`} role="img" aria-label={`${dataset.name}：${labels[key]}模型对比`}>
      <line x1={x(0)} x2={x(0)} y1="12" y2={runs.length * 46 + 6} stroke="currentColor" opacity=".2" />
      {runs.map((run, index) => {
        const value = run.status === 'succeeded' ? run.metrics?.[key] : null
        return <g key={run.model} transform={`translate(0 ${index * 46 + 20})`}>
          <text x="0" y="13" fill="currentColor" fontSize="12">{run.model.replace('LIMIX_', 'LimiX ')}</text>
          {finite(value) && <rect x={Math.min(x(0), x(value))} y="0" width={Math.abs(x(value) - x(0))} height="20" rx="2" fill={colors[index % colors.length]} />}
          <text x="600" y="14" fill="currentColor" fontSize="12">{finite(value) ? format(value) : statuses[run.status] ?? '状态待确认'}</text>
        </g>
      })}
    </svg>
    <div className="lx-bench-scroll"><table className="lx-bench-table"><thead><tr><th>模型</th>{keys.map(item => <th key={item}>{labels[item]}</th>)}<th>耗时</th><th>状态</th></tr></thead>
      <tbody>{runs.map(run => <tr key={run.model}><td>{run.model}</td>{keys.map(item => <td key={item}>{run.status === 'succeeded' ? format(run.metrics?.[item], item) : '—'}</td>)}<td>{finite(run.elapsed_seconds) ? `${run.elapsed_seconds.toFixed(1)} 秒` : '—'}</td><td>{statuses[run.status] ?? '状态待确认'}</td></tr>)}</tbody>
    </table></div>
    {runs.filter(run => run.error).map(run => <p className="lx-bench-error" key={run.model}>{run.model}：{run.error}</p>)}
  </div>
}
