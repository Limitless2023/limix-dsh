/**
 * [INPUT]: CLI 校验后的解释数据。
 * [OUTPUT]: 解释类型、稳定任务身份与文件校验、方向语义和统一色阶。
 * [POS]: 解释视图的数据契约；未知尺度不套用业务单位。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export interface Factor { name: string; label: string; score: number; direction: number | null }
export interface Sample { row_number: number; prediction?: number | string; prior_prediction?: number | string; prediction_delta?: number; scores: number[]; directions: Array<number | null>; feature_values?: Array<string | number | boolean | null>; step?: number; timestamp?: string }
export interface Edge { source: string; target: string; weight: number }
export interface ExplanationData {
  mode: 'local' | 'directed' | 'undirected'
  task_type?: string
  result_version_id?: string
  source_task_id?: string
  prediction_scale?: string
  prediction_label?: string
  target_unit?: string
  horizon?: number
  context_size?: number
  feature_catalog?: Array<{ name: string; source?: string; group?: string }>
  step?: number
  timestamp?: string
  target: string
  target_label?: string
  unit?: string
  row_number?: number
  row_numbers?: number[]
  input_rows?: number
  prediction?: number | string
  prior_prediction?: number | string
  prediction_delta?: number
  labels?: Record<string, string>
  features?: Factor[]
  feature_names?: string[]
  feature_values?: Array<string | number | boolean | null>
  samples?: Sample[]
  requested_count?: number
  explained_count?: number
  missing_rows?: number[]
  mapping?: 'sample_index' | 'input_order' | 'forecast_steps'
  detail_path?: string
  nodes?: string[]
  edges?: Edge[]
  risks?: unknown[]
}
export const number = (v: number) => Number(v.toFixed(4)).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
export const contributionColors = { negative: '#4168a9', positive: '#248575', neutral: '#697680', unknown: '#848991' }
export const contributionBase = 'var(--dsw-alias-background-primary, #fff)'
export const knownDirection = (direction: number | null): direction is -1 | 0 | 1 => direction === -1 || direction === 0 || direction === 1
export const directionLabel = (direction: number | null) => direction === 1 ? '正向' : direction === -1 ? '负向' : direction === 0 ? '中性' : '方向未定'
export const contributionColor = (direction: number | null) => direction === 1 ? contributionColors.positive : direction === -1 ? contributionColors.negative : direction === 0 ? contributionColors.neutral : contributionColors.unknown
export function contributionFill(score: number, direction: number | null, maximum: number) {
  const strength = maximum > 0 ? Math.min(1, Math.abs(score) / maximum) : 0
  return `color-mix(in srgb, ${contributionColor(direction)} ${100 * strength}%, ${contributionBase})`
}

/** 当前时序解释没有可核验的业务尺度契约，旧文件同样保守展示。 */
export function explanationPrediction(data: ExplanationData) {
  const unverified = data.task_type === 'timeseries' || data.prediction_scale === 'unverified'
  return { label: unverified ? '解释模型输出' : '解释时预测', unit: unverified ? '' : data.unit, comparable: !unverified }
}

/** 仅跟踪会改变文件归属的字段；新对象引用和展示文案不触发重读。 */
export function batchDetailKey(data: ExplanationData) {
  return JSON.stringify([data.detail_path, data.mode, data.target, data.task_type, data.mapping,
    data.result_version_id, data.source_task_id, data.input_rows, data.horizon,
    data.requested_count, data.explained_count, data.feature_names,
    data.row_numbers ?? data.samples?.map(sample => sample.row_number)])
}

export function validBatchDetail(value: any, expected: ExplanationData): value is ExplanationData {
  const names = value?.feature_names, samples = value?.samples
  const identity = ['task_type', 'mapping', 'result_version_id', 'source_task_id', 'input_rows', 'horizon'] as const
  if (!value || identity.some(key => expected[key] !== undefined && value[key] !== expected[key])) return false
  if (value.task_type !== expected.task_type) return false
  if (expected.feature_names && (!Array.isArray(names) || names.length !== expected.feature_names.length || names.some((name: unknown, index: number) => name !== expected.feature_names![index]))) return false
  for (const limit of [value.input_rows, value.horizon]) if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) return false
  const rowLimit = value.task_type === 'timeseries' ? value.horizon ?? value.input_rows : value.input_rows
  const requestedRows = expected.row_numbers ?? expected.samples?.map(sample => sample.row_number)
  const expectedRows = requestedRows ? new Set(requestedRows) : undefined
  return value.mode === 'local' && value.target === expected.target && value.requested_count === expected.requested_count
    && value.explained_count === expected.explained_count && Array.isArray(names) && names.length > 0
    && names.every((n: unknown) => typeof n === 'string') && new Set(names).size === names.length
    && Array.isArray(samples) && samples.length === expected.explained_count
    && new Set(samples.map(s => s?.row_number)).size === samples.length
    && samples.every(s => Number.isInteger(s?.row_number) && s.row_number > 0
      && (rowLimit === undefined || s.row_number <= rowLimit)
      && (!expectedRows || expectedRows.has(s.row_number))
      && (typeof s.prediction === 'string' || Number.isFinite(s.prediction) || (value.task_type === 'timeseries' && s.prediction === undefined))
      && (s.step === undefined || (Number.isInteger(s.step) && s.step > 0))
      && (value.task_type !== 'timeseries' || s.step === undefined || (s.step === s.row_number && (rowLimit === undefined || s.step <= rowLimit)))
      && (s.timestamp === undefined || typeof s.timestamp === 'string')
      && (s.feature_values === undefined || (Array.isArray(s.feature_values) && s.feature_values.length === names.length && s.feature_values.every((v: unknown) => v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)))))
      && Array.isArray(s.scores) && s.scores.length === names.length && s.scores.every(Number.isFinite)
      && Array.isArray(s.directions) && s.directions.length === names.length && s.directions.every((v: unknown) => v === null || v === 0 || v === 1 || v === -1))
}

export function sampleLabel(sample: Pick<Sample, 'row_number' | 'step' | 'timestamp'>, data: Pick<ExplanationData, 'task_type'>): string {
  const label = data.task_type === 'timeseries' ? `第 ${sample.step ?? sample.row_number} 步` : `第 ${sample.row_number} 行`
  return sample.timestamp ? `${label} · ${sample.timestamp}` : label
}

export function sampleView(data: ExplanationData, sample: Sample): ExplanationData {
  return { ...data, ...sample, features: (data.feature_names ?? []).map((name, i) => ({
    name, label: data.labels?.[name] ?? name, score: sample.scores[i], direction: sample.directions[i],
  })).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)) }
}

/** 单行结果优先沿用服务顺序；显示排名不能改变原值对应的特征。 */
export function singleSampleMatrix(data: ExplanationData): ExplanationData {
  const existing = data.samples?.find(sample => sample.row_number === (data.row_number ?? 1))
  if (existing && data.feature_names?.length) return { ...data, samples: [existing] }
  const features = (data.features ?? []).filter(feature => Number.isFinite(feature.score))
  const values = data.feature_values && data.feature_names
    ? features.map(feature => data.feature_values![data.feature_names!.indexOf(feature.name)] ?? null) : undefined
  return { ...data, feature_names: features.map(feature => feature.name),
    labels: { ...data.labels, ...Object.fromEntries(features.map(feature => [feature.name, feature.label])) },
    samples: [{ row_number: data.row_number ?? 1, step: data.step, timestamp: data.timestamp, prediction: data.prediction,
      scores: features.map(feature => feature.score), directions: features.map(feature => feature.direction), feature_values: values }],
  }
}
