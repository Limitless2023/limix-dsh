/**
 * [INPUT]: 批量贡献矩阵、原始行号与可选特征原值。
 * [OUTPUT]: 紧凑整体分布、筛选配置与独立单条解释视图与对应范围导出；预测核对按当前范围或所选样本按需显示。
 * [POS]: ExplanationView 的批量分支；与单条视图共用样本契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { PredictionCheck } from './PredictionCheck'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { contributionFill, directionLabel, explanationPrediction, knownDirection, number, sampleLabel, sampleView, singleSampleMatrix, type ExplanationData } from './explanation-data'
import { ExplanationInsight, GroupInsight, predictionGroups } from './ExplanationInsight'
import { LocalExplanation } from './LocalExplanation'
import { ContributionHeatmap } from './ContributionHeatmap'
import { ContributionLegend } from './ContributionLegend'
import { ExplanationFilter } from './ExplanationFilter'
import { ExplanationDataTable } from './ExplanationDataTable'
import { ExplanationExport } from './ExplanationExport'
import { ExplanationHelp } from './ExplanationHelp'
import { contributionScales } from './contribution-matrix'
import { contributionExportSvg, singleContributionExportSvg } from './explanation-export'
import { emptyFilter, filterActive, filterDescription, filterSamples, type SampleFilter } from './explanation-filter'

export function ExplanationBatch({ data, showRaw = false, showPredictionCheck = false, onVisual }: { data: ExplanationData; showRaw?: boolean; showPredictionCheck?: boolean; onVisual?: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState('distribution'), [view, setView] = useState('visual')
  const [group,setGroup]=useState('all')
  const groups=useMemo(()=>predictionGroups(data),[data])
  const [filter, setFilter] = useState<SampleFilter>(emptyFilter)
  const applyFilter = useCallback((value: SampleFilter) => { setFilter(value); setGroup('all'); setPage(0); setSelected(null); setTab('distribution') }, [])
  const active = filterActive(filter), description = filterDescription(filter, data)
  const visible = useMemo(() => groups&&group==='low'?groups.low:groups&&group==='high'?groups.high:active ? { ...data, samples: filterSamples(data, filter) } : data, [data, filter, active, groups, group])
  const scales = useMemo(() => contributionScales(data, visible,...(groups?[groups.low,groups.high]:[])), [data, visible, groups])
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
      if (['row','distribution','sample'].includes(action)) onVisual?.()
      if (action === 'visual' || action === 'raw') setView(action)
      if (action === 'distribution' || action === 'sample') { setTab(action); setView('visual'); if(action==='sample' && selected===null) setSelected(samples[0]?.row_number ?? null) }
      if (action === 'row') { setSelected(Number(button.dataset.row)); setTab('sample'); setView('visual') }
      if (action === 'previous') setPage(p => Math.max(0, p - 1))
      if (action === 'next') setPage(p => Math.min(pages - 1, p + 1))
      if (action === 'table') setTab('distribution')
      if (action === 'sample-prev' || action === 'sample-next') { const i=allSamples.findIndex(s=>s.row_number===selected); setSelected(allSamples[Math.max(0,Math.min(allSamples.length-1,i+(action==='sample-prev'?-1:1)))].row_number) }
    }
    const change = (event: Event) => {
      if ((event.target as HTMLElement).matches('[data-lx-prediction-group]')) {setGroup((event.target as HTMLSelectElement).value);setFilter(emptyFilter);setSelected(null);setPage(0);setTab('distribution')}
      if ((event.target as HTMLElement).matches('[data-lx-sample-select]')) setSelected(Number((event.target as HTMLSelectElement).value))
    }
    element?.addEventListener('click', click); element?.addEventListener('change', change)
    return () => { element?.removeEventListener('click', click); element?.removeEventListener('change', change) }
  }, [pages, selected, samples, allSamples, onVisual])
  const cellMax = scales.maximum
  const unknown = samples.some(s => s.directions.some(d => !knownDirection(d)))
  const neutral = samples.some(s => s.directions.includes(0))
  const selectedSample = selected === null ? undefined : allSamples.find(s => s.row_number === selected)
  return <div ref={root} className="lx-batch-view">
    {tab==='sample'&&selectedSample?<ExplanationInsight data={singleSampleMatrix(sampleView(data,selectedSample))}/>:group==='compare'&&groups?<GroupInsight low={groups.low} high={groups.high}/>:<ExplanationInsight data={visible}/>}
    {data.input_rows && allSamples.length < data.input_rows && <p className="lx-explain-foot">当前解释 {allSamples.length} / {data.input_rows} 行{data.selection_method === 'predicted_class_stratified' ? ` · 按预测类别抽样（种子 ${data.selection_seed}）` : ''}；图中排名仅代表这些样本。</p>}
    {!!data.missing_rows?.length && <p className="lx-explain-warning">仅解释了部分样本；未返回原始行：{data.missing_rows.join('、')}。整体排序只统计已返回样本。</p>}
    <style>{`.lx-batch-toolbar button,.lx-batch-toolbar summary{font-family:inherit!important;font-size:12px!important;font-weight:400!important;line-height:20px!important}.lx-batch-toolbar .lx-plot-tabs button[aria-pressed=true]{font-weight:400!important;text-decoration:none}.lx-batch-view .lx-sample-control{justify-content:flex-end;gap:6px;margin:0}.lx-batch-view .lx-sample-control button{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0}.lx-batch-view .lx-sample-control label{display:flex;align-items:center;gap:8px}.lx-batch-view .lx-sample-control select{margin:0;font:inherit;min-height:30px}.lx-batch-config-body .lx-analysis-toolbar{display:block;margin-top:14px}.lx-batch-config-body select{font:inherit;color:inherit;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-primary,#ddd);border-radius:5px;padding:6px 8px;max-width:100%}.lx-batch-config-body .lx-analysis-toolbar label{display:flex;align-items:center;gap:8px}.lx-batch-config-body .lx-analysis-toolbar select{margin-left:auto;max-width:210px}.lx-batch-config-body .lx-explain-foot{display:block;margin-top:8px;font-size:11px}.lx-batch-config-body .lx-filter-panel{margin:0;border:0;padding:0;background:transparent;display:grid;grid-template-columns:1fr 1fr;gap:12px}.lx-batch-config-body .lx-filter-panel label{min-width:0}.lx-batch-config-body .lx-filter-panel select{width:100%;margin:0}.lx-batch-config-body .lx-filter-range input{width:100%;min-width:0}.lx-batch-config-body .lx-filter-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}.lx-batch-config-body .lx-filter-actions{grid-column:1/-1;justify-content:flex-end}.lx-batch-config-body .lx-filter-error{grid-column:1/-1}.lx-batch-config-body .lx-analysis-toolbar{border-top:1px solid var(--dsw-alias-border-primary,#ddd);padding-top:12px}.lx-batch-toolbar{display:flex;min-height:32px;align-items:center;gap:12px;margin:12px 0;border-bottom:1px solid var(--dsw-alias-border-primary,#ddd);padding-bottom:0}.lx-batch-toolbar>.lx-export{margin:0;padding:0;display:flex;align-items:center}.lx-batch-toolbar>.lx-export>.lx-export-status:empty{display:none}.lx-batch-toolbar>.lx-plot-tabs{margin:0;align-items:stretch}.lx-batch-toolbar .lx-plot-tabs button{position:relative;height:40px;text-decoration:none!important}.lx-batch-toolbar .lx-plot-tabs button[aria-pressed=true]:after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--dsw-alias-state-business-primary,#3465ce)}.lx-batch-toolbar button,.lx-batch-toolbar summary{display:inline-flex;align-items:center;min-height:28px;line-height:20px!important;padding-top:0!important;padding-bottom:0!important}.lx-batch-config{margin-left:auto;position:relative;font-size:12px}.lx-batch-config>summary{cursor:pointer;list-style:none}.lx-batch-config-body{position:absolute;right:0;top:30px;width:min(400px,75vw);z-index:12;padding:16px;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-primary,#ddd);border-radius:8px;box-shadow:0 6px 20px #0002}.lx-batch-footer{display:flex;gap:12px;border-top:1px solid var(--dsw-alias-border-primary,#ddd);padding-top:8px;margin-top:10px;font-size:12px}.lx-batch-overview .lx-matrix-svg{max-height:min(560px,60vh)}.lx-fullscreen-dialog[open] .lx-explain .lx-batch-overview .lx-matrix-svg{max-height:max(260px,calc(100dvh - 330px))}`}</style>
    <div className="lx-batch-toolbar"><div className="lx-plot-tabs" aria-label="解释图表"><button type="button" data-lx-batch="distribution" aria-pressed={tab==='distribution'&&view==='visual'}>影响因子热力图</button><button type="button" data-lx-batch="sample" aria-pressed={tab==='sample'&&view==='visual'}>单条解释</button></div><details className="lx-batch-config"><summary>筛选与分组</summary><div className="lx-batch-config-body"><ExplanationFilter embedded data={data} value={filter} onApply={applyFilter}/>
    {groups&&<div className="lx-analysis-toolbar"><label>快捷分组 <ExplanationHelp label="快捷分组说明"><p>将本次已解释的全部样本按预测值从小到大排列，取中间值作为分界；样本数为偶数时，取中间两个值的平均数。</p><p>本次采用{groups.label}，分界为 {number(groups.median)}{data.unit ? ` ${data.unit}` : ''}。低于分界的 {groups.low.samples?.length ?? 0} 条归低预测组，等于或高于分界的 {groups.high.samples?.length ?? 0} 条归高预测组；两组数量不一定相等。</p><p>选择“高低预测组对比”，可比较两组的影响因子热力图和平均贡献。高低只表示预测值大小，不代表质量等级或预测准确程度。</p><p>优先使用原预测；原预测不完整时，统一使用解释时预测。切换快捷分组会清除手动筛选，不会重新调用模型。</p></ExplanationHelp><select aria-label="预测分组" data-lx-prediction-group value={group} onChange={()=>{}}><option value="all">全部样本</option><option value="low">低于{groups.label}中位数</option><option value="high">不低于{groups.label}中位数</option><option value="compare">高低预测组对比</option></select></label><span className="lx-explain-foot">按{groups.label} {number(groups.median)} 分组；不是质量等级</span></div>}
    </div></details><ExplanationExport filename={`${data.target}-解释${active ? '-筛选对比' : ''}`} build={theme => tab==='sample'&&selectedSample?singleContributionExportSvg(sampleView(data,selectedSample),theme):group==='compare'&&groups?contributionExportSvg(groups.high,groups.low,`低预测组 / 高预测组；分界 ${groups.median}`,theme,['低预测组','高预测组']):contributionExportSvg(data,active||group!=='all'?visible:undefined,group==='all'?description:`${group==='low'?'低':'高'}预测组`,theme)}/></div>
    {active && <div className="lx-filter-summary"><strong>命中 {samples.length} 个样本 · 覆盖率 {allSamples.length ? number(samples.length / allSamples.length * 100) : 0}%</strong><span>{description}</span></div>}
    {showPredictionCheck && <PredictionCheck data={tab==='sample' && selectedSample ? {...data, samples:[selectedSample]} : visible}/>}
    {showRaw ? <ExplanationDataTable data={visible}/> : <>

    <div className="lx-batch-overview" style={{display:tab==='distribution'?'block':'none'}}>{group==='compare'&&groups?<div className="lx-matrix-comparison lx-prediction-comparison"><p className="lx-explain-foot">两组共用贡献色阶与均值轴；低组 {groups.low.samples.length} 行，高组 {groups.high.samples.length} 行。</p><ContributionHeatmap data={groups.low} scope="低预测组" scales={scales}/><ContributionHeatmap data={groups.high} scope="高预测组" scales={scales}/></div>:<div className={active ? 'lx-matrix-comparison' : ''}>
      <ContributionHeatmap data={visible} scope={group==='low'?'低预测组':group==='high'?'高预测组':active ? '当前筛选' : '全部'} scales={scales}/>
      {active && <ContributionHeatmap data={data} scope="全样本" scales={scales}/>}
    </div>}</div>{tab==='sample' && (selectedSample ? <>
      <LocalExplanation key={selectedSample.row_number} data={sampleView(data, selectedSample)} controls={<div className="lx-sample-control"><label>选择样本 <select data-lx-sample-select value={selected ?? 0} onChange={() => {}} aria-label="选择原始样本行">{allSamples.map(s => <option value={s.row_number} key={s.row_number}>{sampleLabel(s, data)}</option>)}</select></label><button type="button" data-lx-batch="sample-prev" disabled={selected===allSamples[0]?.row_number} aria-label="上一个样本">←</button><button type="button" data-lx-batch="sample-next" disabled={selected===allSamples[allSamples.length-1]?.row_number} aria-label="下一个样本">→</button></div>} />
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
    </>)}
    </>}

  </div>
}
