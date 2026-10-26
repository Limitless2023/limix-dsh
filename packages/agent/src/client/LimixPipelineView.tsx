/**
 * [INPUT]: 依赖 react（宿主 external）；数据来自 conversation.view 标准套件的 useSession 选择器
 *          （ConversationSnapshot.nodes：kind='user' 分轮、'assistant' 出结论、'tool-result' 出阶段；
 *           runningCalls 补运行中）
 * [OUTPUT]: 对外提供 LimixPipelineView——"分析过程"标签页：分轮 LimiX 调用管线。
 *           讲人话四件套：阶段耗时/关键指标直读/输入参数中文化/轮次结论一句话；
 *           轮头 LimiX ×N 徽标只数真打到平台的调用（hover 出子命令明细），零调用不打标；
 *           审计三件套：ID 可选中标签/失败首行高亮/旧轮默认折叠。最新一轮置顶展开
 * [POS]: limix-ui 的第三个界面成员；"轨迹"的业务观众版——三层粒度：轮次 → 工具调用 → 内部接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo, useState } from 'react'

const ACCENT = 'rgb(65, 118, 230)'

/* ── 节点结构子集（不 value-import 官方包，结构自持） ─────────────────── */
/** 工具结果/用户消息用 type 键，assistant 消息块经运行时转换后用 kind 键——两模式并存 */
interface ContentBlockLike { type?: string; kind?: string; text?: string }
interface NodeLike {
  kind: string
  seq: number
  time: number
  /** 工具调用发起时刻（settled 节点带）；与 time（完成时刻）构成区间，用于并行判定与耗时 */
  callTime?: number
  content?: ReadonlyArray<ContentBlockLike>
  /** assistant 节点的正文块在 blocks（kind 键）；tool-result/user 在 content（type 键） */
  blocks?: ReadonlyArray<ContentBlockLike>
  call?: { name: string; argsRaw?: string } | null
  isError?: boolean
}
interface RunningCallLike { name?: string; argsRaw?: string; callId?: string }

/* ── 解析层 ──────────────────────────────────────────────────────────── */
interface Stage {
  key: string
  cat: 'prep' | 'data' | 'upload' | 'predict' | 'evaluate' | 'explain' | 'poll' | 'download' | 'health' | 'api' | 'running' | 'report'
  title: string
  summary: string
  /** 输入：中文键值行（业务可读）；原始 JSON 收进折叠 */
  inputKv: Array<[string, string]>
  inputRaw: string
  output: string
  /** 输出里深扫出的关键指标（MAPE/R² 等） */
  metrics: Array<[string, string]>
  /** 输出里深扫出的追溯 ID（task_id 等，点击全选复制） */
  ids: Array<[string, string]>
  /** 失败时的 stderr 首行 */
  errLine: string
  ok: boolean
  /** 该阶段是否为 limix 工具调用（真打到 LimiX 平台）——轮头 LimiX ×N 徽标只数它 */
  limix?: boolean
  running?: boolean
  time: number
  start: number
  end: number
  substeps: string[]
}
interface Round {
  turn: number
  time: number
  ask: string
  /** 该轮 agent 最终回复的首句（结论一句话） */
  result: string
  stages: Stage[]
  /** 不进主线的其他工具活动（兜底可查：工具中文名 + 一行摘要） */
  others: Array<[string, string]>
}

function textOf(blocks?: ReadonlyArray<ContentBlockLike>): string {
  return (blocks ?? []).filter(b => (b.type === 'text' || b.kind === 'text') && b.text).map(b => b.text).join('\n')
}

function parseArgs(raw?: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw ?? '{}')
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {}
  } catch { return {} }
}

/** stdout 段解析成对象（剥 [stderr] 段；整体 → 首末花括号截取） */
function parseOutObj(text: string): Record<string, unknown> | null {
  const stdout = text.split('\n[stderr]\n')[0].trim()
  if (!stdout) return null
  const asObj = (v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  try { const v = asObj(JSON.parse(stdout)); if (v) return v } catch { /* 下一级 */ }
  const a = stdout.indexOf('{'); const b = stdout.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try { return asObj(JSON.parse(stdout.slice(a, b + 1))) } catch { /* 放弃 */ }
  }
  return null
}

