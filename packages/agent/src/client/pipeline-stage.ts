/**
 * [INPUT]: 依赖 ./tool-result.ts 的 parseToolResult/resultState/metricEntries；数据是工具名、参数与 CLI 输出文本。
 * [OUTPUT]: 对外提供 Stage、limixStage、localStage、runningStage、parseSteps、classifyLimix。
 * [POS]: 分析过程的单步翻译层：把一次工具调用译成业务标题、参数行、结果行与接口步骤。
 *        pipeline-model.ts 负责分轮，本文件不感知轮次与界面。指标只读工具 metrics，不从日志猜数字。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { metricEntries, parseToolResult, resultState } from './tool-result.ts'

type Args = Record<string, unknown>
type Json = Record<string, any>

export interface Stage {
  key: string
  toolName: string
  args: Args
  data: Json | null
  title: string
  /** 业务参数一行：模型、范围、文件 */
  meta: string
  /** 结果一行：不含状态词，状态见 stateLabel */
  outcome: string
  stateKind: string
  stateLabel: string
  /** 是否真打到 LimiX 平台；--help 与纯本地比较为 false */
  limix: boolean
  summary: string
  inputKv: Array<[string, string]>
  inputRaw: string
  output: string
  metrics: Array<[string, string]>
  ids: Array<[string, string]>
  errLine: string
  ok: boolean
  running?: boolean
  parallel?: boolean
  time: number
  start: number
  end: number
  substeps: string[]
}

/** 节点时间与序号：stageFrom* 只需要这些，不依赖完整节点结构 */
export interface StageClock { key: string; time: number; start: number; end: number }

/* ── 参数读取 ────────────────────────────────────────────────────────── */
const baseName = (p: string) => p.split('/').pop() ?? p
const argList = (args: Args) => (Array.isArray(args.args) ? args.args.map(String) : [])
const clip = (text: string, size: number) => (text.length > size ? `${text.slice(0, size)}…（已截断）` : text)

function flag(list: string[], ...names: string[]): string {
  const i = list.findIndex(tok => names.includes(tok))
  return i >= 0 && i + 1 < list.length ? list[i + 1] : ''
}

/** limix CLI 旗标 → 中文键 */
const FLAG_ZH: Record<string, string> = {
  '--train': '训练文件', '--predict': '预测文件', '--target': '目标列', '--date': '时间列',
  '--context': '历史窗口', '--horizon': '预测步数', '--covariates': '协变量', '--model': '模型',
  '--models': '模型', '-o': '输出文件', '--output': '输出文件', '--levels': '分位档',
  '--quantile': '带分位区间', '--sync': '同步模式', '--timeout': '超时(s)', '--data': '数据文件',
  '--date-format': '时间格式', '--truth': '真值文件', '--mode': '解释方式', '--task-type': '任务类型',
  '--rows': '解释范围', '--row': '解释行', '--labels': '字段说明文件', '--prediction': '原预测文件',
  '--features': '特征列', '--threshold': '关系阈值', '--task-id': '续查任务', '--result-version-id': '结果版本',
  '--manifest': '比较清单文件', '--datasets': '数据集', '--seed': '随机种子', '--python': '比较环境',
}

/** limix 参数 → 中文键值行 */
function limixKv(args: Args): Array<[string, string]> {
  const rows: Array<[string, string]> = [['子命令', String(args.command ?? '')]]
  const list = argList(args)
  for (let i = 0; i < list.length; i++) {
    const tok = list[i]
    if (tok.startsWith('-')) {
      const zh = FLAG_ZH[tok] ?? tok
      const next = list[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        rows.push([zh, /文件|环境/.test(zh) ? baseName(next) : next])
        i++
      } else rows.push([zh, '开'])
    } else rows.push(['参数', baseName(tok)])
  }
  return rows.filter(([, v]) => v !== '')
}

/* ── LimiX 调用的业务语义 ────────────────────────────────────────────── */
/** 能力名称与 API 文档一致：因果解释；模式在流程摘要中区分全局因果与局部归因。 */
export function classifyLimix(args: Args): { title: string; limix: boolean } {
  const cmd = String(args.command ?? '')
  const list = argList(args)
  const joined = list.join(' ')
  if (list.includes('--help') || list.includes('-h')) return { title: '查看命令说明', limix: false }
  const titles: Record<string, string> = {
    upload: '上传数据', classify: '分类预测', regress: '回归预测', forecast: '时序预测',
    task: '查询任务', tasks: '查看任务历史', result: '查询结果版本', download: '下载结果',
    health: '检查服务连接', check: '检查接口权限', data: '查询数据版本', cancel: '取消任务',
  }
  if (cmd === 'explain') return { title: '因果解释', limix: true }
  if (cmd === 'benchmark') {
    const models = flag(list, '--models')
    return !models || /LIMIX/i.test(models) ? { title: '模型比较', limix: true } : { title: '模型比较', limix: false }
  }
  if (cmd === 'api') {
    if (/explanation/i.test(joined)) return { title: '因果解释', limix: true }
    if (/visualization/i.test(joined)) return { title: '官方图表接口', limix: true }
    if (/evaluat/i.test(joined)) return { title: '评估', limix: true }
    if (/imput/i.test(joined)) return { title: '缺失补全', limix: true }
    return { title: 'API 直调', limix: true }
  }
  return { title: titles[cmd] ?? `limix ${cmd}`, limix: true }
}

