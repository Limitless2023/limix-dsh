/**
 * [INPUT]: 依赖 ./pipeline-stage.ts 的单步翻译；数据来自 useTrajectory 的 eventNodes 与 runningCalls。
 * [OUTPUT]: 对外提供 Round、TimelineEntry、parseRounds、groupParallel、fmtDur、fmtTime、roundDur。
 * [POS]: 分析过程的分轮模型。stages 供业务流程归并，timeline 保留原始节点顺序。
 *        原始文本不进入业务流程；本文件不改写模型文本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { limixStage, localStage, runningStage, type Stage } from './pipeline-stage.ts'

/* ── 节点结构子集（不 value-import 官方包，结构自持） ─────────────────── */
/** 工具结果/用户消息用 type 键，assistant 块经运行时转换后用 kind 键：两种键并存 */
interface BlockLike { type?: string; kind?: string; text?: string }
export interface NodeLike {
  kind: string
  seq: number
  time: number
  /** 工具调用发起时刻；与 time（完成时刻）构成区间，用于并行判定与耗时 */
  callTime?: number
  content?: ReadonlyArray<BlockLike>
  blocks?: ReadonlyArray<BlockLike>
  call?: { name: string; argsRaw?: string } | null
  isError?: boolean
}
export interface RunningCallLike { name?: string; argsRaw?: string; callId?: string }

export type TimelineEntry =
  | { type: 'reply' | 'thinking'; key: string; text: string }
  | { type: 'stage'; key: string; stage: Stage }

export interface Round {
  turn: number
  time: number
  ask: string
  /** 该轮最后一段回复的首句 */
  result: string
  stages: Stage[]
  timeline: TimelineEntry[]
}

const blockKind = (b: BlockLike) => b.kind ?? b.type

function textOf(blocks?: ReadonlyArray<BlockLike>): string {
  return (blocks ?? []).filter(b => blockKind(b) === 'text' && b.text).map(b => b.text).join('\n')
}

function parseArgs(raw?: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw ?? '{}')
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {}
  } catch { return {} }
}

/** 结论行只留可读文字：去掉 Markdown 粗体与行内代码，链接保留标题，避免露出路径语法 */
function firstLine(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^\n]*?\)(?=\s|$|[，。；：、])/g, '$1').replace(/\*\*|`/g, '')
    .split('\n').map(s => s.replace(/^[#>\-*\s]+/, '').trim()).find(s => s.length > 4) ?? ''
}

function pushAssistant(round: Round, node: NodeLike) {
  const blocks = node.blocks ?? node.content ?? []
  blocks.forEach((block, index) => {
    const text = (block.text ?? '').trim()
    if (!text) return
    const kind = blockKind(block)
    if (kind === 'reasoning') round.timeline.push({ type: 'thinking', key: `n${node.seq}-${index}`, text })
    else if (kind === 'text') {
      round.timeline.push({ type: 'reply', key: `n${node.seq}-${index}`, text })
      round.result = firstLine(text).slice(0, 110) || round.result
    }
  })
}

function pushStage(round: Round, stage: Stage) {
  round.stages.push(stage)
  round.timeline.push({ type: 'stage', key: stage.key, stage })
}

function stageOf(node: NodeLike): Stage | null {
  const name = node.call?.name
  if (!name) return null
  const args = parseArgs(node.call?.argsRaw)
  const text = textOf(node.content)
  const clock = { key: `s${node.seq}`, time: node.time, start: node.callTime ?? node.time, end: node.time }
  return name === 'limix' ? limixStage(args, text, node.isError, clock) : localStage(name, args, text, node.isError, clock)
}

/**
 * 相邻阶段的并行分组，两个判据取或：
 * ① 时间区间重叠 = 真并发；
 * ② 无缝续接（间隔 ≤150ms）= 模型一步批量发出、宿主排队串行执行。
 *   实测同批 limix 调用间隔 0~1ms；串行步之间隔着秒级 LLM 思考，不会误判。
 */
export function groupParallel(stages: Stage[]): Stage[][] {
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

/** 会话节点 → 分轮模型（升序解析，返回最新一轮在前） */
export function parseRounds(nodes: ReadonlyArray<NodeLike>, running: ReadonlyArray<RunningCallLike>): Round[] {
  const rounds: Round[] = []
  let cur: Round | null = null
  for (const node of nodes) {
    if (node.kind === 'user') {
      cur = { turn: rounds.length + 1, time: node.time, ask: textOf(node.content) || '（空消息）', result: '', stages: [], timeline: [] }
      rounds.push(cur)
    } else if (!cur) continue
    else if (node.kind === 'assistant') pushAssistant(cur, node)
    else if (node.kind === 'tool-result') {
      const stage = stageOf(node)
      if (stage) pushStage(cur, stage)
    }
  }
  const last = rounds[rounds.length - 1]
  if (last) {
    running.forEach((call, index) => {
      if (call.name) pushStage(last, runningStage(call.name, parseArgs(call.argsRaw), `r${call.callId ?? index}`, last.time))
    })
  }
  for (const round of rounds) {
    for (const group of groupParallel(round.stages)) {
      if (group.length > 1) group.forEach(stage => { stage.parallel = true })
    }
  }
  return rounds.filter(r => r.timeline.length > 0).reverse()
}

/* ── 时间格式 ────────────────────────────────────────────────────────── */
export function fmtDur(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.round(ms / 1000)
  if (s < 1) return '<1s'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}分${s % 60}秒`
}

export function fmtTime(t: number): string {
  const d = new Date(t)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 仍有工具运行时显示运行中；全部返回后显示首个发起到末个完成的耗时。 */
export function roundDur(round: Round): string {
  if (!round.stages.length) return ''
  if (round.stages.some(s => s.running)) return '运行中'
  const ends = round.stages.map(s => s.end).filter(e => e !== Number.MAX_SAFE_INTEGER)
  if (!ends.length) return '运行中'
  return fmtDur(Math.max(...ends) - Math.min(...round.stages.map(s => s.start)))
}