/** 深扫对象里的目标键（≤3 层），同键取首见 */
function deepFind(obj: unknown, keys: string[], depth = 0, out: Record<string, unknown> = {}): Record<string, unknown> {
  if (!obj || typeof obj !== 'object' || depth > 3) return out
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const lk = k.toLowerCase()
    if (keys.includes(lk) && (typeof v === 'number' || typeof v === 'string')) {
      if (!(lk in out)) out[lk] = v
    } else if (typeof v === 'object') deepFind(v, keys, depth + 1, out)
  }
  return out
}

const METRIC_KEYS = ['mape', 'rmse', 'mae', 'r2', 'accuracy', 'auc', 'f1', 'skillmape', 'skillmae']
const METRIC_ZH: Record<string, string> = {
  mape: 'MAPE', rmse: 'RMSE', mae: 'MAE', r2: 'R²', accuracy: '准确率',
  auc: 'AUC', f1: 'F1', skillmape: '超基线(MAPE)', skillmae: '超基线(MAE)',
}
const ID_KEYS = ['task_id', 'result_version_id', 'data_version_id']
const ID_ZH: Record<string, string> = { task_id: '任务', result_version_id: '结果版本', data_version_id: '数据版本' }

function fmtMetric(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return Math.abs(n) >= 100 ? n.toFixed(1) : String(Number(n.toPrecision(4)))
}

/** 兜底区的工具中文名 */
const TOOL_ZH: Record<string, string> = {
  bash: 'Shell', str_replace_editor: '编辑文件', web_search: '网页搜索', skill: '加载技能',
  todo_write: '待办', ask_user_question: '询问用户', goal: '目标', subagent: '子代理',
}

/** limix CLI 旗标 → 中文键 */
const FLAG_ZH: Record<string, string> = {
  '--train': '训练文件', '--predict': '预测文件', '--target': '目标列', '--date': '时间列',
  '--context': '历史窗口', '--horizon': '预测步数', '--covariates': '协变量', '--model': '模型',
  '-o': '输出文件', '--output': '输出文件', '--levels': '分位档', '--quantile': '带分位区间',
  '--sync': '同步模式', '--timeout': '超时(s)', '--data': '请求体', '--date-format': '时间格式',
}
const baseName = (p: string) => (p.includes('/') ? p.split('/').pop() ?? p : p)

/** limix 参数 → 中文键值行 */
function limixKv(args: Record<string, unknown>): Array<[string, string]> {
  const rows: Array<[string, string]> = [['子命令', String(args.command ?? '')]]
  const list = Array.isArray(args.args) ? (args.args as unknown[]).map(String) : []
  for (let i = 0; i < list.length; i++) {
    const tok = list[i]
    if (tok.startsWith('-')) {
      const zh = FLAG_ZH[tok] ?? tok
      const next = list[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        rows.push([zh, /文件/.test(zh) ? baseName(next) : next])
        i++
      } else rows.push([zh, '开'])
    } else rows.push(['参数', baseName(tok)])
  }
  return rows.filter(([, v]) => v !== '')
}

/**
 * 解析一条龙命令内部的接口序列（CLI stderr 日志：上传/复用/提交/轮询/下载/结果版本/重试）
 */
function parseSubsteps(text: string): string[] {
  const idx = text.indexOf('\n[stderr]\n')
  if (idx < 0) return []
  const out: string[] = []
  let poll = 0
  for (const line of text.slice(idx + 10).split('\n')) {
    const l = line.trim()
    let m: RegExpMatchArray | null
    if ((m = l.match(/^上传成功:\s*(\S+)\s*→/))) out.push(`⇧ 上传 ${m[1]}`)
    else if ((m = l.match(/^([^:：]{1,12}):\s*使用已有数据版本/))) out.push(`⇧ ${m[1]}复用已有版本`)
    else if ((m = l.match(/^已提交异步任务\s*(\S+)/))) out.push(`▶ 提交任务 ${m[1].slice(0, 8)}…`)
    else if ((m = l.match(/^任务\s*\S+:\s*(\S+)/))) {
      poll += 1
      const label = `↻ 轮询 ×${poll}（${m[1]}）`
      if (out.length && out[out.length - 1].startsWith('↻ 轮询')) out[out.length - 1] = label
      else out.push(label)
    }
    else if ((m = l.match(/^已下载\s*→\s*(\S+)/))) out.push(`⇩ 下载 ${(m[1].split('/').pop() ?? m[1])}`)
    else if ((m = l.match(/^结果版本\s*(\S+)/))) out.push(`✓ 结果版本 ${m[1].slice(0, 8)}…`)
    else if (/重试/.test(l)) out.push('↻ 网络重试')
  }
  return out
}