function scopeText(list: string[]): string {
  const rows = flag(list, '--rows')
  if (rows) return rows === 'all' ? '全部样本' : `第 ${rows} 行`
  const row = flag(list, '--row')
  return row ? `第 ${row} 行` : ''
}

function limixMeta(cmd: string, list: string[], data: Json | null): string {
  const model = data?.model_type ?? flag(list, '--model')
  if (['classify', 'regress', 'forecast'].includes(cmd)) {
    const train = flag(list, '--train')
    const predict = flag(list, '--predict')
    return [model, flag(list, '--target') && `目标 ${flag(list, '--target')}`,
      train && `参考 ${baseName(train)}`, predict && `预测 ${baseName(predict)}`,
      flag(list, '--horizon') && `未来 ${flag(list, '--horizon')} 步`].filter(Boolean).join(' · ')
  }
  if (cmd === 'explain') {
    const file = flag(list, '--data')
    return [model, scopeText(list), flag(list, '--target') && `目标 ${flag(list, '--target')}`,
      file && baseName(file)].filter(Boolean).join(' · ')
  }
  if (cmd === 'benchmark') {
    const models = flag(list, '--models').split(',').filter(Boolean).join('、')
    const names = (Array.isArray(data?.datasets) ? data.datasets : []).map((d: Json) => d.name).filter(Boolean)
    return [models, names.length === 1 ? names[0] : names.length > 1 ? `${names.length} 个数据集` : ''].filter(Boolean).join(' · ')
  }
  if (cmd === 'upload') return list.filter(tok => !tok.startsWith('-')).slice(0, 1).map(baseName).join('')
  return ''
}

function shortNumber(value: number): string {
  return String(Number(value.toPrecision(Math.abs(value) >= 100 ? 5 : 4)))
}

function benchmarkOutcome(data: Json): string {
  const runs: Json[] = Array.isArray(data.runs) ? data.runs : []
  if (!runs.length) return ''
  const done = runs.filter(r => r.status === 'succeeded').length
  const counts = `${done}/${runs.length} 组完成`
  if (!Array.isArray(data.datasets) || data.datasets.length !== 1) return counts
  const key = data.datasets[0].task_type === 'classification' ? 'accuracy' : 'rmse'
  const unit = key === 'rmse' ? String(data.datasets[0].unit ?? '') : ''
  const rows = runs.flatMap(r => (r.status === 'succeeded' && typeof r.metrics?.[key] === 'number' && Number.isFinite(r.metrics[key]) ? [`${r.model} ${shortNumber(r.metrics[key])}`] : []))
  return rows.length ? `${key === 'rmse' ? 'RMSE' : '准确率'}：${rows.join('，')}${unit && ` ${unit}`}` : counts
}

function explainOutcome(data: Json): string {
  const view: Json | undefined = data.explanation
  if (!view) return ''
  if (Array.isArray(view.nodes) && Array.isArray(view.edges)) return `${view.nodes.length} 个变量 · ${view.edges.length} 条关系`
  const parts: string[] = []
  if (typeof view.explained_count === 'number' && typeof view.requested_count === 'number') {
    parts.push(`已解释 ${view.explained_count}/${view.requested_count} 行`)
  }
  if (Array.isArray(view.feature_names)) parts.push(`${view.feature_names.length} 个特征`)
  return parts.join(' · ')
}

function limixOutcome(cmd: string, data: Json | null): string {
  if (!data) return ''
  if (cmd === 'explain') return explainOutcome(data)
  if (cmd === 'benchmark') return benchmarkOutcome(data)
  if (cmd === 'upload' && typeof data.row_count === 'number') return `${data.row_count} 行 × ${data.column_count} 列`
  if (cmd === 'check' && typeof data.allowed === 'boolean') return data.allowed ? '有权限' : '无权限'
  const metrics = metricEntries(data).slice(0, 2).map(m => `${m.label} ${m.value}`)
  const rows = typeof data.metrics?.n === 'number' ? [`${data.metrics.n} 行`] : []
  return [...rows, ...metrics].join(' · ')
}

