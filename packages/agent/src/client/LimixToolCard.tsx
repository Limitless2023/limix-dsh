/**
 * [INPUT]: 依赖 react（宿主 external）；props 由 tool.call.toolview 插槽 owner 提供
 *          （结构对齐官方 ToolCallOwnerProps：callId/toolName/block/cwd/openFile/inspect——
 *           为守构建纯度门禁不 value-import 官方包，此处以最小结构类型自持）
 * [OUTPUT]: 对外提供 LimixToolCard 组件——limix 工具调用在对话流里的富卡片：
 *           命令徽章 + 成败态 + CLI JSON 输出的关键字段表 + 可折叠原始输出
 *           + 三类任务各自的结果图（时序曲线 / 分类混淆矩阵 / 回归散点）
 * [POS]: limix-ui 的工具结果渲染器；对位 Next.js 版 tools-ui 的 DSH 形态。
 *        未认领的其他工具不受影响（keyed 插槽按工具名分派，自有工具=纯增量）。
 *        三类结果图共用 /limix-ui/csv 一条只读通道，取数失败一律静默降级为纯文本卡片
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfusionMatrix } from './ConfusionMatrix.tsx'
import { ForecastChart, type ForecastChartData } from './ForecastChart.tsx'
import { ScatterChart } from './ScatterChart.tsx'
import { buildConfusion, buildScatter, pickColumn, pickPredLabel, type ConfusionData, type ScatterData } from './eval-csv.ts'
import { parseForecastCsv, parseTrainTail } from './forecast-csv.ts'

/** 经 Node 半自建的只读同源路由取 CSV；三处图表共用此一条通道 */
async function fetchCsv(p: string): Promise<string> {
  const r = await fetch('/limix-ui/csv?path=' + encodeURIComponent(p))
  if (!r.ok) throw new Error(`csv route ${r.status}`)
  return r.text()
}

/** 分类/回归结果视图的两个形态 */
type EvalView =
  | { kind: 'cls'; data: ConfusionData }
  | { kind: 'reg'; data: ScatterData }

/**
 * 工具块最小面（结构子集）。生命周期两形态用 'kind' in block 判别：
 * 运行中 RunningToolCall 的 name/argsRaw 在顶层；settled 后的 ToolResultNode 才有 call 字段
 */
interface ToolBlockLike {
  kind?: string
  argsRaw?: string
  call?: { name: string; argsRaw?: string } | null
  content?: ReadonlyArray<{ type: string; text?: string }>
  isError?: boolean
  error?: unknown
}

interface Props {
  callId: string
  toolName: string
  block: ToolBlockLike
  cwd?: string
  openFile?: (path: string) => void
  inspect?: () => void
}

/** 中文指标名映射：CLI JSON 键 → 业务读者能看懂的行标签 */
const KEY_LABELS: Record<string, string> = {
  status: '状态', task_id: '任务 ID', is_ready: '完成', data_version_id: '数据版本',
  accuracy: '准确率', rmse: 'RMSE', mae: 'MAE', mape: 'MAPE', r2: 'R²',
  message: '消息', file: '文件', output: '输出文件', rows: '行数',
  task_type: '任务类型', engine_type: '引擎', model_type: '模型',
  config_name: '配置', callback_url: '回调地址', priority: '优先级',
  created_at: '创建时间', queued_at: '入队时间', started_at: '开始时间',
  finished_at: '完成时间', updated_at: '更新时间', elapsed: '耗时',
  file_id: '文件 ID', filename: '文件名', columns: '列数', n_rows: '行数',
}

/**
 * 从 CLI 文本输出里尽力解析 JSON，失败返回 null 走原文展示。
 * 真实形态：limix.py 的 emit() 是 indent=2 的多行美化 JSON，且工具 render 会把
 * stderr 以 "\n[stderr]\n" 拼接在 stdout 之后——解析顺序：
 * ① 剥离 stderr 段后整体 parse ② 首"{"到末"}"截取 parse ③ JSON-lines 逐行取末条
 */
