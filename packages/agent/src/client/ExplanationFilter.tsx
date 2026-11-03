/**
 * [INPUT]: 可用字段与已应用筛选；explanation-filter 的校验。
 * [OUTPUT]: 可嵌入配置面板或按需展开的行范围、数值范围或类别筛选。
 * [POS]: 批量视图工具栏；原生事件兼容宿主，提交后才更新图表。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'
import type { ExplanationData } from './explanation-data'
import { emptyFilter, filterActive, filterError, filterFields, type SampleFilter } from './explanation-filter'

export function ExplanationFilter({ data, value, onApply, embedded = false }: { embedded?: boolean; data: ExplanationData; value: SampleFilter; onApply: (value: SampleFilter) => void }) {
  const root = useRef<HTMLDivElement>(null), [open, setOpen] = useState(false), [draft, setDraft] = useState(value), [error, setError] = useState('')
  const fields = filterFields(data), field = fields.find(f => f.key === draft.field)
  useEffect(() => {
    const element = root.current
    const apply = () => {
      const value = { ...draft, rowFrom: draft.rowFrom.trim(), rowTo: draft.rowTo.trim(), min: draft.min.trim(), max: draft.max.trim() }
      const message = filterError(value, data); setError(message)
      if (!message) onApply(value)
    }
    const update = (event: Event) => {
      const input = event.target as HTMLInputElement
      if (!input.matches('[data-lx-filter-field]')) return
      const key = input.dataset.lxFilterField as keyof SampleFilter
      setDraft(v => key === 'field' ? { ...v, field: input.value, min: '', max: '', equals: '' } : { ...v, [key]: input.value })
      setError('')
    }
    const click = (event: Event) => {
      const action = (event.target as Element).closest<HTMLElement>('[data-lx-filter-action]')?.dataset.lxFilterAction
      if (action === 'toggle') setOpen(v => !v)
      if (action === 'reset') { setDraft(emptyFilter); onApply(emptyFilter); setError('') }
      if (action === 'apply') apply()
    }
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Enter' && (event.target as Element).matches('input')) { event.preventDefault(); apply() } }
    element?.addEventListener('input', update); element?.addEventListener('change', update); element?.addEventListener('click', click); element?.addEventListener('keydown', keydown)
    return () => { element?.removeEventListener('input', update); element?.removeEventListener('change', update); element?.removeEventListener('click', click); element?.removeEventListener('keydown', keydown) }
  }, [draft, data, onApply])
  const input = (key: keyof SampleFilter, label: string, placeholder: string) => <input data-lx-filter-field={key} value={draft[key]} onChange={() => {}} aria-label={label} placeholder={placeholder} inputMode="decimal" />
  return <div className="lx-filter" ref={root}>
    {!embedded && <button type="button" data-lx-filter-action="toggle" aria-expanded={open} className="lx-small-button">筛选样本{filterActive(value) ? ' · 已应用' : ''} <span aria-hidden="true">{open ? '⌃' : '⌄'}</span></button>}
    {(embedded || open) && <div className="lx-filter-panel">
      <label><span>{data.task_type === 'timeseries' ? '预测步范围' : '原始行范围'}</span><div className="lx-filter-range">{input('rowFrom', '起始行', '起始')}<span>—</span>{input('rowTo', '结束行', '结束')}</div></label>
      <label><span>按值筛选</span><select data-lx-filter-field="field" value={draft.field} onChange={() => {}} aria-label="筛选字段"><option value="">不限</option>{fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
      {field && <label><span>{field.numeric ? '数值范围' : '类别'}</span>{field.numeric ? <div className="lx-filter-range">{input('min', '最小值', '最小')}<span>—</span>{input('max', '最大值', '最大')}</div> : <select data-lx-filter-field="equals" value={draft.equals} onChange={() => {}} aria-label="筛选类别"><option value="">不限</option>{[...new Set(field.values.filter(v => v !== undefined && v !== null).map(String))].sort().map(v => <option key={v} value={v}>{v}</option>)}</select>}</label>}
      <div className="lx-filter-actions"><button type="button" data-lx-filter-action="apply" className="lx-small-button">应用</button><button type="button" data-lx-filter-action="reset">清除</button></div>
      {error && <p className="lx-filter-error" role="alert">{error}</p>}
    </div>}
  </div>
}
