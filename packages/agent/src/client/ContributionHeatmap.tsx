/**
 * [INPUT]: 完整贡献矩阵、统一图例与 ExplanationHelp 的即时说明交互。
 * [OUTPUT]: 全量热力图、同尺度统计与样本跳转；区分中性和缺方向。
 * [POS]: ExplanationBatch 默认视图；父组件执行样本跳转，不重跑解释。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { contributionColors, contributionFill, directionLabel, explanationPrediction, knownDirection, number, sampleLabel, type ExplanationData } from './explanation-data'
import { contributionMatrix } from './contribution-matrix'
import { ContributionLegend } from './ContributionLegend'
import { useExplanationHelp } from './ExplanationHelp'

const CSS = `
.lx-matrix-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;color:var(--dsw-alias-label-secondary);margin:2px 0 14px}
.lx-matrix-scroll{overflow-x:auto}.lx-matrix-svg{display:block;width:100%;min-width:650px;max-height:430px;color:var(--dsw-alias-label-primary)}
.lx-matrix-svg text{fill:currentColor;font-family:inherit;pointer-events:none}.lx-matrix-cell{cursor:pointer}.lx-matrix-cell:hover,.lx-matrix-cell:focus{outline:none;stroke:var(--dsw-alias-label-primary,#26364a);stroke-width:1;paint-order:fill stroke}
.lx-matrix-readout{font-size:11px;min-height:20px;margin:6px 0 0;color:var(--dsw-alias-label-secondary);line-height:1.6;font-variant-numeric:tabular-nums}
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
function labelLines(label: string, limit: number) {
  const lines: string[] = []; let line = '', width = 0
  for (const character of label) {
    const size = /[^\x00-\xff]/.test(character) ? 1 : .55
    if (line && width + size > limit) { lines.push(line); line = ''; width = 0 }
    line += character; width += size
  }
  if (line) lines.push(line)
  return lines
}

export function ContributionHeatmap({ data, scope = '全部', scales }: { data: ExplanationData; scope?: string; scales?: { maximum: number; meanMaximum: number } }) {
  const root = useRef<HTMLDivElement>(null), [hint, setHint] = useState(''), [expanded, setExpanded] = useState(false)
  const matrix = useMemo(() => contributionMatrix(data), [data])
  const samples = data.samples ?? [], names = data.feature_names ?? []
  const { helpRef, helpId, helpOpen } = useExplanationHelp<SVGGElement>(!!samples.length && !!names.length)
  const plotHeight = expanded ? Math.max(312, names.length * 22) : 312, plotWidth = 548, rowHeight = plotHeight / (samples.length || 1), columnWidth = plotWidth / (names.length || 1)
  const unknown = samples.some(s => s.directions.some(d => !knownDirection(d)))
  const neutral = samples.some(s => s.directions.includes(0)), prediction = explanationPrediction(data)
  const ranking = expanded ? matrix.ranking : matrix.ranking.slice(0,16), maxMean = (scales?.meanMaximum ?? Math.abs(ranking[0]?.mean ?? 0)) || 1, maximum = scales?.maximum ?? matrix.maximum
  const barStart = 720, barEnd = 838, barZero = (barStart + barEnd) / 2
  const summaryHelp = '每个样本的贡献按方向带上正负号，再求平均；正负会抵消。按平均值的绝对大小排序。' + (data.task_type === 'classification' ? '分类任务的正负仅表示服务返回方向，不对应指定类别概率。' : '')
  const rowTicks = [...new Set([0, .25, .5, .75, 1].map(t => Math.round(t * (samples.length - 1))))]
  useEffect(() => { setHint('') }, [data])
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => { if ((event.target as Element).closest('[data-lx-matrix-expand]')) setExpanded(v => !v) }
    element?.addEventListener('click', click); return () => element?.removeEventListener('click', click)
  }, [!!samples.length, !!names.length])
  useEffect(() => {
    const element = root.current
    const describe = (event: Event) => {
      const cell = (event.target as Element).closest('[data-lx-matrix-cell]')
      if (cell) setHint(cell.getAttribute('aria-label') ?? '')
    }
    const keydown = (event: KeyboardEvent) => {
      const cell = (event.target as Element).closest<SVGRectElement>('[data-lx-matrix-cell]')
      if (!cell) return
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
    element?.addEventListener('pointerover', describe); element?.addEventListener('focusin', describe); element?.addEventListener('keydown', keydown)
    return () => { element?.removeEventListener('pointerover', describe); element?.removeEventListener('focusin', describe); element?.removeEventListener('keydown', keydown) }
  }, [samples.length, names.length])
  if (!samples.length || !names.length) return <div ref={root}><div className="lx-matrix-heading">{scope} · 0 个样本</div><p className="lx-explain-foot">没有可展示的样本贡献。</p></div>
  return <div ref={root} className={expanded ? 'lx-matrix-expanded' : undefined}>
    <style>{CSS}</style>
    <div className="lx-matrix-heading"><span>{scope} {samples.length} 个样本 · {names.length} 个特征 · 不分页</span><ContributionLegend maximum={maximum} unknown={unknown} neutral={neutral} /></div>
    <div className="lx-matrix-scroll"><svg className="lx-matrix-svg" viewBox={`0 0 900 ${plotHeight + 96}`} role="group" aria-label={`${scope} ${samples.length} 个样本、${names.length} 个特征的贡献热力图，共 ${matrix.cellCount} 个色块`}>
      <text x="0" y="12" fontSize="10" opacity=".6">{data.task_type === 'timeseries' ? '预测步' : '原始行'}</text>
      <g role="group" aria-label="各影响因子影响分数对比">
        <text x="626" y="12" fontSize="11">各影响因子影响分数对比</text>
      </g>
      {rowTicks.map(i => <text key={i} x="25" y={30 + (i + .5) * rowHeight + 3} textAnchor="end" fontSize="10" opacity=".6">{samples[i].row_number}</text>)}
      {matrix.rows.map(row => <g key={row.rowNumber}>
        {row.cells.map(cell => {
          const sample = samples[row.sampleIndex], label = data.labels?.[cell.name] ?? cell.name
          const hint = `${sampleLabel(sample, data)} · ${label} ${cell.name} · 贡献 ${number(cell.score)} · ${directionLabel(cell.direction)}${sample.prediction === undefined ? '' : ` · ${prediction.label} ${typeof sample.prediction === 'number' ? number(sample.prediction) : sample.prediction}${prediction.unit ? ' ' + prediction.unit : ''}`}`
          return <rect key={cell.name} className="lx-matrix-cell" x={36 + cell.featureIndex * columnWidth} y={30 + row.sampleIndex * rowHeight} width={Math.max(columnWidth - .7, columnWidth * .92)} height={Math.max(rowHeight - Math.min(.45, rowHeight * .08), rowHeight * .92)} fill={contributionFill(cell.score, cell.direction, maximum)} role="button" tabIndex={row.sampleIndex === 0 && cell.featureIndex === 0 ? 0 : -1} data-lx-matrix-cell data-lx-batch="row" data-row={row.rowNumber} data-index={row.sampleIndex} data-feature={cell.featureIndex} aria-label={hint}><title>{`${hint}；点击查看此样本，方向键选择色块`}</title></rect>
        })}
      </g>)}
      {names.map((name, i) => {
        const label = data.labels?.[name] ?? name, lines = labelLines(label, Math.max(2, (columnWidth - 3) / 11))
        return <g key={name} transform={`translate(${36 + (i + .5) * columnWidth} ${plotHeight + 46})`}><text textAnchor="middle" fontSize="11"><title>{label}</title>{lines.slice(0,3).map((line, j) => <tspan key={j} x="0" dy={j ? 12 : 0}>{j === 2 && lines.length > 3 ? line + '…' : line}</tspan>)}</text>{label !== name && <text y={Math.min(lines.length, 3) * 12 + 5} textAnchor="middle" fontSize="9" opacity=".5">{name.length > 8 ? name.slice(0,7) + '…' : name}</text>}</g>
      })}
      <g role="group" aria-label="带正负的平均贡献，按绝对大小排序">
        <line x1={barZero} x2={barZero} y1="29" y2={plotHeight + 32} stroke="currentColor" opacity=".18" />
        {ranking.map((feature, i) => {
          const value = feature.mean
          const width = value === null ? 0 : Math.abs(value) / maxMean * (barEnd - barStart) / 2
          const rounded = value === null ? null : Number(value.toFixed(4))
          const label = value === null ? '方向未定' : rounded === 0 ? '0' : (rounded! > 0 ? '+' : '') + number(value)
          const color = value === null || value === 0 ? contributionColors.unknown : value < 0 ? contributionColors.negative : contributionColors.positive
          return <g key={feature.name} transform={`translate(0 ${30 + (i + .5) * plotHeight / ranking.length})`} role="img" aria-label={`${feature.label} ${feature.name}：平均贡献 ${label}`}>
            <title>{`${feature.label} · ${feature.name}：${value === null ? `${feature.unknownCount} 个样本缺少方向，无法计算平均贡献` : label}`}</title>
            <text x="626" y="4" fontSize="11">{labelLines(feature.label, 7.5).slice(0,2).map((line, j) => <tspan key={j} x="626" dy={j ? 12 : 0}>{line}</tspan>)}</text>
            {value !== null && <rect className="lx-contribution-mean" data-value={value} x={value < 0 ? barZero - width : barZero} y="-4" width={width} height="8" rx="1" fill={color} />}
            <text x="898" y="4" textAnchor="end" fontSize={value === null ? 9 : 10} style={{ fontVariantNumeric:'tabular-nums' }}>{label}</text>
          </g>
        })}
        <text x={barZero} y={plotHeight + 46} textAnchor="middle" fontSize="10" opacity=".5">0</text>
        <text x={barStart} y={plotHeight + 46} fontSize="10" opacity=".6">{scales ? `−${number(scales.meanMaximum)}` : '负向'}</text><text x={barEnd} y={plotHeight + 46} textAnchor="end" fontSize="10" opacity=".6">{scales ? `+${number(scales.meanMaximum)}` : '正向'}</text>
      </g>
      <g ref={helpRef}>
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
    <p className="lx-matrix-readout" role="status">{hint || '每行一个样本，每列一个特征；悬停查看数值，点击色块查看该样本。'}</p>
    {samples.length > plotHeight && <p className="lx-explain-foot">全量视图的行高不足 1 像素，可切换逐样本核对明细。</p>}
  </div>
}