/* ── CLI 日志 → 接口步骤 ─────────────────────────────────────────────── */
const DONE_STATUS = new Set(['finished', 'succeeded', 'degraded_succeeded', 'partially_succeeded'])
const STOP_STATUS: Record<string, string> = { failed: '任务失败', timeout: '任务超时', cancelled: '任务取消' }

function statusStep(status: string): string {
  return DONE_STATUS.has(status) ? '任务完成' : STOP_STATUS[status] ?? '等待完成'
}

/** 解析 stderr 进度日志；旧会话缺的步骤保持缺失，不补写。 */
export function parseSteps(text: string): string[] {
  const idx = text.indexOf('\n[stderr]\n')
  if (idx < 0) return []
  const out: string[] = []
  const put = (step: string) => {
    // 多条状态日志合成一步：等待中的步骤被下一个状态或终态取代
    if (out[out.length - 1] === '等待完成' && /^(等待完成|任务(完成|失败|超时|取消))$/.test(step)) out[out.length - 1] = step
    else out.push(step)
  }
  for (const line of text.slice(idx + 10).split('\n')) {
    const l = line.trim()
    let m: RegExpMatchArray | null
    if ((m = l.match(/^上传成功:\s*(.+?)\s*→/))) put(`上传 ${m[1]}`)
    else if ((m = l.match(/^([^:：]{1,12}):\s*使用已有数据版本/))) put(`复用${m[1]}`)
    else if (/^已提交异步任务\s/.test(l)) put('提交任务')
    else if (/^解释任务\s*\S+?；/.test(l)) put('提交解释')
    else if (/^续查解释任务\s/.test(l)) put('续查任务')
    else if ((m = l.match(/^任务\s*\S+:\s*(\S+)/))) put(statusStep(m[1]))
    else if ((m = l.match(/^已下载\s*→\s*(.+?)(?:\s+\(\d+ bytes\))?$/))) put(`下载 ${baseName(m[1])}`)
    else if ((m = l.match(/^已保存解释\s*→\s*(.+)$/))) put(`保存 ${baseName(m[1])}`)
    else if (/^结果版本\s/.test(l)) put('生成结果版本')
    else if ((m = l.match(/^benchmark\s+\S+?\/(\S+):\s*(\S+)/))) put(`${m[1]} ${m[2] === 'succeeded' ? '完成' : m[2] === 'failed' ? '失败' : '未完成'}`)
    else if (/重试/.test(l)) put('网络重试')
  }
  return out
}

/* ── 结果文本 ────────────────────────────────────────────────────────── */
const ID_LABELS: Record<string, string> = {
  task_id: '任务', result_id: '解释结果', result_version_id: '结果版本', data_version_id: '数据版本',
}

function outputText(data: Json | null, text: string): string {
  return data ? clip(JSON.stringify(data, null, 2), 2000) : clip(text.split('\n[stderr]\n')[0].trim() || text.trim(), 1200) || '（无输出）'
}

function errorLine(error: Json | null, text: string): string {
  if (typeof error?.error === 'string') return error.error.slice(0, 180)
  if (typeof error?.error_message === 'string') return error.error_message.slice(0, 180)
  const idx = text.indexOf('\n[stderr]\n')
  const lines = (idx >= 0 ? text.slice(idx + 10) : text).split('\n').map(l => l.trim())
  return (lines.find(Boolean) ?? '').slice(0, 180)
}

function settledBase(text: string, isError: boolean | undefined, clock: StageClock) {
  const { data, failed, error } = parseToolResult(text)
  const stopped = !!isError || failed
  const state = resultState(true, stopped, data)
  return {
    data, ...clock, ok: !stopped, stateKind: state.kind, stateLabel: state.label,
    errLine: stopped ? errorLine(error, text) : '',
    output: outputText(data, text),
  }
}

/* ── 对外构造器 ──────────────────────────────────────────────────────── */
export function limixStage(args: Args, text: string, isError: boolean | undefined, clock: StageClock): Stage {
  const cmd = String(args.command ?? '')
  const list = argList(args)
  const { data, ...base } = settledBase(text, isError, clock)
  const { title, limix } = classifyLimix(args)
  const ids = Object.keys(ID_LABELS).flatMap((key): Array<[string, string]> =>
    typeof data?.[key] === 'string' ? [[ID_LABELS[key], data[key]]] : [])
  return {
    ...base, toolName: 'limix', args, data, title, limix, meta: limixMeta(cmd, list, data), outcome: limixOutcome(cmd, data),
    summary: ['limix', cmd, ...list].filter(Boolean).join(' ').slice(0, 200),
    inputKv: limixKv(args), inputRaw: clip(JSON.stringify(args, null, 2), 2000),
    metrics: metricEntries(data).map(m => [m.label, m.value]), ids,
    substeps: limix ? parseSteps(text) : [],
  }
}

