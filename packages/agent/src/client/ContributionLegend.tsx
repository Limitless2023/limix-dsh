/**
 * [INPUT]: 本次全量贡献最大绝对值；explanation-data 的统一色阶。
 * [OUTPUT]: 蓝负绿正的数值图例条；中性与未知方向单独说明。
 * [POS]: 全量与分页热力图共用图例；翻页不重算色阶范围。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { contributionBase, contributionColors, contributionFill, number } from './explanation-data'

export function ContributionLegend({ maximum, unknown, neutral = false }: { maximum: number; unknown: boolean; neutral?: boolean }) {
  return <div className="lx-contribution-legend" aria-label="贡献色阶：蓝色负向，绿色正向，深色贡献大">
    <style>{`
      .lx-contribution-legend{width:218px;max-width:100%;flex-shrink:0;font-size:10px;color:var(--dsw-alias-label-secondary)}
      .lx-contribution-scale-labels{display:flex;justify-content:space-between;gap:8px;font-variant-numeric:tabular-nums;margin-bottom:5px}
      .lx-contribution-scale{height:7px;border-radius:2px}
      .lx-contribution-unknown{display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:5px}.lx-contribution-unknown i{width:7px;height:7px;border-radius:50%}
    `}</style>
    {maximum > 0 ? <>
      <div className="lx-contribution-scale-labels"><span>负向 −{number(maximum)}</span><span>0</span><span>+{number(maximum)} 正向</span></div>
      <div className="lx-contribution-scale" role="img" aria-label={`负向 ${number(maximum)} 到正向 ${number(maximum)}；深浅表示贡献绝对值`} style={{ background: `linear-gradient(to right, ${contributionFill(maximum, -1, maximum)}, ${contributionBase} 50%, ${contributionFill(maximum, 1, maximum)})` }} />
    </> : <span>贡献均为 0</span>}
    {neutral && <span className="lx-contribution-unknown"><i style={{ background: contributionColors.neutral }} />灰蓝：中性</span>}
    {unknown && <span className="lx-contribution-unknown"><i style={{ background: contributionColors.unknown }} />灰色：方向未定</span>}
  </div>
}