function parseCliJson(text: string): Record<string, unknown> | null {
  const stdout = text.split('\n[stderr]\n')[0].trim()
  if (!stdout) return null
  const asObj = (v: unknown): Record<string, unknown> | null =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  try { const v = asObj(JSON.parse(stdout)); if (v) return v } catch { /* 下一级 */ }
  const a = stdout.indexOf('{')
  const b = stdout.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try { const v = asObj(JSON.parse(stdout.slice(a, b + 1))); if (v) return v } catch { /* 下一级 */ }
  }
  let last: Record<string, unknown> | null = null
  for (const line of stdout.split('\n')) {
    const l = line.trim()
    if (!l.startsWith('{')) continue
    try { const v = asObj(JSON.parse(l)); if (v) last = v } catch { /* 继续 */ }
  }
  return last
}

const ui = {
  card: {
    border: '1px solid rgba(127,127,127,.25)', borderRadius: 10, padding: '8px 12px',
    fontSize: 13, lineHeight: 1.6, margin: '2px 0',
    // 长 JSON 参数/返回值是无断点长串，必须给断行规则并兜底裁剪，否则撑破卡片右缘
    overflow: 'hidden', minWidth: 0, overflowWrap: 'anywhere' as const,
  },
  badge: (err: boolean, running: boolean) => ({
    display: 'inline-block', padding: '0 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    color: running ? '#b45309' : err ? '#dc2626' : '#16a34a',
    background: running ? 'rgba(180,83,9,.1)' : err ? 'rgba(220,38,38,.1)' : 'rgba(22,163,74,.1)',
  }),
  // 值列 minmax(0,1fr)：允许收缩到容器内，配合 break-all 让长 JSON 值折行而非溢出
  kv: { display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '2px 14px', margin: '6px 0 0' },
  k: { opacity: 0.6, whiteSpace: 'nowrap' as const },
  v: { wordBreak: 'break-all' as const, minWidth: 0 },
  raw: {
    whiteSpace: 'pre-wrap' as const, overflowWrap: 'anywhere' as const,
    fontFamily: 'ui-monospace, monospace', fontSize: 12,
    background: 'rgba(127,127,127,.08)', borderRadius: 6, padding: 8, marginTop: 6,
    maxHeight: 240, overflowY: 'auto' as const,
  },
}

const FIELD_ORDER: Record<string, string[]> = {
  forecast: ['task_id', 'status', 'result_content'],
  regress: ['task_id', 'status', 'result_content'],
  classify: ['task_id', 'status', 'result_content'],
  health: ['status'],
  check: ['allowed', 'api_key_permission', 'route_permission'],
}

/** 预测类任务优先露 任务ID/状态/结果，其余保持服务端顺序。 */
function orderedEntries(obj: Record<string, unknown>, command?: unknown): Array<[string, unknown]> {
  const all = Object.entries(obj)
  const pref = FIELD_ORDER[String(command ?? '')]
  if (!pref) return all
  const rank = (k: string) => (pref.indexOf(k) >= 0 ? pref.indexOf(k) : 999)
  return [...all].sort((a, b) => rank(a[0]) - rank(b[0]))
}

