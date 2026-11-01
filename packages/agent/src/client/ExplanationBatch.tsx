/**
 * [INPUT]: 批量贡献矩阵、原始行号与可选特征原值。
 * [OUTPUT]: 同尺度筛选对比与逐样本视图；方向和预测尺度复用统一契约。
 * [POS]: ExplanationView 的批量分支；与单条视图共用样本契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { contributionFill, directionLabel, explanationPrediction, knownDirection, number, sampleLabel, sampleView, type ExplanationData } from './explanation-data'
import { LocalExplanation } from './LocalExplanation'
import { ContributionHeatmap } from './ContributionHeatmap'
import { ContributionLegend } from './ContributionLegend'
import { ExplanationFilter } from './ExplanationFilter'
import { ExplanationDataTable } from './ExplanationDataTable'
import { ExplanationExport } from './ExplanationExport'
import { ExplanationHelp } from './ExplanationHelp'
import { contributionScales } from './contribution-matrix'
import { contributionExportSvg } from './explanation-export'
import { emptyFilter, filterActive, filterDescription, filterSamples, type SampleFilter } from './explanation-filter'

export function ExplanationBatch({ data }: { data: ExplanationData }) {
  const root = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState('distribution'), [view, setView] = useState('visual')
  const [filter, setFilter] = useState<SampleFilter>(emptyFilter)
  const applyFilter = useCallback((value: SampleFilter) => { setFilter(value); setPage(0); setSelected(null) }, [])
  const active = filterActive(filter), description = filterDescription(filter, data)
  const visible = useMemo(() => active ? { ...data, samples: filterSamples(data, filter) } : data, [data, filter, active])
  const scales = useMemo(() => contributionScales(data, visible), [data, visible])
  const [selected, setSelected] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const samples = visible.samples ?? [], allSamples = data.samples ?? [], names = data.feature_names ?? []
  const pageSize = 10, pages = Math.ceil(samples.length / pageSize)
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-lx-batch]')
      if (!button || !element?.contains(button)) return
      const action = button.dataset.lxBatch!
      if (action === 'visual' || action === 'raw') setView(action)
      if (action === 'distribution' || action === 'sample') setTab(action)
      if (action === 'row') { setSelected(Number(button.dataset.row)); setTab('sample'); setView('visual') }
      if (action === 'previous') setPage(p => Math.max(0, p - 1))
      if (action === 'next') setPage(p => Math.min(pages - 1, p + 1))
      if (action === 'table') setSelected(null)
    }
    const change = (event: Event) => {
      if ((event.target as HTMLElement).matches('[data-lx-sample-select]')) setSelected(Number((event.target as HTMLSelectElement).value))
    }
    element?.addEventListener('click', click); element?.addEventListener('change', change)
    return () => { element?.removeEventListener('click', click); element?.removeEventListener('change', change) }
  }, [pages])
  const cellMax = scales.maximum
  const unknown = samples.some(s => s.directions.some(d => !knownDirection(d)))
  const neutral = samples.some(s => s.directions.includes(0))
  const selectedSample = selected === null ? undefined : allSamples.find(s => s.row_number === selected)
  return <div ref={root}>
    <div className="lx-batch-summary"><strong>{data.explained_count ?? allSamples.length} / {data.requested_count ?? allSamples.length} 个样本</strong><div className="lx-batch-meta"><span>{names.length} 个特征{data.input_rows ? ` · 输入共 ${data.input_rows} 行` : ''}</span>
      <ExplanationHelp label="数据说明"><p>{data.mapping === 'forecast_steps' ? '按接口返回的预测步与时间对应；特征包含服务生成的时间和季节性特征。' : data.mapping === 'input_order' ? '样本按输入顺序对应；接口未返回样本索引，返回数量与请求一致。' : '样本按接口返回的样本索引对应。'}</p><p>贡献用于解释预测，不代表实际调节收益。</p></ExplanationHelp>
    </div></div>
    {!!data.missing_rows?.length && <p className="lx-explain-warning">仅解释了部分样本；未返回原始行：{data.missing_rows.join('、')}。整体排序只统计已返回样本。</p>}
    <div className="lx-explain-tabs" aria-label="解释数据视图"><button type="button" data-lx-batch="visual" aria-pressed={view === 'visual'}>可视化</button><button type="button" data-lx-batch="raw" aria-pressed={view === 'raw'}>原始数据</button></div>
    <div className="lx-analysis-toolbar"><ExplanationFilter data={data} value={filter} onApply={applyFilter}/><ExplanationExport filename={`${data.target}-解释${active ? '-筛选对比' : ''}`} build={theme => contributionExportSvg(data, active ? visible : undefined, description, theme)}/></div>
    {active && <div className="lx-filter-summary"><strong>命中 {samples.length} 个样本 · 覆盖率 {allSamples.length ? number(samples.length / allSamples.length * 100) : 0}%</strong><span>{description}</span></div>}
    {view === 'raw' ? <ExplanationDataTable data={visible}/> : <>
    <div className="lx-plot-tabs" aria-label="解释图表"><button type="button" data-lx-batch="distribution" aria-pressed={tab === 'distribution'}>贡献热力图</button><button type="button" data-lx-batch="sample" aria-pressed={tab === 'sample'}>逐样本</button></div>
    {tab === 'distribution' ? <div className={active ? 'lx-matrix-comparison' : ''}>
      <ContributionHeatmap data={visible} scope={active ? '当前筛选' : '全部'} scales={active ? scales : undefined}/>
      {active && <ContributionHeatmap data={data} scope="全样本" scales={scales}/>}
    </div> : selectedSample ? <>
      <div className="lx-sample-control"><button type="button" data-lx-batch="table">← 返回样本表</button><label>选择样本 <select data-lx-sample-select value={selected ?? 0} onChange={() => {}} aria-label="选择原始样本行">{allSamples.map(s => <option value={s.row_number} key={s.row_number}>{sampleLabel(s, data)}</option>)}</select></label></div>
      <LocalExplanation key={selectedSample.row_number} data={sampleView(data, selectedSample)} />
    </> : <>
      <div className="lx-heatmap-heading"><span>样本贡献明细</span><ContributionLegend maximum={cellMax} unknown={unknown} neutral={neutral} /></div>
      <div className="lx-heatmap-scroll"><table className="lx-heatmap" aria-label="样本特征贡献热力图">
        <thead><tr><th>{data.task_type === 'timeseries' ? '预测步' : '原始行'}</th>{names.map(n => <th key={n} title={data.labels?.[n]}>{n}</th>)}<th>{explanationPrediction(data).label}</th></tr></thead>
        <tbody>{samples.slice(page * pageSize, (page + 1) * pageSize).map((s, r) => <tr key={s.row_number}>
          <th><button type="button" data-lx-batch="row" data-row={s.row_number} aria-label={`查看${sampleLabel(s, data)}解释`}>{s.step ?? s.row_number} ↗</button></th>
          {s.scores.map((score, i) => <td key={names[i]}><span className="lx-heat-cell" style={{ background: contributionFill(score, s.directions[i], cellMax) }} title={`${data.labels?.[names[i]] ?? names[i]}：${number(score)}；${directionLabel(s.directions[i])}`} /></td>)}
          <td className="lx-heat-pred">{typeof s.prediction === 'number' ? number(s.prediction) : s.prediction ?? '—'}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="lx-heatmap-footer"><span>第 {samples.length ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, samples.length)} 个 · 点击行号查看解释</span>
        {pages > 1 && <div><button type="button" data-lx-batch="previous" disabled={page === 0} aria-label="上一页样本">←</button><span>{page + 1} / {pages}</span><button type="button" data-lx-batch="next" disabled={page === pages - 1} aria-label="下一页样本">→</button></div>}
      </div>
    </>}
    </>}
  </div>
}
