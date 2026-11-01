/**
 * [INPUT]: 单条预测及特征贡献。
 * [OUTPUT]: 单条可视化、原始数据和 SVG / PNG 导出。
 * [POS]: 单条解释外壳；复用批量的数据表和导出契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { singleSampleMatrix, type ExplanationData } from './explanation-data'
import { LocalExplanation } from './LocalExplanation'
import { ExplanationDataTable } from './ExplanationDataTable'
import { ExplanationExport } from './ExplanationExport'
import { contributionExportSvg } from './explanation-export'

export function ExplanationSingle({ data }: { data: ExplanationData }) {
  const root = useRef<HTMLDivElement>(null), [view, setView] = useState('visual')
  const matrix = useMemo(() => singleSampleMatrix(data), [data])
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => { const target = event.target as Element, tab = target.closest<HTMLElement>('[data-lx-single-view]')?.dataset.lxSingleView; if (tab) setView(tab); if (target.closest('[data-lx-batch="row"]')) setView('visual') }
    element?.addEventListener('click', click); return () => element?.removeEventListener('click', click)
  }, [])
  return <div ref={root}>
    <div className="lx-analysis-toolbar"><div className="lx-plot-tabs" aria-label="解释数据视图"><button type="button" data-lx-single-view="visual" aria-pressed={view === 'visual'}>可视化</button><button type="button" data-lx-single-view="raw" aria-pressed={view === 'raw'}>原始数据</button></div><ExplanationExport filename={`${data.target}-单样本解释`} build={theme => contributionExportSvg(matrix, undefined, `原始行 ${data.row_number ?? 1}`, theme)}/></div>
    {view === 'visual' ? <LocalExplanation data={data}/> : <ExplanationDataTable data={matrix}/>}
  </div>
}