export function LimixToolCard({ block, inspect, cwd }: Props): JSX.Element {
  const settled = !!block && 'kind' in block
  const [showRaw, setShowRaw] = useState(false)
  const [kvExpanded, setKvExpanded] = useState(false)

  // 与原样例库（现 TryRunBridge 一脉）同因：宿主截断冒泡中的 click，React 根级委托收不到；
  // 在卡片容器上挂原生监听器，data-lx 委托区分"展开原始输出"与"检视调用"
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inspectRef = useRef(inspect)
  inspectRef.current = inspect
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    // 只响应显式标记的动作元素；卡片其余区域（含原始输出）点击/选中无副作用
    const onNativeClick = (e: Event) => {
      const hit = (e.target as HTMLElement).closest?.('[data-lx]') as HTMLElement | null
      if (!hit || !el.contains(hit)) return
      if (hit.dataset.lx === 'raw') setShowRaw(s => !s)
      else if (hit.dataset.lx === 'inspect') inspectRef.current?.()
    }
    el.addEventListener('click', onNativeClick)
    return () => el.removeEventListener('click', onNativeClick)
  }, [])

  // argsRaw 可能语法合法但形状畸形（'null'、args 非数组）——parse 后必须做形状校验
  const args = useMemo<{ command?: unknown; args?: unknown }>(() => {
    // 运行中形态 argsRaw 在顶层，settled 形态在 call 里
    const raw = (block && 'kind' in block ? block.call?.argsRaw : block?.argsRaw) ?? '{}'
    try {
      const v = JSON.parse(raw)
      return typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {}
    } catch { return {} }
  }, [block])

  const text = useMemo(
    () => (block?.content ?? []).filter(c => c.type === 'text' && c.text).map(c => c.text).join('\n'),
    [block],
  )
  const parsed = useMemo(() => parseCliJson(text), [text])
  // limix-tool 的规范值不抛错（exitCode 非零也返回），isError 恒 false；
  // 以"stdout 空 + stderr 有内容"启发式识别 CLI 失败（argparse 报错等）
  const cliFailed = useMemo(() => {
    if (!settled) return false
    if (block?.isError) return true
    const [stdout, stderr] = text.split('\n[stderr]\n')
    return !stdout?.trim() && !!stderr?.trim()
  }, [settled, block, text])

  // memo 化保证引用稳定——argList 进了 chartInfo 的依赖数组，
  // 每渲染新建数组会打穿 useMemo 导致取数 effect 无限重跑
  const argList = useMemo(() => {
    const raw = Array.isArray(args.args) ? args.args.filter(a => typeof a === 'string') : []
    // 模型偶尔会把子命令重复塞进 args 首位，展示时去重
    return raw[0] === args.command ? raw.slice(1) : raw
  }, [args])
  const shorten = (v: unknown) => (typeof v === 'string' && cwd && v.startsWith(cwd + '/')) ? v.slice(cwd.length + 1) : v
  const cmdLine = ['limix', typeof args.command === 'string' ? args.command : '', ...argList.map(shorten)]
    .filter(Boolean).join(' ')

  /** 取命令行某个 flag 的值；时序与分类/回归两条支路共用 */
  const flagValue = useMemo(() => (flag: string): string | undefined => {
    const i = argList.indexOf(flag)
    return i >= 0 && i + 1 < argList.length ? argList[i + 1] : undefined
  }, [argList])

  /** 结果文件路径：三类任务的 -o 产物统一经 saved_to 回报 */
  const savedCsv = useMemo(() => {
    const s = parsed && typeof parsed['saved_to'] === 'string' ? (parsed['saved_to'] as string) : null
    return s && s.toLowerCase().endsWith('.csv') ? s : null
  }, [parsed])

  // ── 时序结果图表：saved_to 指向 CSV 时经 /limix-ui/csv 同源路由取数 ──
  // 触发面覆盖两种真实工作流：forecast -o 一步到位，或 forecast 后单独 download；
  // download 卡缺 --train/--target 时无历史段，仅画预测 + 区间带
  const chartInfo = useMemo(() => {
    if (!settled || block?.isError) return null
    if (args.command !== 'forecast' && args.command !== 'download') return null
    if (!savedCsv) return null
    return { saved: savedCsv, train: flagValue('--train'), target: flagValue('--target') }
  }, [settled, block, args, savedCsv, flagValue])

  // ── 分类/回归结果视图：混淆矩阵 / 预测vs真实散点 ──
  // 两者都需要真值，而真值的位置取决于任务类型（平台结果文件契约）：
  //   回归 → 结果文件保留原预测数据列，真值同表，单次取数
  //   分类 → 结果文件只留 样本ID + pred_probs_N + pred_label，真值被丢弃，
  //          必须回取 --predict 输入文件并按行序对齐（平台默认对齐口径亦是行序）
  // 故此处只要求 --target 必备；--predict 缺席时回归仍可成图、分类则降级无图。
  const evalInfo = useMemo(() => {
    if (!settled || block?.isError || cliFailed) return null
    if (args.command !== 'classify' && args.command !== 'regress') return null
    if (!savedCsv) return null
    const target = flagValue('--target')
    if (!target) return null
    return { kind: args.command, saved: savedCsv, target, predict: flagValue('--predict') }
  }, [settled, block, cliFailed, args, savedCsv, flagValue])

  const [evalView, setEvalView] = useState<EvalView | null>(null)
  useEffect(() => {
    if (!evalInfo) { setEvalView(null); return }
    let alive = true
    ;(async () => {
      try {
        const resultText = await fetchCsv(evalInfo.saved)
        const pred = pickPredLabel(resultText)
        if (!pred) return
        // 真值优先在结果文件里找（回归路径）；找不到再回取预测输入文件（分类路径）
        let truth = pickColumn(resultText, evalInfo.target)
        if (!truth && evalInfo.predict) {
          truth = pickColumn(await fetchCsv(evalInfo.predict), evalInfo.target)
        }
        // 无真值不是异常：预测集本就可以不带标签（纯推理场景），此时静默无图
        if (!truth || !alive) return
        const view: EvalView | null = evalInfo.kind === 'classify'
          ? ((d) => d && ({ kind: 'cls', data: d } as const))(buildConfusion(truth, pred))
          : ((d) => d && ({ kind: 'reg', data: d } as const))(buildScatter(truth, pred))
        if (alive && view) setEvalView(view)
      } catch { /* 通道/解析任一失败：静默降级为纯文本卡片，零回归 */ }
    })()
    return () => { alive = false }
  }, [evalInfo])

  const [chart, setChart] = useState<ForecastChartData | null>(null)
  useEffect(() => {
    if (!chartInfo) { setChart(null); return }
    let alive = true
    ;(async () => {
      try {
        const series = parseForecastCsv(await fetchCsv(chartInfo.saved))
        if (!series) return
        // 历史尾部（可选增强）：取预测长度的 3 倍、至多 120 点；失败不影响预测段
        let hist: number[] = []
        let startLabel: string | undefined
        const colTarget = series.target ?? chartInfo.target
        if (chartInfo.train && colTarget) {
          try {
            const tail = parseTrainTail(
              await fetchCsv(chartInfo.train), colTarget, Math.min(3 * series.pred.length, 120))
            if (tail) { hist = tail.values; startLabel = tail.dates[0] }
          } catch { /* 历史段缺席可接受 */ }
        }
        if (!alive) return
        setChart({
          hist, pred: series.pred, p10: series.p10, p90: series.p90,
          target: series.target,
          startLabel: startLabel ?? series.dates[0],
          endLabel: series.dates[series.dates.length - 1],
        })
      } catch { /* 通道/解析任一失败：静默降级为纯文本卡片，零回归 */ }
    })()
    return () => { alive = false }
  }, [chartInfo])

  return (
    <div style={ui.card} ref={rootRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>LimiX 开放平台</span>
        <span style={ui.badge(cliFailed, !settled)}>
          {!settled ? '运行中…' : cliFailed ? '失败' : '完成'}
        </span>
        <code style={{
          fontSize: 12, opacity: 0.75,
          flex: '1 1 auto', minWidth: 0, wordBreak: 'break-all' as const,
        }}>{cmdLine}</code>
        {inspect && (
          <span data-lx="inspect" role="button"
            style={{ fontSize: 12, opacity: 0.55, cursor: 'pointer', marginLeft: 'auto' }}>
            检视调用 ↗
          </span>
        )}
      </div>

      {chart && <ForecastChart {...chart} />}
      {evalView?.kind === 'cls' && <ConfusionMatrix data={evalView.data} />}
      {evalView?.kind === 'reg' && <ScatterChart data={evalView.data} />}

      {settled && parsed && (
        <div style={ui.kv}>
          {orderedEntries(parsed, args.command).slice(0, kvExpanded ? 20 : 3).map(([k, v]) => (
            <span key={k} style={{ display: 'contents' }}>
              <span style={ui.k}>{KEY_LABELS[k] ?? k}</span>
              <span style={ui.v}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </span>
          ))}
        </div>
      )}

      {settled && text && (
        <div>
          <span
            style={{ fontSize: 12, opacity: 0.6, cursor: 'pointer', userSelect: 'none' }}
            data-lx="raw"
          >
            {Object.keys(parsed).length > 3 && (
              <span onClick={() => setKvExpanded((v) => !v)} style={{ marginRight: 12 }}>
                {kvExpanded ? '▲ 收起字段' : `▼ 还有 ${Object.keys(parsed).length - 3} 个字段`}
              </span>
            )}
            {showRaw ? '▲ 收起原始输出' : '▼ 原始输出'}
          </span>
          {showRaw && <div style={ui.raw} data-lx="rawbox">{text}</div>}
        </div>
      )}
    </div>
  )
}
