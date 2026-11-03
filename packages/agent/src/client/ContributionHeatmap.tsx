/**
 * [INPUT]: 完整贡献矩阵、统一图例与 ExplanationHelp 的即时说明交互。
 * [OUTPUT]: 全量热力图、固定平均贡献、同行显示设置和中间竖向色阶、悬停底部读数与精简整行选中浮层；显式按钮跳转样本；密集轴标签斜排，完整字段名即时可查。
 * [POS]: ExplanationBatch 默认视图；父组件执行样本跳转，不重跑解释。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { contributionColors, contributionFill, directionLabel, knownDirection, number, sampleLabel, type ExplanationData } from './explanation-data'
import { contributionMatrix } from './contribution-matrix'
import { ContributionLegend } from './ContributionLegend'
import { useExplanationHelp } from './ExplanationHelp'

const CSS = `
.lx-middle-legend .lx-contribution-legend{width:90px;position:relative;padding-top:26px}.lx-middle-legend .lx-contribution-scale{width:10px;height:175px;margin-left:4px;background:linear-gradient(to top,#4168a9,#fff 50%,#248575)!important}.lx-middle-legend .lx-contribution-scale-labels{display:flex;position:absolute;left:20px;top:26px;height:175px;flex-direction:column-reverse;font-size:8px;gap:0}.lx-middle-legend .lx-contribution-scale-labels>span{white-space:nowrap;display:block;line-height:1.5}.lx-middle-legend .lx-contribution-unknown{justify-content:flex-start;font-size:8px}.lx-cell-popover{position:absolute;z-index:8;width:250px;padding:14px;border:1px solid var(--dsw-alias-border-primary,#dce1e8);border-radius:8px;background:var(--dsw-alias-background-primary,#fff);box-shadow:0 4px 20px #0002;font-size:12px;line-height:1.7}.lx-cell-popover p{margin:7px 0}.lx-cell-popover dl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;margin:10px 0}.lx-cell-popover dt{color:var(--dsw-alias-label-secondary)}.lx-cell-popover dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}.lx-cell-actions{display:flex;justify-content:flex-end;margin-top:10px}.lx-cell-popover button{color:var(--dsw-alias-state-business-primary,#3465ce)}.lx-cell-close{float:right}.lx-matrix-display{position:relative;font-size:11px;color:var(--dsw-alias-label-secondary);margin:0}.lx-matrix-display>.lx-plot-tabs{position:absolute;right:0;top:24px;z-index:4;white-space:nowrap;background:var(--dsw-alias-background-primary,#fff);padding:10px;border:1px solid var(--dsw-alias-border-primary,#ddd);border-radius:6px}.lx-matrix-display summary{cursor:pointer}
.lx-matrix-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;color:var(--dsw-alias-label-secondary);margin:2px 0 14px}
.lx-matrix-scroll{overflow-x:auto}.lx-matrix-svg{display:block;width:100%;min-width:650px;max-height:430px;color:var(--dsw-alias-label-primary)}
.lx-matrix-svg text{fill:currentColor;font-family:inherit;pointer-events:none}.lx-matrix-cell{cursor:pointer}.lx-matrix-cell:hover,.lx-matrix-cell:focus{outline:none;stroke:var(--dsw-alias-label-primary,#26364a);stroke-width:1;paint-order:fill stroke}
.lx-matrix-readout{font-size:11px;min-height:20px;margin:6px 0 0;color:var(--dsw-alias-label-secondary);line-height:1.6;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.lx-matrix-feature{cursor:help}.lx-matrix-feature:hover,.lx-matrix-feature:focus-visible{color:var(--dsw-alias-state-business-primary,#3465ce);outline:none}.lx-matrix-feature:focus-visible rect{stroke:currentColor;stroke-width:.7}
.lx-matrix-help-trigger{cursor:pointer;color:var(--dsw-alias-label-secondary)}.lx-matrix-help-trigger:hover,.lx-matrix-help-trigger:focus-visible,.lx-matrix-help-trigger[aria-expanded=true]{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-matrix-help-trigger:focus-visible{outline:1px solid currentColor;outline-offset:1px;border-radius:3px}
.lx-matrix-help-body{box-sizing:border-box;margin:2px;padding:11px 13px;border:1px solid var(--dsw-alias-border-primary,#dfe3e8);border-radius:7px;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary,#1c2330);box-shadow:0 3px 12px #00000012;font-family:inherit;font-size:11px;line-height:1.65}
.lx-matrix-help-body strong{display:block;margin-bottom:4px;font-size:11px}.lx-matrix-help-body p{margin:0;font-size:11px;line-height:1.65}
.lx-fullscreen-dialog[open] .lx-explain .lx-matrix-svg{max-height:max(260px,calc(100dvh - 470px))}
.lx-fullscreen-dialog[open] .lx-explain .lx-matrix-comparison .lx-matrix-svg{max-height:320px}
.lx-matrix-expanded .lx-matrix-svg,.lx-fullscreen-dialog[open] .lx-explain .lx-matrix-expanded .lx-matrix-svg{max-height:none}
.lx-matrix-expand{display:flex;justify-content:flex-end;margin-top:4px;font-size:11px}.lx-matrix-expand button{font-size:11px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
@container(max-width:520px){.lx-matrix-heading{align-items:flex-start;flex-direction:column}}
`
const textWidth = (label: string) => Array.from(label).reduce((width, c) => width + (/[^\x00-\xff]/.test(c) ? 1 : .6), 0)
// Keep both ends: engineered features often share a prefix and differ only in their suffix.
function shortLabel(label: string, limit: number) {
  if (textWidth(label) <= limit) return label
  const characters = Array.from(label); let start = '', end = '', left = 0, right = characters.length - 1
  while (left <= right) {
    const takeStart = textWidth(start) <= textWidth(end)
    const next = takeStart ? characters[left] : characters[right]
    if (textWidth(start + end + next) + 1 > limit) break
    if (takeStart) { start += next; left++ } else { end = next + end; right-- }
  }
  return start + '…' + end
}

export function ContributionHeatmap({ data, scope = '全部', scales }: { data: ExplanationData; scope?: string; scales?: { maximum: number; meanMaximum: number } }) {
  const root = useRef<HTMLDivElement>(null), [hint, setHint] = useState(''), [picked, setPicked] = useState<{row: number; hint: string; feature: number; x: number; y: number} | null>(null), [expanded, setExpanded] = useState(false), [readable, setReadable] = useState(false)
  const matrix = useMemo(() => contributionMatrix(data), [data])
  const samples = data.samples ?? [], names = data.feature_names ?? []
  const { helpRef, helpId, helpOpen } = useExplanationHelp<SVGGElement>(!!samples.length && !!names.length)
  const plotHeight = expanded ? Math.max(312, names.length * 22) : 312, plotWidth = readable ? Math.max(548, names.length * 32) : 548, rowHeight = plotHeight / (samples.length || 1), columnWidth = plotWidth / (names.length || 1)
  const angledLabels = names.some(name => textWidth(data.labels?.[name] ?? name) * 11 > columnWidth - 6)
  const axisFont = readable ? 11 : angledLabels ? Math.min(11, Math.max(7, columnWidth * .7)) : 11
  const axisWidth = angledLabels ? 94 : Math.min(120, columnWidth - 6)
  const featureHint = (index: number) => {
    const name = names[index], label = data.labels?.[name]
    return `特征 ${index + 1} · ${label && label !== name ? `${label} · 字段：` : ''}${name}`
  }
  const unknown = samples.some(s => s.directions.some(d => !knownDirection(d)))
  const neutral = samples.some(s => s.directions.includes(0))
  const ranking = expanded ? matrix.ranking : matrix.ranking.slice(0,16), maxMean = (scales?.meanMaximum ?? Math.abs(ranking[0]?.mean ?? 0)) || 1, maximum = scales?.maximum ?? matrix.maximum
  const barStart = 720, barEnd = 838, barZero = (barStart + barEnd) / 2
  const summaryHelp = '展示当前样本范围的平均贡献。每个样本的贡献按方向带上正负号，再求平均；正负会抵消。按平均值的绝对大小排序。' + (data.task_type === 'classification' ? '分类任务的正负仅表示服务返回方向，不对应指定类别概率。' : '')
  const rowTicks = [...new Set([0, .25, .5, .75, 1].map(t => Math.round(t * (samples.length - 1))))]
  useEffect(() => { setHint(''); setPicked(null) }, [data])
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => { if ((event.target as Element).closest('[data-lx-cell-close]')) setPicked(null); if ((event.target as Element).closest('[data-lx-matrix-expand]')) setExpanded(v => !v); const mode = (event.target as Element).closest('[data-lx-matrix-size]')?.getAttribute('data-lx-matrix-size'); if (mode) setReadable(mode === 'readable') }
    element?.addEventListener('click', click); return () => element?.removeEventListener('click', click)
  }, [!!samples.length, !!names.length])
  useEffect(() => {
    const element = root.current
    const describe = (event: Event) => {
      const target = (event.target as Element).closest('[data-lx-matrix-cell], [data-lx-feature-label]')
      if (target) {
        const text = target.getAttribute('aria-label') ?? ''
        setHint(text)
        if (event.type === 'click' && target.hasAttribute('data-lx-matrix-cell')) {
          const bounds = target.getBoundingClientRect(), container = element!.getBoundingClientRect()
          setPicked({row: Number(target.getAttribute('data-row')), feature: Number(target.getAttribute('data-feature')), hint: text, x: Math.max(0, Math.min(container.width - 260, bounds.right - container.left + 10)), y: Math.max(0, bounds.top - container.top - 80)})
        }
      }
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && element?.querySelector('.lx-cell-popover')) { setPicked(null); event.stopPropagation(); return }
      const cell = (event.target as Element).closest<SVGRectElement>('[data-lx-matrix-cell]')
      if (!cell) {
        if (['Enter', ' '].includes(event.key) && (event.target as Element).closest('[data-lx-feature-label]')) { event.preventDefault(); describe(event) }
        return
      }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cell.dispatchEvent(new MouseEvent('click', { bubbles: true })); return }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return
      event.preventDefault()
      let row = Number(cell.dataset.index), column = Number(cell.dataset.feature)
      if (event.key === 'ArrowLeft') column--
      if (event.key === 'ArrowRight') column++
      if (event.key === 'ArrowUp') row--
      if (event.key === 'ArrowDown') row++
      if (event.key === 'Home') column = 0
      if (event.key === 'End') column = names.length - 1
      row = Math.max(0, Math.min(samples.length - 1, row)); column = Math.max(0, Math.min(names.length - 1, column))
      const next = element?.querySelector<SVGRectElement>(`[data-lx-matrix-cell][data-index="${row}"][data-feature="${column}"]`)
      cell.setAttribute('tabindex', '-1'); next?.setAttribute('tabindex', '0'); next?.focus()
    }
    element?.addEventListener('pointerover', describe); element?.addEventListener('focusin', describe); element?.addEventListener('click', describe); element?.addEventListener('keydown', keydown)
    return () => { element?.removeEventListener('pointerover', describe); element?.removeEventListener('focusin', describe); element?.removeEventListener('click', describe); element?.removeEventListener('keydown', keydown) }
  }, [samples.length, names.length])
  const pickedSample = picked ? samples.find(s => s.row_number === picked.row) : undefined
  if (!samples.length || !names.length) return <div ref={root}><div className="lx-matrix-heading">{scope} · 0 个样本</div><p className="lx-explain-foot">没有可展示的样本贡献。</p></div>
  return <div ref={root} style={{position:'relative'}} className={expanded ? 'lx-matrix-expanded' : undefined}>
    <style>{CSS}</style>
    <div className="lx-matrix-heading"><span>{scope} {samples.length} 个样本 · {names.length} 个特征</span>
    <details className="lx-matrix-display"><summary>显示设置</summary><div className="lx-plot-tabs" aria-label="热力图显示尺寸"><button type="button" data-lx-matrix-size="overview" aria-pressed={!readable}>全部概览</button><button type="button" data-lx-matrix-size="readable" aria-pressed={readable}>清晰细看</button></div></details></div>
    <div className="lx-matrix-scroll"><svg className="lx-matrix-svg" style={readable ? { minWidth: plotWidth + 452, maxHeight: 'none' } : undefined} viewBox={`0 0 ${plotWidth + 452} ${plotHeight + (angledLabels ? 138 : 72)}`} role="group" aria-label={`${scope} ${samples.length} 个样本、${names.length} 个特征的贡献热力图，共 ${matrix.cellCount} 个色块`}>
      <foreignObject x={plotWidth + 65} y={65} width="95" height="260"><div className="lx-middle-legend"><ContributionLegend maximum={maximum} unknown={unknown} neutral={neutral} vertical/></div></foreignObject>
      <text x="36" y="12" fontSize="11" fontWeight="500">整体贡献分布</text><text x="0" y="25" fontSize="10" opacity=".6">{data.task_type === 'timeseries' ? '预测步' : '原始行'}</text>
      <g transform={`translate(${plotWidth - 448} 0)`} role="group" aria-label="各影响因子影响分数对比">
        <text x="626" y="12" fontSize="11" fontWeight="500">各影响因子影响分数对比</text>
      </g>
      {rowTicks.map(i => <text key={i} x="25" y={30 + (i + .5) * rowHeight + 3} textAnchor="end" fontSize="10" opacity=".6">{samples[i].row_number}</text>)}
      {matrix.rows.map(row => <g key={row.rowNumber}>
        {row.cells.map(cell => {
          const sample = samples[row.sampleIndex], label = data.labels?.[cell.name] ?? cell.name
          const hint = `${sampleLabel(sample, data)} · ${label} ${cell.name} · 贡献 ${number(cell.score)} · ${directionLabel(cell.direction)}`
          return <rect key={cell.name} className="lx-matrix-cell" x={36 + cell.featureIndex * columnWidth} y={30 + row.sampleIndex * rowHeight} width={Math.max(columnWidth - .7, columnWidth * .92)} height={Math.max(rowHeight - Math.min(.45, rowHeight * .08), rowHeight * .92)} fill={contributionFill(cell.score, cell.direction, maximum)} role="button" tabIndex={row.sampleIndex === 0 && cell.featureIndex === 0 ? 0 : -1} data-lx-matrix-cell aria-pressed={picked?.row === row.rowNumber && picked?.feature === cell.featureIndex} stroke={picked?.row === row.rowNumber && picked?.feature === cell.featureIndex ? "currentColor" : undefined} strokeWidth={1} data-row={row.rowNumber} data-index={row.sampleIndex} data-feature={cell.featureIndex} aria-label={hint}><title>{`${hint}；点击固定读数，方向键选择色块`}</title></rect>
        })}
      </g>)}
      {picked && samples.some(s => s.row_number === picked.row) && <rect x="35.5" y={30 + samples.findIndex(s => s.row_number === picked.row) * rowHeight} width={plotWidth + 1} height={rowHeight} fill="none" stroke="var(--dsw-alias-state-business-primary,#3465ce)" strokeWidth="1.5" pointerEvents="none"/>}
      {names.map((name, i) => {
        const label = data.labels?.[name] ?? name
        return <g key={name} className="lx-matrix-feature" data-lx-feature-label role="button" tabIndex={0} aria-label={featureHint(i)} transform={`translate(${36 + (i + .5) * columnWidth} ${plotHeight + 44})${angledLabels ? ' rotate(60)' : ''}`}>
          <rect x={angledLabels ? -2 : -axisWidth / 2} y={-axisFont} width={axisWidth + 4} height={axisFont + 5} rx="2" fill="transparent" />
          <text textAnchor={angledLabels ? 'start' : 'middle'} fontSize={axisFont}>{shortLabel(label, axisWidth / axisFont)}</text>
        </g>
      })}
      <g transform={`translate(${plotWidth - 448} 0)`} role="group" aria-label="带正负的平均贡献，按绝对大小排序">
        <line x1={barZero} x2={barZero} y1="29" y2={plotHeight + 32} stroke="currentColor" opacity=".18" />
        {ranking.map((feature, i) => {
          const value = feature.mean
          const width = value === null ? 0 : Math.abs(value) / maxMean * (barEnd - barStart) / 2
          const rounded = value === null ? null : Number(value.toFixed(4))
          const label = value === null ? '方向未定' : rounded === 0 ? '0' : (rounded! > 0 ? '+' : '') + number(value)
          const color = value === null || value === 0 ? contributionColors.unknown : value < 0 ? contributionColors.negative : contributionColors.positive
          return <g key={feature.name} transform={`translate(0 ${30 + (i + .5) * plotHeight / ranking.length})`} role="group" aria-label={`${feature.label} ${feature.name}：平均贡献 ${label}`}>
            <title>{`${feature.label} · ${feature.name}：${value === null ? `${feature.unknownCount} 个样本缺少方向，无法计算平均贡献` : label}`}</title>
            <g className="lx-matrix-feature" data-lx-feature-label role="button" tabIndex={0} aria-label={`${featureHint(feature.featureIndex)} · 平均贡献 ${label}`}>
              <rect x="624" y="-10" width="88" height="17" rx="2" fill="transparent" />
              <text x="626" y="4" fontSize="11">{shortLabel(feature.label, 7.5)}</text>
            </g>
            {value !== null && <rect className="lx-contribution-mean" data-value={value} x={value < 0 ? barZero - width : barZero} y="-4" width={width} height="8" rx="1" fill={color} />}
            <text x="898" y="4" textAnchor="end" fontSize={value === null ? 9 : 10} style={{ fontVariantNumeric:'tabular-nums' }}>{label}</text>
          </g>
        })}
        <text x={barZero} y={plotHeight + 46} textAnchor="middle" fontSize="10" opacity=".5">0</text>
        <text x={barStart} y={plotHeight + 46} textAnchor="middle" fontSize="10" opacity=".6">{scales ? `−${number(scales.meanMaximum)}` : '负向'}</text><text x={barEnd} y={plotHeight + 46} textAnchor="middle" fontSize="10" opacity=".6">{scales ? `+${number(scales.meanMaximum)}` : '正向'}</text>
      </g>
      <g ref={helpRef} transform={`translate(${plotWidth - 448} 0)`}>
        <g className="lx-matrix-help-trigger" data-lx-help-trigger role="button" tabIndex={0} aria-label="平均贡献说明" aria-expanded={helpOpen} aria-controls={helpId} aria-describedby={helpOpen ? helpId : undefined}>
          <rect x="751" y="0" width="22" height="22" rx="3" fill="transparent" />
          <text x="762" y="12" textAnchor="middle" fontSize="11">ⓘ</text>
        </g>
        {helpOpen && <foreignObject x="626" y="20" width="274" height={data.task_type === 'classification' ? 160 : 118}>
          <div className="lx-matrix-help-body" id={helpId} role="tooltip"><strong>平均贡献如何计算</strong><p>{summaryHelp}</p></div>
        </foreignObject>}
      </g>
    </svg></div>
    {names.length > 16 && <div className="lx-matrix-expand"><button type="button" data-lx-matrix-expand aria-expanded={expanded}>{expanded ? '收起影响因子' : `影响分数显示前 16 项 · 查看全部 ${names.length} 项`}</button></div>}
    <p className="lx-matrix-readout" role="status">{hint || '点击色块查看详情；整体平均贡献不随选中样本改变。'}</p>
    {picked && pickedSample && <div className="lx-cell-popover" role="dialog" aria-label="样本贡献详情" style={{left:picked.x,top:picked.y}}>
      <button className="lx-cell-close" type="button" data-lx-cell-close aria-label="关闭样本详情">×</button>
      <strong>{sampleLabel(pickedSample, data)} · {data.labels?.[names[picked.feature]] ?? names[picked.feature]}</strong>
      <dl>
        <dt>贡献分数</dt><dd>{number(pickedSample.scores[picked.feature])} · {directionLabel(pickedSample.directions[picked.feature])}</dd>
        <dt>特征原值</dt><dd>{String(pickedSample.feature_values?.[picked.feature] ?? '—')}</dd>
      </dl>
      <div className="lx-cell-actions"><button type="button" data-lx-batch="row" data-row={picked.row}>查看单条解释 →</button></div>
    </div>}
    {samples.length > plotHeight && <p className="lx-explain-foot">全量视图的行高不足 1 像素，可切换逐样本核对明细。</p>}
  </div>
}