/** 失败时抽 stderr 首个有内容行 */
function firstErrLine(text: string): string {
  const idx = text.indexOf('\n[stderr]\n')
  const err = idx >= 0 ? text.slice(idx + 10) : text
  for (const line of err.split('\n')) {
    const l = line.trim()
    if (l) return l.slice(0, 180)
  }
  return ''
}

/** limix 工具调用 → 阶段分类 */
function classifyLimix(args: Record<string, unknown>): { cat: Stage['cat']; title: string } {
  const cmd = String(args.command ?? '')
  const list = Array.isArray(args.args) ? (args.args as unknown[]).map(String) : []
  const joined = list.join(' ')
  if (cmd === 'upload') return { cat: 'upload', title: '上传数据' }
  if (cmd === 'classify' || cmd === 'regress' || cmd === 'forecast') {
    if (list.includes('--help') || list.includes('-h')) return { cat: 'api', title: '查用法' }
    const zh = cmd === 'classify' ? '分类' : cmd === 'regress' ? '回归' : '时序'
    return { cat: 'predict', title: `LimiX 预测（${zh}）` }
  }
  if (cmd === 'api') {
    if (/explanation/i.test(joined)) return { cat: 'explain', title: '因果解释' }
    if (/evaluat/i.test(joined)) return { cat: 'evaluate', title: '评估' }
    if (/imput/i.test(joined)) return { cat: 'data', title: '缺失补全' }
    return { cat: 'api', title: 'API 直调' }
  }
  if (cmd === 'task' || cmd === 'tasks' || cmd === 'result') return { cat: 'poll', title: '任务查询' }
  if (cmd === 'download') return { cat: 'download', title: '下载结果' }
  if (cmd === 'health' || cmd === 'check') return { cat: 'health', title: '连通性检查' }
  if (cmd === 'data') return { cat: 'poll', title: '数据查询' }
  return { cat: 'api', title: `limix ${cmd}` }
}

/** 由输出对象派生指标与 ID 标签 */
function deriveOut(text: string): { output: string; metrics: Array<[string, string]>; ids: Array<[string, string]> } {
  const obj = parseOutObj(text)
  const output = obj
    ? JSON.stringify(obj, null, 2).slice(0, 2000)
    : (text.split('\n[stderr]\n')[0].trim() || text.trim()).slice(0, 1200) || '（无输出）'
  const metricsRaw = obj ? deepFind(obj, METRIC_KEYS) : {}
  const idsRaw = obj ? deepFind(obj, ID_KEYS) : {}
  return {
    output,
    metrics: Object.entries(metricsRaw).map(([k, v]) => [METRIC_ZH[k] ?? k, fmtMetric(v)]),
    ids: Object.entries(idsRaw).map(([k, v]) => [ID_ZH[k] ?? k, String(v)]),
  }
}

