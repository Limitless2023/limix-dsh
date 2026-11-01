/**
 * [INPUT]: 依赖 react（宿主 external）；props 由 tool.call.toolview 插槽 owner 提供
 *          （结构对齐官方 ToolCallOwnerProps：callId/toolName/block/cwd/openFile/inspect——
 *           为守构建纯度门禁不 value-import 官方包，此处以最小结构类型自持）
 * [OUTPUT]: 对外提供 LimixToolCard 组件——limix 工具调用在对话流里的富卡片：
 *           任务名称 + 业务指标 + 结果文件下载与打开；指标说明和调用详情默认折叠
 *           + 三类预测图、可全屏的解释/模型比较卡及 JSON/CSV 下载；参数帮助不显示预测完成。
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
import { parseForecastCsv, parseTrainTail, parseForecastTruth } from './forecast-csv.ts'
import { parseToolResult, resultState, metricEntries } from './tool-result.ts'
import { ExplanationView } from './ExplanationView.tsx'
import { BenchmarkView } from './BenchmarkView.tsx'
import { CARD_FULLSCREEN_CSS, useCardFullscreen } from './use-card-fullscreen'

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

const COMMAND_LABELS: Record<string, string> = {
  regress: '回归预测', classify: '分类预测', forecast: '时序预测',
  health: '服务连接', check: '访问权限', upload: '上传数据', download: '保存结果',
  task: '任务进度', tasks: '任务列表', result: '预测结果', data: '数据查询', cancel: '取消任务',
  explain: '预测解释', benchmark: '多模型效果比较',
}
const CSS = `
.lx-result{border:1px solid var(--dsw-alias-border-l3,#e3e6eb);border-radius:12px;padding:16px 18px;margin:4px 0;font:inherit;font-size:13px;line-height:1.6;min-width:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}
.lx-result-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.lx-result-brand{font-size:11px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);margin-bottom:5px}
.lx-result h3{margin:0;font:inherit;font-weight:600;font-size:15px}
.lx-result-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;margin-left:auto;color:var(--dsw-alias-label-secondary)}
.lx-result-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.lx-result-status[data-state=done]{color:#21835c}
.lx-result-status[data-state=error]{color:#cf4545}
.lx-result-status[data-state=running]{color:#a56b16}
.lx-result-status[data-state=warning]{color:#a56b16}
.lx-result-meta{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-result-metrics{display:flex;flex-wrap:wrap;gap:14px 28px;margin:17px 0 12px;padding:0}
.lx-result-metrics div{min-width:90px}
.lx-result-metrics dt{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.lx-result-metrics dd{margin:3px 0 0;font-size:21px;line-height:1.25;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.lx-result-note{margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-result-actions{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-top:14px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l3,#e3e6eb)}
.lx-result button,.lx-result a{border:0;background:transparent;padding:2px 0;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;text-align:left;text-decoration:none}
.lx-result button:hover{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-result button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#3465ce);outline-offset:3px;border-radius:3px}
.lx-result button[data-lx=file]{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-result a{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-result a:hover{text-decoration:underline}
.lx-result-raw{margin:10px 0 0;padding:12px;max-height:250px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-interactive-bg-hover,#f5f6f8);border-radius:6px;font-size:11px;line-height:1.7}
.lx-result-command{font-size:11px;white-space:pre-wrap;margin:10px 0 0;color:var(--dsw-alias-label-secondary)}
`

export function LimixToolCard({ callId, block, inspect, cwd, openFile }: Props): JSX.Element {
  const settled = !!block && 'kind' in block
  const [showRaw, setShowRaw] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const fullscreen = useCardFullscreen()

  // 与原样例库（现 TryRunBridge 一脉）同因：宿主截断冒泡中的 click，React 根级委托收不到；
  // 在卡片容器上挂原生监听器，data-lx 委托区分"展开原始输出"与"检视调用"
  const rootRef = useRef<HTMLElement | null>(null)
  const inspectRef = useRef(inspect)
  inspectRef.current = inspect
  const openFileRef = useRef(openFile)
  openFileRef.current = openFile
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    // 只响应显式标记的动作元素；卡片其余区域（含原始输出）点击/选中无副作用
    const onNativeClick = (e: Event) => {
      const hit = (e.target as HTMLElement).closest?.('[data-lx]') as HTMLElement | null
      if (!hit || !el.contains(hit)) return
      if (hit.dataset.lx === 'raw') setShowRaw(s => !s)
      else if (hit.dataset.lx === 'metrics') setShowMetrics(s => !s)
      else if (hit.dataset.lx === 'inspect') inspectRef.current?.()
      else if (hit.dataset.lx === 'file' && hit.dataset.path) openFileRef.current?.(hit.dataset.path)
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
  const result = useMemo(() => parseToolResult(text), [text])
  const parsed = result.data
  const cliFailed = settled && (block?.isError === true || result.failed)
  const status = resultState(settled, cliFailed, parsed)
  const metrics = metricEntries(parsed)

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
    return { saved: savedCsv, train: flagValue('--train'), target: flagValue('--target'),
      truth: flagValue('--truth'), date: flagValue('--date') }
  }, [settled, block, args, savedCsv, flagValue])

  // ── 分类/回归结果视图：混淆矩阵 / 预测vs真实散点 ──
  // 显式 --truth 优先于结果中的目标列；未提供时再按平台结果文件契约回取：
  //   回归 → 结果文件保留原预测数据列，真值同表，单次取数
  //   分类 → 结果文件只留 样本ID + pred_probs_N + pred_label，真值被丢弃，
  //          必须回取 --predict 输入文件并按行序对齐（平台默认对齐口径亦是行序）
  // --target 必备，所有真值均按行序与预测对齐。
  const evalInfo = useMemo(() => {
    if (!settled || block?.isError || cliFailed) return null
    if (args.command !== 'classify' && args.command !== 'regress') return null
    if (!savedCsv) return null
    const target = flagValue('--target')
    if (!target) return null
    return { kind: args.command, saved: savedCsv, target, truth: flagValue('--truth'), predict: flagValue('--predict') }
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
        // 独立真值优先；未提供时才从结果或预测输入文件取真值。
        let truth = evalInfo.truth ? pickColumn(await fetchCsv(evalInfo.truth), evalInfo.target) : pickColumn(resultText, evalInfo.target)
        if (!evalInfo.truth && !truth && evalInfo.predict) {
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
        const series = parseForecastCsv(await fetchCsv(chartInfo.saved), chartInfo.target, chartInfo.date)
        if (!series) return
        // 历史尾部（可选增强）：取预测长度的 3 倍、至多 120 点；失败不影响预测段
        let hist: number[] = []
        let startLabel: string | undefined
        const colTarget = series.target ?? chartInfo.target
        if (chartInfo.train && colTarget) {
          try {
            const tail = parseTrainTail(
              await fetchCsv(chartInfo.train), colTarget, Math.min(3 * series.pred.length, 120), chartInfo.date)
            if (tail) { hist = tail.values; startLabel = tail.dates[0] }
          } catch { /* 历史段缺席可接受 */ }
        }
        let truth: number[] | undefined
        if (chartInfo.truth && colTarget && chartInfo.date) {
          try { truth = parseForecastTruth(await fetchCsv(chartInfo.truth), colTarget, chartInfo.date, series.dates) }
          catch { /* 无法读取真值不影响展示预测 */ }
        }
        if (!alive) return
        setChart({
          hist, pred: series.pred, p10: series.p10, p90: series.p90, truth,
          target: series.target,
          startLabel: startLabel ?? series.dates[0],
          endLabel: series.dates[series.dates.length - 1],
        })
      } catch { /* 通道/解析任一失败：静默降级为纯文本卡片，零回归 */ }
    })()
    return () => { alive = false }
  }, [chartInfo])

  const command = typeof args.command === 'string' ? args.command : ''
  const benchmark = command === 'benchmark' && parsed?.kind === 'benchmark' && Array.isArray(parsed.datasets) && Array.isArray(parsed.runs) ? parsed : null
  const explanation = command === 'explain' && !cliFailed ? parsed?.explanation : null
  const target = explanation?.target_label ?? flagValue('--target')
  const rows = parsed?.result_content?.rows ?? parsed?.rows
  const sampleCount = parsed?.metrics?.n
  const help = argList.some(arg => arg === '--help' || arg === '-h')
  const prediction = !help && ['regress', 'classify', 'forecast'].includes(command)
  const title = help ? '参数说明' : explanation && explanation.mode !== 'local' ? '因果关系探索' : COMMAND_LABELS[command] ?? '工具结果'
  const file = typeof parsed?.saved_to === 'string' ? parsed.saved_to : null
  const errorMessage = typeof result.error?.error === 'string' ? result.error.error : typeof result.error?.error_message === 'string' ? result.error.error_message : '请展开调用详情，查看失败原因。'
  const hint = typeof result.error?.hint === 'string' ? result.error.hint : ''
  const detailsId = `lx-result-details-${String(callId).replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const metricsId = `${detailsId}-metrics`

  return (
    <div className="lx-card-host" ref={fullscreen.hostRef}>
    <dialog className="lx-fullscreen-dialog" ref={fullscreen.dialogRef} role={fullscreen.expanded ? 'dialog' : 'presentation'} aria-modal={fullscreen.expanded} aria-label={fullscreen.expanded ? `${title}${target ? ` · ${target}` : ''}` : undefined}>
    <section className="lx-result" ref={rootRef} aria-label={`LimiX ${title}`}>
      <style>{CSS + CARD_FULLSCREEN_CSS}</style>
      <div className="lx-result-brand">LimiX</div>
      <div className="lx-result-head">
        <h3>{title}{target ? ` · ${target}` : ''}</h3>
        <span className="lx-result-status" data-state={status.kind} role="status">{status.label}</span>
        {(explanation || benchmark) && <button type="button" className="lx-fullscreen-button" data-lx-fullscreen aria-label={fullscreen.expanded ? '退出全屏查看' : benchmark ? '全屏查看模型比较' : '全屏查看解释'} title={fullscreen.expanded ? '退出全屏（Esc）' : benchmark ? '全屏查看模型比较' : '全屏查看解释'} aria-expanded={fullscreen.expanded}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={fullscreen.expanded ? 'M9 3v6H3M15 3v6h6M3 15h6v6M21 15h-6v6' : 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'} /></svg>
        </button>}
      </div>
      {fullscreen.error && <p className="lx-result-note" role="alert">{fullscreen.error}</p>}
      <p className="lx-result-meta">
        {typeof rows === 'number' && Number.isFinite(rows) ? `${rows} 行预测结果` : ''}
        {typeof sampleCount === 'number' && Number.isFinite(sampleCount) ? `${typeof rows === 'number' ? ' · ' : ''}${sampleCount} 个样本参与评估` : ''}
        {!prediction && command === 'health' && status.kind === 'done' ? 'LimiX 服务连接正常' : ''}
      </p>
      {benchmark && <BenchmarkView data={benchmark as any} />}
      {cliFailed ? <p className="lx-result-note" role="alert">{errorMessage}{hint && <><br />{hint}</>}</p> : <>
        {status.kind === 'warning' && !benchmark && <p className="lx-result-note" role="alert">本次解释存在限制，请结合返回说明使用结果。</p>}
        {explanation && <ExplanationView data={explanation} />}
        {command === 'explain' && !settled && <p className="lx-result-note">正在分析变量贡献与关系…</p>}
        {metrics.length > 0 && <dl className="lx-result-metrics">
          {metrics.map(metric => <div key={metric.key}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
        </dl>}
        {prediction && !settled && <p className="lx-result-note">正在提交数据并等待预测结果…</p>}
        {prediction && settled && status.kind === 'done' && metrics.length === 0 && <p className="lx-result-note">预测已完成；本次未返回评估指标。</p>}
        {chart && <ForecastChart {...chart} />}
        {evalView?.kind === 'cls' && <ConfusionMatrix data={evalView.data} />}
        {evalView?.kind === 'reg' && <ScatterChart data={evalView.data} />}
      </>}
      {(text || file || inspect) && <div className="lx-result-actions">
        {benchmark && typeof parsed?.csv_path === 'string' && <a href={'/limix-ui/artifact?path=' + encodeURIComponent(parsed.csv_path)} download>下载比较 CSV ↓</a>}
        {benchmark && file && <a href={'/limix-ui/artifact?path=' + encodeURIComponent(file)} download>下载比较 JSON ↓</a>}
        {benchmark && typeof parsed?.report_path === 'string' && openFile && <button type="button" data-lx="file" data-path={parsed.report_path}>打开完整报告 ↗</button>}
        {explanation && typeof parsed?.csv_path === 'string' && <a href={'/limix-ui/artifact?path=' + encodeURIComponent(parsed.csv_path)} download>下载{explanation.mode === 'local' ? '贡献' : '关系'} CSV ↓</a>}
        {explanation && file && <a href={'/limix-ui/artifact?path=' + encodeURIComponent(file)} download>下载原始 JSON ↓</a>}
        {savedCsv && <a href={'/limix-ui/csv?path=' + encodeURIComponent(savedCsv) + '&download=1'} download={savedCsv.split('/').pop()}>下载 CSV ↓</a>}
        {file && (openFile
          ? <button type="button" data-lx="file" data-path={file}>打开结果 · {file.split('/').pop()} ↗</button>
          : <span className="lx-result-meta">已保存 · {file.split('/').pop()}</span>)}
        {text && <button type="button" data-lx="raw" aria-expanded={showRaw} aria-controls={detailsId}>
          {showRaw ? '收起详情 ↑' : '调用详情 ↓'}
        </button>}
        {metrics.length > 0 && <button type="button" data-lx="metrics" aria-expanded={showMetrics} aria-controls={metricsId}>
          {showMetrics ? '收起指标说明 ↑' : '指标说明 ↓'}
        </button>}
        {showRaw && inspect && <button type="button" data-lx="inspect">检视调用 ↗</button>}
      </div>}
      {showMetrics && <dl id={metricsId} className="lx-result-note">
        {metrics.map(metric => <div key={metric.key} style={{ marginTop: 8 }}>
          <dt>{metric.label}</dt><dd style={{ margin: 0 }}>{metric.description}</dd>
        </div>)}
      </dl>}
      {showRaw && <div id={detailsId}>
        <p className="lx-result-command">{cmdLine}</p>
        <pre className="lx-result-raw">{text}</pre>
      </div>}
    </section>
    </dialog>
    </div>
  )
}