const isReportFile = (path: string) => /\.(md|html)$/i.test(path)

/** 本地工具 → 业务标题与参数行；bash 优先用模型自述的 description */
function describeLocal(name: string, args: Args): { title: string; kv: Array<[string, string]>; summary: string } {
  const path = String(args.file_path ?? args.path ?? '')
  const file = path ? baseName(path) : ''
  const fileKv: Array<[string, string]> = file ? [['文件', file]] : []
  const brief = (title: string) => ({ title, kv: fileKv, summary: path || title })
  switch (name) {
    case 'bash': {
      const command = String(args.command ?? '')
      const description = String(args.description ?? '').trim()
      return {
        title: description.slice(0, 60) || '运行命令',
        kv: [...(description ? [['说明', description] as [string, string]] : []), ['命令', command.slice(0, 300) || '（命令为空）']],
        summary: command.slice(0, 200),
      }
    }
    case 'read': return brief(`读取文件 ${file}`)
    case 'write': return brief(`${isReportFile(path) ? '生成报告' : '写入文件'} ${file}`)
    case 'edit': return brief(`${isReportFile(path) ? '修改报告' : '修改文件'} ${file}`)
    case 'present': {
      const files = Array.isArray(args.files) ? (args.files as Array<{ path?: string }>) : []
      const first = baseName(String(files[0]?.path ?? ''))
      return { title: `展示文件 ${first}${files.length > 1 ? ` 等 ${files.length} 个` : ''}`, kv: files.map(f => ['文件', baseName(String(f.path ?? ''))] as [string, string]), summary: first }
    }
    case 'datasource': {
      const command = String(args.command ?? '')
      const title = command === 'query' ? (args.mode === 'materialize' ? '取数落盘' : '取数预览') : command === 'inspect' ? '查看库表结构' : '查看数据源清单'
      const kv: Array<[string, string]> = [['子命令', command]]
      if (args.table) kv.push(['表', String(args.table)])
      if (args.fileName) kv.push(['落盘文件', String(args.fileName)])
      if (args.sql) kv.push(['SQL', String(args.sql).slice(0, 300)])
      return { title, kv, summary: String(args.sql ?? args.table ?? command).slice(0, 200) }
    }
    case 'grep': case 'glob': return { title: '搜索文件', kv: [['条件', String(args.pattern ?? '')]], summary: String(args.pattern ?? '') }
    case 'web_fetch': return { title: '读取网页', kv: [['网址', String(args.url ?? '')]], summary: String(args.url ?? '') }
    case 'web_search': return { title: '搜索网页', kv: [['关键词', JSON.stringify(args.queries ?? '')]], summary: '搜索网页' }
    case 'todo_write': return brief('更新待办')
    case 'ask_user_question': return brief('询问用户')
    case 'load_workspace_dependencies': return brief('加载工作区依赖')
    case 'subagent': return brief('调用子代理')
    case 'skill': return brief('加载技能')
    default: return { title: name, kv: [], summary: name }
  }
}

export function localStage(name: string, args: Args, text: string, isError: boolean | undefined, clock: StageClock): Stage {
  const { data: _data, ...base } = settledBase(text, isError, clock)
  const { title, kv, summary } = describeLocal(name, args)
  return {
    ...base, toolName: name, args, data: _data, title, limix: false, meta: '', outcome: '', summary, inputKv: kv,
    inputRaw: clip(JSON.stringify(args, null, 2), 2000), metrics: [], ids: [], substeps: [],
    output: clip(text.trim(), 1200) || '（无输出）',
  }
}

/** 运行中节点尚无输出：只翻译标题与参数，end 取最大值以便并行判定 */
export function runningStage(name: string, args: Args, key: string, time: number): Stage {
  const local = name === 'limix' ? null : describeLocal(name, args)
  const { title, limix } = local ? { title: local.title, limix: false } : classifyLimix(args)
  const list = argList(args)
  return {
    key, toolName: name, args, data: null, title, limix, running: true, ok: true, time, start: time, end: Number.MAX_SAFE_INTEGER,
    meta: local ? '' : limixMeta(String(args.command ?? ''), list, null), outcome: '',
    stateKind: 'running', stateLabel: '运行中', summary: local?.summary ?? list.join(' ').slice(0, 200),
    inputKv: local?.kv ?? limixKv(args), inputRaw: clip(JSON.stringify(args, null, 2), 2000),
    output: '（进行中）', metrics: [], ids: [], errLine: '', substeps: [],
  }
}