/** 会话节点 → 分轮管线（升序解析，调用方倒序展示） */
function parseRounds(nodes: ReadonlyArray<NodeLike>, running: ReadonlyArray<RunningCallLike>): Round[] {
  const rounds: Round[] = []
  let cur: Round | null = null
  let turn = 0
  for (const n of nodes) {
    if (n.kind === 'user') {
      turn += 1
      cur = { turn, time: n.time, ask: textOf(n.content).slice(0, 120) || '（空消息）', result: '', stages: [], others: [] }
      rounds.push(cur)
      continue
    }
    if (!cur) continue
    if (n.kind === 'assistant') {
      // 该轮最终回复的首个正文行 → 结论一句话（后出现的覆盖先出现的）
      const first = textOf(n.blocks ?? n.content).split('\n').map(s => s.replace(/^[#>\-*\s]+/, '').trim()).find(s => s.length > 4)
      if (first) cur.result = first.slice(0, 110)
      continue
    }
    if (n.kind !== 'tool-result') continue
    const name = n.call?.name
    const args = parseArgs(n.call?.argsRaw)
    const fullText = textOf(n.content)
    const ok = !n.isError && !(/^\s*$/.test(fullText.split('\n[stderr]\n')[0]) && fullText.includes('[stderr]'))
    const base = {
      ok, time: n.time, start: n.callTime ?? n.time, end: n.time,
      errLine: ok ? '' : firstErrLine(fullText),
    }
    if (name === 'limix') {
      const { cat, title } = classifyLimix(args)
      const list = Array.isArray(args.args) ? (args.args as unknown[]).map(String) : []
      cur.stages.push({
        key: `s${n.seq}`, cat, title,
        summary: ['limix', String(args.command ?? ''), ...list].filter(Boolean).join(' ').slice(0, 200),
        inputKv: limixKv(args), inputRaw: JSON.stringify(args, null, 2).slice(0, 2000),
        ...deriveOut(fullText), substeps: parseSubsteps(fullText), ...base, limix: true,
      })
    } else if (name === 'datasource') {
      const cmd = String(args.command ?? '')
      const kv: Array<[string, string]> = [['子命令', cmd]]
      if (args.source) kv.push(['数据源', String(args.source).slice(0, 12) + '…'])
      if (args.table) kv.push(['表', String(args.table)])
      if (args.mode) kv.push(['模式', String(args.mode)])
      if (args.fileName) kv.push(['落盘文件', String(args.fileName)])
      if (args.sql) kv.push(['SQL', String(args.sql).slice(0, 300)])
      cur.stages.push({
        key: `s${n.seq}`, cat: 'data',
        title: cmd === 'query' ? (args.mode === 'materialize' ? '取数落盘（宽表）' : '取数预览') : cmd === 'inspect' ? '看库表结构' : '数据源清单',
        summary: ['datasource', cmd, String(args.sql ?? args.table ?? '')].filter(Boolean).join(' ').slice(0, 200),
        inputKv: kv, inputRaw: JSON.stringify(args, null, 2).slice(0, 2000),
        ...deriveOut(fullText), substeps: [], ...base,
      })
    } else if (name === 'bash') {
      const cmdText = String(args.command ?? '')
      // 分类优先级：产出报告（.html/.md 落盘）→ 数据处理（pandas/csv/python）→ 兜底"其他活动"
      if (/\.html|\.md\b|报告/i.test(cmdText) && /python|cat|tee|>|write/i.test(cmdText)) {
        cur.stages.push({
          key: `s${n.seq}`, cat: 'report', title: '生成报告',
          summary: cmdText.slice(0, 200),
          inputKv: [['命令', cmdText.slice(0, 300)]], inputRaw: cmdText.slice(0, 2000),
          output: fullText.slice(0, 1200) || '（无输出）', metrics: [], ids: [],
          substeps: [], ...base,
        })
      } else if (/pandas|\.csv|python/i.test(cmdText)) {
        cur.stages.push({
          key: `s${n.seq}`, cat: 'prep', title: '数据处理',
          summary: cmdText.slice(0, 200) || 'bash 数据处理',
          inputKv: [['命令', cmdText.slice(0, 300) || '（见原始参数）']], inputRaw: cmdText.slice(0, 2000),
          output: fullText.slice(0, 1200) || '（无输出）', metrics: [], ids: [],
          substeps: [], ...base,
        })
      } else {
        cur.others.push(['Shell', cmdText.slice(0, 90) || '（命令为空）'])
      }
    } else if (name === 'str_replace_editor' && /\.(html|md)"/.test(n.call?.argsRaw ?? '') && /create/.test(String(args.command ?? ''))) {
      const path = String((args as Record<string, unknown>).path ?? '')
      cur.stages.push({
        key: `s${n.seq}`, cat: 'report', title: '生成报告',
        summary: `写入 ${baseName(path)}`,
        inputKv: [['文件', baseName(path) || '（未知）']], inputRaw: JSON.stringify(args, null, 2).slice(0, 2000),
        output: fullText.slice(0, 800) || '（已写入）', metrics: [], ids: [],
        substeps: [], ...base,
      })
    } else if (name) {
      // 兜底：不进主线的工具活动计入"其他"，保证 tab 里没有 ≠ 没干活
      const brief = String(args.command ?? args.path ?? args.query ?? args.name ?? '').slice(0, 90)
        || (n.call?.argsRaw ?? '').slice(0, 90)
      cur.others.push([TOOL_ZH[name] ?? name, brief])
    }
  }
  const last = rounds[rounds.length - 1]
  if (last) {
    for (const rc of running) {
      if (rc.name !== 'limix' && rc.name !== 'datasource') continue
      const args = parseArgs(rc.argsRaw)
      const meta = rc.name === 'limix' ? classifyLimix(args) : { cat: 'data' as const, title: '数据源调用' }
      last.stages.push({
        key: `r${rc.callId ?? String(last.stages.length)}`, cat: meta.cat, title: meta.title,
        summary: '运行中…', inputKv: rc.name === 'limix' ? limixKv(args) : [['参数', '（运行中）']],
        inputRaw: JSON.stringify(args, null, 2).slice(0, 2000),
        output: '（进行中）', metrics: [], ids: [], errLine: '',
        ok: true, running: true, time: last.time,
        start: last.time, end: Number.MAX_SAFE_INTEGER, substeps: [], limix: rc.name === 'limix',
      })
    }
  }
  return rounds.filter(r => r.stages.length > 0 || r.others.length > 0).reverse() // 最新一轮置顶
}

/**
 * 相邻阶段的"并行"分组，两个判据取或：
 * ① 时间区间重叠 = 真·并发执行；
 * ② 无缝续接（间隔 ≤150ms）= 模型一步批量发出、宿主执行器排队串行跑
 *   （实测同批 limix 调用间隔 0~1ms；真·串行步之间隔着秒级 LLM 思考，不会误判）。
 * 两种在业务叙事里都是"agent 同时安排了这几件事"，且运行中/落定后显示一致
 */
function groupParallel(stages: Stage[]): Stage[][] {
  const groups: Stage[][] = []
  for (const s of stages) {
    const cur = groups[groups.length - 1]
    if (cur) {
      const overlap = cur.some(x => s.start < x.end)
      const queued = s.start - Math.max(...cur.map(x => x.end)) <= 150
      if (overlap || queued) { cur.push(s); continue }
    }
    groups.push([s])
  }
  return groups
}

/* ── 展示层 ──────────────────────────────────────────────────────────── */
const CAT_STYLE: Record<Stage['cat'], { bg: string; label: string }> = {
  prep: { bg: 'rgba(15,17,21,.055)', label: '⚙' },
  data: { bg: 'rgba(88,120,180,.14)', label: '🗄' },
  upload: { bg: 'rgba(65,118,230,.12)', label: '⇧' },
  predict: { bg: 'rgba(65,118,230,.2)', label: '◆' },
  evaluate: { bg: 'rgba(22,163,74,.14)', label: '☑' },
  explain: { bg: 'rgba(150,90,200,.16)', label: '☀' },
  poll: { bg: 'rgba(127,127,127,.12)', label: '↻' },
  download: { bg: 'rgba(127,127,127,.12)', label: '⇩' },
  health: { bg: 'rgba(127,127,127,.12)', label: '♥' },
  api: { bg: 'rgba(127,127,127,.12)', label: '≡' },
  running: { bg: 'rgba(180,83,9,.14)', label: '…' },
  report: { bg: 'rgba(20,140,120,.13)', label: '📄' },
}

function fmtDur(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.round(ms / 1000)
  if (s < 1) return '<1s'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}分${s % 60}秒`
}

function fmtTime(t: number): string {
  const d = new Date(t)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 轮次总耗时：首个发起到末个完成（排除运行中的 Infinity） */
function roundDur(r: Round): string {
  const ends = r.stages.map(s => s.end).filter(e => e !== Number.MAX_SAFE_INTEGER)
  if (!ends.length) return '运行中'
  return fmtDur(Math.max(...ends) - Math.min(...r.stages.map(s => s.start)))
}

const ui = {
  wrap: { padding: '14px 22px', overflowY: 'auto' as const, height: '100%', fontSize: 13 },
  empty: { opacity: 0.55, padding: 24, textAlign: 'center' as const, lineHeight: 2 },
  round: {
    border: '1px solid rgba(0,0,0,.09)', borderRadius: 12, padding: '12px 16px',
    marginBottom: 14, overflow: 'hidden', minWidth: 0,
  },
  roundHead: {
    display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' as const,
    cursor: 'pointer', userSelect: 'none' as const,
  },
  caret: { fontSize: 11, opacity: 0.45, width: 12 },
  turnTag: {
    fontSize: 11, fontWeight: 700, color: ACCENT, background: 'rgba(65,118,230,.1)',
    padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap' as const,
  },
  limixTag: {
    fontSize: 11, fontWeight: 700, color: '#fff', background: ACCENT,
    padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap' as const, cursor: 'help',
  },
  ask: { fontWeight: 600, overflowWrap: 'anywhere' as const },
  time: { fontSize: 11, opacity: 0.45, marginLeft: 'auto', whiteSpace: 'nowrap' as const },
  result: {
    margin: '6px 0 0 22px', fontSize: 12.5, opacity: 0.75, overflowWrap: 'anywhere' as const,
    borderLeft: `2px solid rgba(65,118,230,.35)`, paddingLeft: 8,
  },
  flow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 6, marginTop: 10 },
  chip: (cat: Stage['cat'], ok: boolean, active: boolean, running?: boolean) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 11px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
    background: CAT_STYLE[cat].bg,
    border: active ? `1.5px solid ${ACCENT}` : ok ? '1px solid rgba(0,0,0,.08)' : '1px solid rgba(220,38,38,.55)',
    color: ok ? 'inherit' : '#dc2626',
    opacity: running ? 0.8 : 1,
  }),
  chipMeta: { fontSize: 10.5, opacity: 0.55 },
  arrow: { opacity: 0.3, fontSize: 12 },
  parallel: {
    display: 'inline-flex', flexDirection: 'column' as const, gap: 4,
    padding: 5, borderRadius: 10, border: `1px dashed rgba(65,118,230,.4)`,
  },
  parallelTag: { fontSize: 10, color: ACCENT, opacity: 0.75, lineHeight: 1, paddingLeft: 2 },
  errBox: {
    marginTop: 10, padding: '6px 10px', borderRadius: 8, fontSize: 12,
    color: '#dc2626', background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.25)',
    overflowWrap: 'anywhere' as const,
  },
  metricPill: {
    display: 'inline-flex', gap: 4, alignItems: 'baseline',
    padding: '2px 10px', borderRadius: 999, fontSize: 12,
    background: 'rgba(22,163,74,.09)', border: '1px solid rgba(22,163,74,.3)',
  },
  idPill: {
    display: 'inline-flex', gap: 4, alignItems: 'baseline',
    padding: '2px 10px', borderRadius: 999, fontSize: 11.5,
    background: 'rgba(127,127,127,.08)', border: '1px solid rgba(0,0,0,.1)',
  },
  idVal: { fontFamily: 'ui-monospace, monospace', userSelect: 'all' as const, cursor: 'text' },
  substeps: {
    marginTop: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 5,
    borderTop: '1px dashed rgba(0,0,0,.12)', paddingTop: 10,
  },
  substep: {
    fontSize: 11.5, padding: '2px 9px', borderRadius: 999,
    background: 'rgba(65,118,230,.07)', border: '1px solid rgba(65,118,230,.2)',
    whiteSpace: 'nowrap' as const,
  },
  detail: {
    marginTop: 10, borderTop: '1px dashed rgba(0,0,0,.12)', paddingTop: 10,
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12,
  },
  ioLabel: { fontSize: 11, opacity: 0.5, marginBottom: 4 },
  kvGrid: {
    display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '3px 12px',
    fontSize: 12.5, background: 'rgba(127,127,127,.07)', borderRadius: 8, padding: 10,
  },
  kvKey: { opacity: 0.55, whiteSpace: 'nowrap' as const },
  kvVal: { overflowWrap: 'anywhere' as const, minWidth: 0 },
  io: {
    whiteSpace: 'pre-wrap' as const, overflowWrap: 'anywhere' as const,
    fontFamily: 'ui-monospace, monospace', fontSize: 11.5, lineHeight: 1.55,
    background: 'rgba(127,127,127,.07)', borderRadius: 8, padding: 10,
    maxHeight: 260, overflowY: 'auto' as const,
  },
  rawToggle: { fontSize: 11, opacity: 0.5, cursor: 'pointer', marginTop: 6 },
}

/** conversation.view 标准套件 props（结构子集） */
interface ViewProps {
  useSession: <T>(selector: (snapshot: any) => T) => T
  sessionId?: unknown
}

export function LimixPipelineView({ useSession, useTrajectory }: any): JSX.Element {
  const traj = useTrajectory((t: any) => t)
  const nodes = useMemo(() => (((traj as any)?.eventNodes ?? []) as ReadonlyArray<NodeLike>), [traj])
  const runningCalls = ((traj as any)?.runningCalls ?? []) as ReadonlyArray<RunningCallLike>
  const rounds = useMemo(() => parseRounds(nodes, runningCalls), [nodes, runningCalls])
  // 调试探针：控制台可 window.__lxPipelineNodes 查看真实节点（诊断解析层用，无副作用）
  ;(window as any).__lxPipelineNodes = nodes
  const [openKey, setOpenKey] = useState<string | null>(null)
  // 旧轮默认折叠：override 记录用户手动开合；未记录时只有最新一轮展开
  const [override, setOverride] = useState<Record<number, boolean>>({})
  const [showRaw, setShowRaw] = useState(false)

  if (!rounds.length) {
    return (
      <div style={ui.empty}>
        本会话还没有 LimiX 分析活动。
        发起一次预测（样例库选一个，或直接描述需求），这里会实时展开完整的调用管线：<br />
        数据处理 → 上传 → 预测 → 评估 / 因果解释 → 取结果。
      </div>
    )
  }

  const newestTurn = rounds[0].turn

  return (
    <div style={ui.wrap}>
      {rounds.map(r => {
        const open = override[r.turn] ?? (r.turn === newestTurn)
        return (
          <div key={r.turn} style={ui.round}>
            <div style={ui.roundHead}
              onClick={() => setOverride(o => ({ ...o, [r.turn]: !open }))}>
              <span style={ui.caret}>{open ? '▾' : '▸'}</span>
              <span style={ui.turnTag}>第 {r.turn} 轮</span>
              {(() => {
                // LimiX 调用徽标：只数真打到平台的阶段（bash/报告等工具阶段不算）。
                // 零调用不打标——"没有徽标"本身就是"这一轮没用 LimiX"的信号
                const lx = r.stages.filter(st => st.limix)
                if (lx.length === 0) return null
                const byTitle = new Map<string, number>()
                for (const st of lx) byTitle.set(st.title, (byTitle.get(st.title) ?? 0) + 1)
                const detail = [...byTitle].map(([t, n]) => n > 1 ? `${t} ×${n}` : t).join(' · ')
                return <span style={ui.limixTag} title={detail}>LimiX ×{lx.length}</span>
              })()}
              <span style={ui.ask}>{r.ask}</span>
              <span style={ui.time}>
                {r.stages.length} 阶段 · {roundDur(r)} · {fmtTime(r.time)}
              </span>
            </div>
            {r.result && <div style={ui.result}>结论：{r.result}</div>}

            {open && (
              <>
                <div style={ui.flow}>
                  {groupParallel(r.stages).map((group, gi) => (
                    <span key={group[0].key} style={{ display: 'contents' }}>
                      {gi > 0 && <span style={ui.arrow}>→</span>}
                      <span style={group.length > 1 ? ui.parallel : { display: 'contents' }}>
                        {group.length > 1 && <span style={ui.parallelTag} title="模型一步并行发出；宿主按队列依次执行">并行 ×{group.length}</span>}
                        {group.map(s => (
                          <span key={s.key}
                            style={ui.chip(s.cat, s.ok, openKey === s.key, s.running)}
                            title={s.summary}
                            onClick={() => { setOpenKey(k => (k === s.key ? null : s.key)); setShowRaw(false) }}>
                            <span aria-hidden="true">{CAT_STYLE[s.cat].label}</span>
                            {s.title}
                            {s.substeps.length > 1 && <span style={ui.chipMeta}>·{s.substeps.length}接口</span>}
                            {!s.running && <span style={ui.chipMeta}>{fmtDur(s.end - s.start)}</span>}
                            {s.running && <span style={{ fontSize: 11, opacity: 0.7 }}>运行中</span>}
                            {!s.ok && <span style={{ fontSize: 11 }}>失败</span>}
                          </span>
                        ))}
                      </span>
                    </span>
                  ))}
                  {r.others.length > 0 && (
                    <span style={{ display: 'contents' }}>
                      {r.stages.length > 0 && <span style={ui.arrow}>→</span>}
                      <span
                        style={ui.chip('api', true, openKey === `others-${r.turn}`)}
                        title="不进主线的其他工具活动（搜索/读改文件/普通 Shell 等）"
                        onClick={() => setOpenKey(k => (k === `others-${r.turn}` ? null : `others-${r.turn}`))}>
                        <span aria-hidden="true">≡</span>
                        其他活动
                        <span style={ui.chipMeta}>×{r.others.length}</span>
                      </span>
                    </span>
                  )}
                </div>

                {openKey === `others-${r.turn}` && (
                  <div style={{ ...ui.detail, gridTemplateColumns: 'minmax(0,1fr)' }}>
                    <div style={ui.kvGrid}>
                      {r.others.map(([name, brief], i) => (
                        <span key={i} style={{ display: 'contents' }}>
                          <span style={ui.kvKey}>{name}</span>
                          <span style={ui.kvVal}>{brief || '—'}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {r.stages.filter(s => s.key === openKey).map(s => (
                  <div key={s.key}>
                    {!s.ok && s.errLine && <div style={ui.errBox}>✕ {s.errLine}</div>}

                    {(s.metrics.length > 0 || s.ids.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {s.metrics.map(([k, v]) => (
                          <span key={k} style={ui.metricPill}>
                            <span style={{ opacity: 0.6, fontSize: 11 }}>{k}</span>
                            <b>{v}</b>
                          </span>
                        ))}
                        {s.ids.map(([k, v]) => (
                          <span key={k} style={ui.idPill} title="点击全选后 Cmd+C 复制">
                            <span style={{ opacity: 0.55, fontSize: 10.5 }}>{k}</span>
                            <span style={ui.idVal}>{v.length > 18 ? v.slice(0, 18) + '…' : v}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {s.substeps.length > 0 && (
                      <div style={ui.substeps}>
                        <span style={{ ...ui.ioLabel, marginBottom: 0, marginRight: 4 }}>内部接口序列</span>
                        {s.substeps.map((step, i) => (
                          <span key={i} style={{ display: 'contents' }}>
                            {i > 0 && <span style={ui.arrow}>→</span>}
                            <span style={ui.substep}>{step}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={ui.detail}>
                      <div style={{ minWidth: 0 }}>
                        <div style={ui.ioLabel}>输入</div>
                        <div style={ui.kvGrid}>
                          {s.inputKv.map(([k, v], i) => (
                            <span key={i} style={{ display: 'contents' }}>
                              <span style={ui.kvKey}>{k}</span>
                              <span style={ui.kvVal}>{v}</span>
                            </span>
                          ))}
                        </div>
                        <div style={ui.rawToggle} onClick={e => { e.stopPropagation(); setShowRaw(x => !x) }}>
                          {showRaw ? '▲ 收起原始参数' : '▼ 原始参数'}
                        </div>
                        {showRaw && <div style={{ ...ui.io, marginTop: 4 }}>{s.inputRaw}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={ui.ioLabel}>输出 · {fmtTime(s.time)}</div>
                        <div style={ui.io}>{s.output}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
