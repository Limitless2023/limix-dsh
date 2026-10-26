/**
 * [INPUT]: 依赖 react（宿主 external）；纯展示组件，数据由调用方喂入
 * [OUTPUT]: 对外提供 ForecastChart 组件——纯 SVG 时序预测图（可选 truth 叠预测段真值线，案例回放场景用）：
 *           历史尾部实线 + 预测虚线 + P10-P90 半透明区间带 + 首尾刻度
 * [POS]: limix-ui 的图表原子（对位 Next.js 版 TimeseriesChart 的零依赖形态；
 *        不引 echarts 是刻意取舍——bundle 体积与外部依赖面为零）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface ForecastChartData {
  /** 历史段（已按时间升序，通常取尾部若干点） */
  hist: number[]
  /** 预测段（紧接历史段之后） */
  pred: number[]
  /** 分位下界/上界（与 pred 等长；缺省不画区间带，零回归） */
  p10?: number[]
  p90?: number[]
  /** 预测段真值（与 pred 等长；缺省不画——对话卡片实时场景本就无真值，案例回放场景有） */
  truth?: number[]
  /** 首/尾时间标签（可选，只标两端不标满轴） */
  startLabel?: string
  endLabel?: string
  /** 目标列名（图例用） */
  target?: string
}

const W = 560
const H = 170
const PAD = { top: 12, right: 10, bottom: 22, left: 44 }

/** 数值数组 → SVG polyline points 串；x 从 i0 开始编号，全序列共 n 点 */
function toPoints(ys: number[], i0: number, n: number, min: number, max: number): string {
  const iw = W - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const span = max - min || 1
  return ys.map((y, i) => {
    const x = PAD.left + ((i0 + i) / Math.max(1, n - 1)) * iw
    const yy = PAD.top + (1 - (y - min) / span) * ih
    return `${x.toFixed(1)},${yy.toFixed(1)}`
  }).join(' ')
}

export function ForecastChart({ hist, pred, p10, p90, truth, startLabel, endLabel, target }: ForecastChartData): JSX.Element | null {
  if (!hist.length && !pred.length) return null
  const n = hist.length + pred.length
  const all = [...hist, ...pred, ...(p10 ?? []), ...(p90 ?? []), ...(truth ?? [])].filter(Number.isFinite)
  if (!all.length) return null
  const min = Math.min(...all)
  const max = Math.max(...all)

  const hasBand = !!(p10?.length && p90?.length && p10.length === pred.length && p90.length === pred.length)
  // 区间带路径：上界正序 + 下界倒序闭合
  let bandPath = ''
  if (hasBand) {
    const up = toPoints(p90!, hist.length, n, min, max).split(' ')
    const dn = toPoints(p10!, hist.length, n, min, max).split(' ').reverse()
    bandPath = 'M' + [...up, ...dn].join(' L') + ' Z'
  }
  // 预测线前置一个历史末点，视觉上连续
  const predWithBridge = hist.length && pred.length ? [hist[hist.length - 1], ...pred] : pred
  const predStart = hist.length ? hist.length - 1 : 0

  const fmt = (v: number) => Math.abs(v) >= 1000 ? v.toFixed(0) : v.toPrecision(3)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', marginTop: 8 }}
      role="img" aria-label={`${target ?? '目标'} 时序预测图`}>
      {/* y 轴两端刻度 */}
      <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">{fmt(max)}</text>
      <text x={PAD.left - 6} y={H - PAD.bottom} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">{fmt(min)}</text>
      {/* x 轴首尾标签 */}
      {startLabel && <text x={PAD.left} y={H - 6} fontSize="10" fill="currentColor" opacity="0.55">{startLabel}</text>}
      {endLabel && <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">{endLabel}</text>}
      {/* 历史/预测分界线 */}
      {hist.length > 0 && pred.length > 0 && (
        <line
          x1={PAD.left + ((hist.length - 1) / Math.max(1, n - 1)) * (W - PAD.left - PAD.right)} y1={PAD.top}
          x2={PAD.left + ((hist.length - 1) / Math.max(1, n - 1)) * (W - PAD.left - PAD.right)} y2={H - PAD.bottom}
          stroke="currentColor" opacity="0.15" strokeDasharray="3,3" />
      )}
      {/* P10-P90 区间带（画在预测线之下，预测线浮于带上） */}
      {hasBand && <path d={bandPath} fill="#2563eb" opacity="0.13" />}
      {/* 历史线（实线） */}
      {hist.length > 1 && (
        <polyline points={toPoints(hist, 0, n, min, max)} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
      )}
      {/* 预测段真值线（灰实线，桥接历史末点；参照物画在预测线之下） */}
      {!!truth?.length && truth.length === pred.length && (
        <polyline points={toPoints(hist.length ? [hist[hist.length - 1], ...truth] : truth, predStart, n, min, max)}
          fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.45" />
      )}
      {/* 预测线（蓝，虚线桥接历史末点） */}
      {predWithBridge.length > 1 && (
        <polyline points={toPoints(predWithBridge, predStart, n, min, max)} fill="none" stroke="#2563eb" strokeWidth="1.8" strokeDasharray="5,3" />
      )}
      {/* 图例 */}
      <g fontSize="10" fill="currentColor">
        <line x1={PAD.left} y1={6} x2={PAD.left + 16} y2={6} stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
        <text x={PAD.left + 20} y={9} opacity="0.65">历史</text>
        <line x1={PAD.left + 52} y1={6} x2={PAD.left + 68} y2={6} stroke="#2563eb" strokeWidth="1.8" strokeDasharray="5,3" />
        <text x={PAD.left + 72} y={9} opacity="0.65">预测{target ? `（${target}）` : ''}</text>
        {!!truth?.length && <>
          <line x1={PAD.left + 130} y1={6} x2={PAD.left + 146} y2={6} stroke="currentColor" strokeWidth="1.3" opacity="0.45" />
          <text x={PAD.left + 150} y={9} opacity="0.65">真值</text>
        </>}
        {hasBand && <>
          <rect x={PAD.left + (truth?.length ? 186 : 120)} y={2} width={16} height={8} fill="#2563eb" opacity="0.13" />
          <text x={PAD.left + (truth?.length ? 206 : 140)} y={9} opacity="0.65">P10–P90</text>
        </>}
      </g>
    </svg>
  )
}
