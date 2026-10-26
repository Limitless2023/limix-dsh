/**
 * [INPUT]: 依赖 react（宿主 external）与 ./eval-csv.ts 的 ScatterData 类型（仅 import type）
 * [OUTPUT]: 对外提供 ScatterChart 组件——纯 SVG 预测 vs 真实散点图 + y=x 理想线 + 误差指标
 * [POS]: limix-ui 的图表原子，回归任务对位 ForecastChart（时序）；
 *        与 ConfusionMatrix（分类）并列，三者共用"零依赖纯 SVG"取舍
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ScatterData } from './eval-csv.ts'

const ACCENT = '#2563eb'
const W = 400
const H = 300
const PAD = { top: 14, right: 12, bottom: 34, left: 52 }

export function ScatterChart({ data }: { data: ScatterData }): JSX.Element | null {
  const { points, n, shown, mae, rmse, r2, min, max } = data
  if (!points.length) return null

  // 两轴同尺度是本图的要害：只有正方形坐标系里，y=x 才是 45° 线，
  // "点贴不贴线"才等价于"预测准不准"。分轴自适应会把偏差拉平成假象。
  const span = max - min || 1
  const lo = min - span * 0.05
  const hi = max + span * 0.05
  const iw = W - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const sx = (v: number) => PAD.left + ((v - lo) / (hi - lo)) * iw
  const sy = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * ih

  const fmt = (v: number) => Math.abs(v) >= 1000 ? v.toFixed(0) : Number(v.toPrecision(3)).toString()
  // 点多则调小半径与透明度，让密集区靠叠加显出浓淡而不是糊成一片
  const r = shown > 800 ? 1.6 : shown > 300 ? 2.1 : 2.8
  const op = shown > 800 ? 0.35 : shown > 300 ? 0.5 : 0.62

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
        预测 vs 真实 · 共 {n} 个样本
        {shown < n && <span style={{ opacity: 0.75 }}>（等距抽样画出 {shown} 点，指标仍按全量计算）</span>}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}
        role="img" aria-label="预测值与真实值散点图">
        <rect x={PAD.left} y={PAD.top} width={iw} height={ih}
          fill="none" stroke="currentColor" opacity="0.12" />

        {/* y=x 理想线：点落在线上即预测等于真实 */}
        <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)}
          stroke="currentColor" opacity="0.35" strokeWidth="1" strokeDasharray="4,3" />

        {points.map((p, i) => (
          <circle key={i} cx={sx(p.t)} cy={sy(p.p)} r={r} fill={ACCENT} opacity={op} />
        ))}

        <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">{fmt(hi)}</text>
        <text x={PAD.left - 6} y={H - PAD.bottom} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">{fmt(lo)}</text>
        <text x={PAD.left} y={H - PAD.bottom + 13} fontSize="10" fill="currentColor" opacity="0.55">{fmt(lo)}</text>
        <text x={W - PAD.right} y={H - PAD.bottom + 13} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">{fmt(hi)}</text>

        <text x={PAD.left + iw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">真实值 →</text>
        <text x={12} y={PAD.top + ih / 2} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6"
          transform={`rotate(-90 12 ${PAD.top + ih / 2})`}>预测值 →</text>

        <g fontSize="10" fill="currentColor">
          <line x1={W - PAD.right - 92} y1={PAD.top + 8} x2={W - PAD.right - 76} y2={PAD.top + 8}
            stroke="currentColor" opacity="0.35" strokeDasharray="4,3" />
          <text x={W - PAD.right - 72} y={PAD.top + 11} opacity="0.6">y=x 完美预测</text>
        </g>
      </svg>

      <div style={{ display: 'flex', gap: 18, fontSize: 12, marginTop: 6, flexWrap: 'wrap' }}>
        <span><span style={{ opacity: 0.55 }}>MAE </span><b>{fmt(mae)}</b></span>
        <span><span style={{ opacity: 0.55 }}>RMSE </span><b>{fmt(rmse)}</b></span>
        <span>
          <span style={{ opacity: 0.55 }}>R² </span>
          <b>{r2 === null ? '—' : r2.toFixed(4)}</b>
        </span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, lineHeight: 1.5 }}>
        MAE = 平均绝对误差（平均差多少）；RMSE = 均方根误差（对大错更敏感，恒 ≥ MAE，
        两者差距大说明存在少数离谱错例）；R² = 相对"直接猜平均值"好多少，1 为完美、0 为等同猜均值、可为负。
        {r2 === null && '本次真实值无波动，R² 无定义故不显示。'}
      </div>
    </div>
  )
}
