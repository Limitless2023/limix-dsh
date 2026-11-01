/**
 * [INPUT]: 完整贡献样本或关系边；可选筛选后的样本子集。
 * [OUTPUT]: 原始数值表；保留行步、时间、原值、中性和缺失方向。
 * [POS]: 解释的原始数据视图；查询不会改变图表统计范围。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { directionLabel, explanationPrediction, sampleLabel, type ExplanationData } from './explanation-data'

export function explanationRecords(data: ExplanationData) {
  if (data.mode !== 'local') return (data.edges ?? []).map((e, i) => ({ key: `${i}:${e.source}:${e.target}`, row: undefined, values: [data.labels?.[e.source] ?? e.source, e.source, data.labels?.[e.target] ?? e.target, e.target, String(e.weight)] }))
  return (data.samples ?? []).flatMap(s => (data.feature_names ?? []).map((name, index) => ({ key: `${s.row_number}:${name}`, row: s.row_number, values: [sampleLabel(s, data), s.prediction === undefined ? '—' : String(s.prediction), data.labels?.[name] ?? name, name, s.feature_values?.[index] === undefined || s.feature_values[index] === null ? '—' : String(s.feature_values[index]), String(s.scores[index]), directionLabel(s.directions[index])] })))
}
export function ExplanationDataTable({ data }: { data: ExplanationData }) {
  const root = useRef<HTMLDivElement>(null), [query, setQuery] = useState(''), [page, setPage] = useState(0)
  const records = useMemo(() => explanationRecords(data), [data])
  const filtered = useMemo(() => { const term = query.trim().toLocaleLowerCase(); return term ? records.filter(r => r.values.some(v => v.toLocaleLowerCase().includes(term))) : records }, [records, query])
  const size = 25, pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages - 1)
  useEffect(() => {
    const element = root.current
    const input = (event: Event) => { if ((event.target as Element).matches('[data-lx-raw-search]')) { setQuery((event.target as HTMLInputElement).value); setPage(0) } }
    const click = (event: Event) => { const action = (event.target as Element).closest<HTMLElement>('[data-lx-raw-page]')?.dataset.lxRawPage; if (action) setPage(p => Math.min(pages - 1, Math.max(0, p + (action === 'next' ? 1 : -1)))) }
    element?.addEventListener('input', input); element?.addEventListener('click', click)
    return () => { element?.removeEventListener('input', input); element?.removeEventListener('click', click) }
  }, [pages])
  const headings = data.mode === 'local' ? [data.task_type === 'timeseries' ? '预测步 / 时间' : '原始行', explanationPrediction(data).label, '影响因子', '字段名', '特征原值', '贡献分数', '方向'] : ['起点', '起点字段', '终点', '终点字段', '关系分数']
  return <div ref={root} className="lx-raw">
    <div className="lx-raw-toolbar"><input data-lx-raw-search value={query} onChange={() => {}} aria-label="检索解释数据" placeholder="检索行号、字段或数值"/><span>{filtered.length} / {records.length} 条记录</span></div>
    <div className="lx-raw-scroll"><table className="lx-raw-table"><thead><tr>{headings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
      {filtered.slice(current * size, (current + 1) * size).map(record => <tr key={record.key}>{record.values.map((v, i) => <td key={i}>{i === 0 && record.row !== undefined ? <button type="button" data-lx-batch="row" data-row={record.row}>{v} ↗</button> : v}</td>)}</tr>)}
    </tbody></table></div>
    {!filtered.length && <p className="lx-explain-foot">没有符合条件的数据。</p>}
    <div className="lx-heatmap-footer"><span>展示 {filtered.length ? current * size + 1 : 0}–{Math.min((current + 1) * size, filtered.length)} 条</span><div><button type="button" data-lx-raw-page="previous" aria-label="上一页原始数据" disabled={current === 0}>←</button><span>{current + 1} / {pages}</span><button type="button" data-lx-raw-page="next" aria-label="下一页原始数据" disabled={current === pages - 1}>→</button></div></div>
  </div>
}
