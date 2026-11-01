/**
 * [INPUT]: 真实贡献矩阵、关系网络、筛选说明与已解析的主题颜色。
 * [OUTPUT]: 独立 SVG；同尺度完整矩阵、方向语义与有向或无向关系。
 * [POS]: 图片导出的纯渲染层；与界面共用数值计算和关系布局。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { contributionColor, contributionColors, directionLabel, number, sampleLabel, type ExplanationData } from './explanation-data'
import { contributionMatrix, contributionScales } from './contribution-matrix'
import { graphLayout } from './graph-layout'

export interface ExportTheme { background: string; foreground: string; border: string }
export const defaultExportTheme: ExportTheme = { background: '#ffffff', foreground: '#202734', border: '#dce2eb' }
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]!))
const text = (x: number, y: number, value: unknown, size = 13, attrs = '') => `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${escape(value)}</text>`
const start = (width: number, height: number, theme: ExportTheme, title: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escape(title)}</title><rect width="100%" height="100%" fill="${theme.background}"/><g fill="${theme.foreground}" font-family="system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif">`
const end = '</g></svg>'
const signed = (v: number | null) => v === null ? '方向未定' : `${v > 0 ? '+' : ''}${number(v)}`

export function contributionExportSvg(data: ExplanationData, filtered?: ExplanationData, description = '', theme = defaultExportTheme) {
  const coverage = data.samples?.length ? (filtered?.samples?.length ?? 0) / data.samples.length * 100 : 0
  const groups = filtered ? [{ data: filtered, title: `当前筛选 · ${filtered.samples?.length ?? 0} 个样本 · 覆盖率 ${number(coverage)}%` }, { data, title: `全样本 · ${data.samples?.length ?? 0} 个样本` }] : [{ data, title: `全样本 · ${data.samples?.length ?? 0} 个样本` }]
  const plotWidth = Math.max(700, (data.feature_names?.length ?? 1) * 48)
  const labelWidth = Math.max(100, ...(data.feature_names ?? []).map(n => (data.labels?.[n] ?? n).length * 10))
  const width = 80 + plotWidth + 64 + labelWidth + 20 + 290 + 110
  const plotHeight = Math.max(330, Math.min(900, (data.samples?.length ?? 1) * 4), (data.feature_names?.length ?? 1) * 25)
  const labelHeight = Math.max(95, ...(data.feature_names ?? []).map(n => (data.labels?.[n] ?? n).length * 10))
  const sectionHeight = plotHeight + labelHeight + 100, height = 110 + groups.length * sectionHeight + 50
  const scales = contributionScales(data, ...(filtered ? [filtered] : [])), title = `预测解释 · ${data.target_label ?? data.target}`
  let svg = start(width, height, theme, title) + text(36, 38, title, 23, 'font-weight="600"') + text(36, 67, description || '全部已解释样本', 13)
  const timed = data.samples?.filter(s => s.timestamp)
  if (timed?.length) svg += text(36, 88, `预测时间 ${timed[0].timestamp} — ${timed[timed.length - 1].timestamp}`, 11)
  svg += `<defs><linearGradient id="contribution-scale"><stop stop-color="${contributionColors.negative}"/><stop offset=".5" stop-color="${theme.background}"/><stop offset="1" stop-color="${contributionColors.positive}"/></linearGradient></defs>`
  groups.forEach((group, groupIndex) => {
    const matrix = contributionMatrix(group.data), samples = group.data.samples ?? [], names = group.data.feature_names ?? []
    const top = 110 + groupIndex * sectionHeight, x = 80, y = top + 58, rowHeight = plotHeight / Math.max(samples.length, 1), columnWidth = plotWidth / Math.max(names.length, 1)
    const barLabel = x + plotWidth + 64, barZero = barLabel + labelWidth + 20 + 145, barHalf = 145
    svg += text(36, top + 16, group.title, 17, 'font-weight="600"') + text(x, top + 43, '影响因子热力图', 13) + text(barLabel, top + 43, '各影响因子影响分数对比', 13)
    svg += `<rect x="${x + plotWidth - 220}" y="${top + 7}" width="220" height="8" fill="url(#contribution-scale)"/>` + text(x + plotWidth - 220, top + 32, `−${number(scales.maximum)}`, 11) + text(x + plotWidth - 110, top + 32, '0', 11, 'text-anchor="middle"') + text(x + plotWidth, top + 32, `+${number(scales.maximum)}`, 11, 'text-anchor="end"')
    if (!samples.length) svg += text(x, y + 40, '没有符合条件的样本')
    matrix.rows.forEach(row => row.cells.forEach(cell => {
      const color = contributionColor(cell.direction)
      const alpha = scales.maximum ? Math.min(1, Math.abs(cell.score) / scales.maximum) : 0
      svg += `<rect x="${x + cell.featureIndex * columnWidth}" y="${y + row.sampleIndex * rowHeight}" width="${columnWidth}" height="${rowHeight}" fill="${color}" fill-opacity="${alpha}"><title>${escape(`${sampleLabel(samples[row.sampleIndex], data)} · ${data.labels?.[cell.name] ?? cell.name} · ${cell.score} · ${directionLabel(cell.direction)}`)}</title></rect>`
    }))
    const ticks = [...new Set([0, .25, .5, .75, 1].map(t => Math.round(t * (samples.length - 1))))].filter(i => i >= 0 && i < samples.length)
    ticks.forEach(i => { svg += text(x - 12, y + (i + .5) * rowHeight + 4, samples[i].step ?? samples[i].row_number, 11, 'text-anchor="end"') })
    svg += text(36, y - 8, data.task_type === 'timeseries' ? '预测步' : '原始行', 11)
    names.forEach((name, i) => { const label = data.labels?.[name] ?? name; svg += `<g transform="translate(${x + (i + .5) * columnWidth} ${y + plotHeight + 16}) rotate(55)">` + text(0, 0, label, 12) + (label === name ? '' : text(0, 17, name, 10, 'opacity=".65"')) + '</g>' })
    svg += `<line x1="${barZero}" x2="${barZero}" y1="${y}" y2="${y + plotHeight}" stroke="${theme.border}"/>`
    matrix.ranking.forEach((feature, i) => {
      const cy = y + (i + .5) * plotHeight / Math.max(names.length, 1), v = feature.mean
      const barWidth = v === null || !scales.meanMaximum ? 0 : Math.abs(v) / scales.meanMaximum * barHalf
      svg += text(barLabel + labelWidth, cy - 1, feature.label, 12, 'text-anchor="end"') + (feature.label !== feature.name ? text(barLabel + labelWidth, cy + 13, feature.name, 10, 'text-anchor="end" opacity=".6"') : '')
      if (v !== null) svg += `<rect x="${v < 0 ? barZero - barWidth : barZero}" y="${cy - 5}" width="${barWidth}" height="10" fill="${v < 0 ? contributionColors.negative : contributionColors.positive}"/>`
      svg += text(width - 30, cy + 4, signed(v), 12, 'text-anchor="end"')
    })
    svg += text(barZero - barHalf, y + plotHeight + 20, `−${number(scales.meanMaximum)}`, 11, 'text-anchor="middle"') + text(barZero, y + plotHeight + 20, '0', 11, 'text-anchor="middle"') + text(barZero + barHalf, y + plotHeight + 20, `+${number(scales.meanMaximum)}`, 11, 'text-anchor="middle"')
  })
  svg += text(36, height - 36, '蓝色负向 · 绿色正向 · 灰蓝中性 · 灰色方向未定；中性按 0 计入均值，正负会抵消。', 12)
  return svg + end
}

export function graphExportSvg(data: ExplanationData, theme = defaultExportTheme, scope = '完整网络') {
  const nodes = data.nodes ?? [], edges = data.edges ?? [], layout = graphLayout(nodes, edges), width = Math.max(800, layout.width + 72), height = layout.height + 160
  const label = (name: string) => data.labels?.[name] ?? name
  let svg = start(width, height, theme, `关系探索 · ${data.target_label ?? data.target}`) + text(36, 38, `关系探索 · ${data.target_label ?? data.target}`, 22, 'font-weight="600"') + text(36, 66, `${scope} · ${nodes.length} 个变量 · ${edges.length} 条关系`, 13)
  svg += `<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 1 L6 3.5 L0 6" fill="none" stroke="#7793c3"/></marker></defs><g transform="translate(36 90)">`
  edges.forEach(e => {
    const a = layout.positions.get(e.source), b = layout.positions.get(e.target); if (!a || !b) return
    const right = b[0] > a[0], same = b[0] === a[0], ax = a[0] + (right || same ? 68 : -68), bx = b[0] + (right ? -68 : 68)
    const d = same ? `M${ax} ${a[1]} C${ax + 30} ${a[1]},${bx + 30} ${b[1]},${bx} ${b[1]}` : `M${ax} ${a[1]} C${(ax + bx) / 2} ${a[1]},${(ax + bx) / 2} ${b[1]},${bx} ${b[1]}`
    svg += `<path d="${d}" fill="none" stroke="#7793c3" stroke-width="1.5"${data.mode === 'directed' ? ' marker-end="url(#arrow)"' : ''}><title>${escape(`${label(e.source)} ${data.mode === 'directed' ? '→' : '—'} ${label(e.target)}：${e.weight}`)}</title></path>`
    if (edges.length <= 5) svg += text((ax + bx) / 2, (a[1] + b[1]) / 2 - 7, number(e.weight), 11, 'text-anchor="middle"')
  })
  nodes.forEach(name => { const [x, y] = layout.positions.get(name)!; svg += `<rect x="${x - 68}" y="${y - 22}" width="136" height="44" rx="5" fill="${theme.background}" stroke="${name === data.target ? '#7793c3' : theme.border}"/>` + text(x, y - 2, label(name), 12, 'text-anchor="middle"') + text(x, y + 14, name, 10, 'text-anchor="middle" opacity=".65"') })
  return svg + '</g>' + text(36, height - 22, '连线表示模型发现的关系，数值为关系分数。', 12) + end
}
