/**
 * [INPUT]: 依赖 react（宿主 external）与 ./eval-csv.ts 的 ConfusionData 类型（仅 import type）
 * [OUTPUT]: ConfusionMatrix，混淆矩阵与默认折叠的逐类指标表。
 * [POS]: limix-ui 的图表原子，分类任务对位 ForecastChart（时序）；
 *        与 ScatterChart（回归）并列，三者共用"零依赖纯 SVG"取舍
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ConfusionData } from './eval-csv.ts'

const ACCENT = '#2563eb'

/** 单元格边长按类别数收缩，保证整图宽度稳定在卡片内 */
function cellSize(k: number): number {
  return k <= 3 ? 62 : k <= 5 ? 52 : k <= 8 ? 42 : 34
}

/** 标签过长会撑破行首，统一截断并留 title 兜底 */
function short(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

export function ConfusionMatrix({ data }: { data: ConfusionData }): JSX.Element | null {
  const { classes, matrix, n, accuracy, perClass, majorityBaseline } = data
  const k = classes.length
  if (!k) return null

  const cs = cellSize(k)
  const LEFT = 78
  const TOP = 40
  const W = LEFT + k * cs + 14
  // 类别明细放在 HTML 中，SVG 只保留矩阵与轴标签。
  const H = TOP + k * cs + 8

  // 行归一化着色：深浅表示"该真实类别中有多大比例被预测成了这一格"，
  // 即按行看就是召回率的分解。用全局最大值着色会让小类别整行褪成空白。
  const rowMax = matrix.map(row => Math.max(...row, 1))

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
        混淆矩阵 · 共 {n} 个样本 · 准确率 <b>{pct(accuracy)}</b>
        <span> · 多数类基线 {pct(majorityBaseline)}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}
        role="img" aria-label="混淆矩阵">
        <text x={LEFT} y={12} fontSize="10" fill="currentColor" opacity="0.55">预测类别 →</text>
        <text x={4} y={TOP - 8} fontSize="10" fill="currentColor" opacity="0.55">真实类别 ↓</text>

        {/* 列表头 */}
        {classes.map((c, j) => (
          <text key={`h${c}`} x={LEFT + j * cs + cs / 2} y={TOP - 8} textAnchor="middle"
            fontSize="10" fill="currentColor" opacity="0.7">{short(c, 6)}</text>
        ))}

        {classes.map((rc, i) => (
          <g key={`r${rc}`}>
            <text x={LEFT - 6} y={TOP + i * cs + cs / 2 + 3} textAnchor="end"
              fontSize="10" fill="currentColor" opacity="0.7">{short(rc, 10)}</text>
            {classes.map((cc, j) => {
              const v = matrix[i][j]
              const f = v / rowMax[i]
              const diag = i === j
              return (
                <g key={`c${rc}-${cc}`}>
                  <rect x={LEFT + j * cs + 1} y={TOP + i * cs + 1} width={cs - 2} height={cs - 2} rx={3}
                    fill={ACCENT} opacity={v === 0 ? 0.04 : 0.10 + 0.72 * f} />
                  {/* 对角线=预测正确，描边强调，让"亮块是否落在对角线上"一眼可判 */}
                  {diag && (
                    <rect x={LEFT + j * cs + 1} y={TOP + i * cs + 1} width={cs - 2} height={cs - 2} rx={3}
                      fill="none" stroke={ACCENT} strokeWidth="1.5" opacity="0.85" />
                  )}
                  <text x={LEFT + j * cs + cs / 2} y={TOP + i * cs + cs / 2 + 4} textAnchor="middle"
                    fontSize={k > 8 ? 10 : 12} fontWeight={diag ? 700 : 400}
                    fill={f > 0.55 ? '#ffffff' : 'currentColor'} opacity={v === 0 ? 0.35 : 1}>{v}</text>
                </g>
              )
            })}
          </g>
        ))}

      </svg>

      {/* 明细默认折叠，HTML 布局不受 SVG 类别数限制。 */}
      <details style={{ marginTop: 10, fontSize: 12 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--dsw-alias-label-secondary)' }}>各类别表现</summary>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto repeat(4, minmax(0,1fr))',
        gap: '2px 12px', fontSize: 12, marginTop: 8,
      }}>
        <span style={{ opacity: 0.55 }}>类别</span>
        <span style={{ opacity: 0.55 }}>样本数</span>
        <span style={{ opacity: 0.55 }}>精确率</span>
        <span style={{ opacity: 0.55 }}>召回率</span>
        <span style={{ opacity: 0.55 }}>F1</span>
        {perClass.map(c => (
          <span key={c.label} style={{ display: 'contents' }}>
            <span style={{ wordBreak: 'break-all' }} title={c.label}>{short(c.label, 14)}</span>
            <span>{c.support}</span>
            <span>{pct(c.precision)}</span>
            <span>{pct(c.recall)}</span>
            <span>{pct(c.f1)}</span>
          </span>
        ))}
      </div>
      </details>
    </div>
  )
}
