/**
 * [INPUT]: 已验证贡献矩阵与用户输入的行号、预测、特征值条件。
 * [OUTPUT]: 条件校验、原始行筛选和描述；预测标签遵循尺度契约。
 * [POS]: 批量筛选纯函数；不补造缺失原值，不重编号样本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { explanationPrediction, type ExplanationData, type Sample } from './explanation-data'

export interface SampleFilter { rowFrom: string; rowTo: string; field: string; min: string; max: string; equals: string }
export const emptyFilter: SampleFilter = { rowFrom: '', rowTo: '', field: '', min: '', max: '', equals: '' }
function numericValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
const present = (value: unknown) => value !== undefined && value !== null && !(typeof value === 'string' && !value.trim())
export function filterFields(data: ExplanationData) {
  const samples = data.samples ?? []
  const fields = [{ key: 'prediction', label: explanationPrediction(data).label, values: samples.map(s => s.prediction) }, ...(data.feature_names ?? []).map((name, i) => ({ key: `feature:${i}`, label: data.labels?.[name] ?? name, values: samples.map(s => s.feature_values?.[i]) }))]
  return fields.filter(f => f.values.some(present)).map(f => ({ ...f,
    numeric: !(f.key === 'prediction' && data.task_type === 'classification') && f.values.filter(present).every(v => numericValue(v) !== null),
  }))
}
export function filterActive(filter: SampleFilter) { return !!(filter.rowFrom || filter.rowTo || (filter.field && (filter.min || filter.max || filter.equals))) }
export function filterError(filter: SampleFilter, data: ExplanationData) {
  const bounds = [['起始行', filter.rowFrom, true], ['结束行', filter.rowTo, true], ['最小值', filter.min, false], ['最大值', filter.max, false]] as const
  for (const [label, value, integer] of bounds) {
    if (value.trim() && (!Number.isFinite(Number(value)) || (integer && (!Number.isInteger(Number(value)) || Number(value) < 1)))) return `${label}请输入${integer ? '大于 0 的整数' : '有限数值'}`
  }
  if (filter.rowFrom && filter.rowTo && Number(filter.rowFrom) > Number(filter.rowTo)) return '起始行不能大于结束行'
  if (filter.min && filter.max && Number(filter.min) > Number(filter.max)) return '最小值不能大于最大值'
  if (filter.field && !filterFields(data).some(f => f.key === filter.field)) return '当前结果未提供此字段的原值'
  return ''
}
export function filterSamples(data: ExplanationData, filter: SampleFilter): Sample[] {
  if (filterError(filter, data)) return []
  const field = filterFields(data).find(f => f.key === filter.field)
  return (data.samples ?? []).filter(s => {
    if (filter.rowFrom && s.row_number < Number(filter.rowFrom)) return false
    if (filter.rowTo && s.row_number > Number(filter.rowTo)) return false
    if (!field || (!filter.min && !filter.max && !filter.equals)) return true
    const value = filter.field === 'prediction' ? s.prediction : s.feature_values?.[Number(filter.field.split(':')[1])]
    if (!present(value)) return false
    if (field.numeric) {
      const number = numericValue(value)
      return number !== null && (!filter.min || number >= Number(filter.min)) && (!filter.max || number <= Number(filter.max))
    }
    return String(value) === filter.equals
  })
}
export function filterDescription(filter: SampleFilter, data: ExplanationData) {
  const parts: string[] = []
  if (filter.rowFrom || filter.rowTo) parts.push(`${data.task_type === 'timeseries' ? '预测步' : '原始行'} ${filter.rowFrom || '1'}–${filter.rowTo || '末尾'}`)
  const field = filterFields(data).find(f => f.key === filter.field)
  if (field && (filter.min || filter.max || filter.equals)) parts.push(field.numeric ? `${field.label} ${filter.min || '−∞'} 至 ${filter.max || '+∞'}` : `${field.label} = ${filter.equals}`)
  return parts.join(' · ')
}
