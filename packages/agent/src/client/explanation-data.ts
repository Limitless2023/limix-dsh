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
  selection_method?: string
  selection_seed?: number | null
  excluded_identifiers?: string[]
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
  detail_sha256?: string
  detail_path?: string
  nodes?: string[]
  edges?: Edge[]
  model_type?: string
  graph_backend?: string
  graph_standardize?: boolean
  graph_weights?: number[][]
  graph_threshold?: number | null
  graph_sample_names?: string[]
  graph_samples?: number[][]
  graph_sample_count?: number
  source_sha256?: string
  comparison?: { left: ExplanationData & {label:string}; right: ExplanationData & {label:string}; threshold:number; description:string; records:Array<{source:string;target:string;left_weight:number;right_weight:number;left_present:boolean;right_present:boolean}> }
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
  return JSON.stringify([data.detail_path, data.detail_sha256, data.mode, data.target, data.task_type, data.mapping,
    data.result_version_id, data.source_task_id, data.input_rows, data.horizon,
    data.requested_count, data.explained_count, data.feature_names,
    data.row_numbers ?? data.samples?.map(sample => sample.row_number),
    data.comparison && [data.comparison.left.source_task_id,data.comparison.left.source_sha256,data.comparison.right.source_task_id,data.comparison.right.source_sha256,data.comparison.threshold]])
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

/** 图详情只补原值，不接受其他任务或变量顺序。 */
export function validGraphDetail(value:any,expected:ExplanationData):value is ExplanationData {
  const names=value?.nodes
  return value?.mode===expected.mode && value.target===expected.target && value.source_task_id===expected.source_task_id
    && JSON.stringify(names)===JSON.stringify(expected.nodes) && value.input_rows===expected.input_rows
    && value.source_sha256===expected.source_sha256
    && value.model_type===expected.model_type && value.graph_backend===expected.graph_backend && value.graph_standardize===expected.graph_standardize
    && Array.isArray(value.graph_sample_names) && JSON.stringify(value.graph_sample_names)===JSON.stringify(names)
    && Array.isArray(value.graph_samples) && value.graph_samples.length===expected.graph_sample_count
    && value.graph_samples.length<=2000 && value.graph_samples.every((r:any)=>Array.isArray(r)&&r.length===names.length&&r.every(Number.isFinite))
    && JSON.stringify(value.graph_weights)===JSON.stringify(expected.graph_weights)
}

/** 对比详情须同时匹配两组身份和全部分数；只允许补入原值样本。 */
export function validComparisonDetail(value:any,expected:ExplanationData):value is ExplanationData {
  const c=expected.comparison,v=value?.comparison
  if(!c||!v||value.mode!==expected.mode||value.target!==expected.target||JSON.stringify(value.nodes)!==JSON.stringify(expected.nodes))return false
  if(v.threshold!==c.threshold||v.description!==c.description||JSON.stringify(v.records)!==JSON.stringify(c.records))return false
  return (['left','right'] as const).every(side=>v[side]?.label===c[side].label && validGraphDetail(v[side],c[side]))
}

/** 场景对比回执只传 SHA256；完整内容验证通过后再进入图表。 */
export async function parseComparisonDetail(text: string, expected: ExplanationData): Promise<ExplanationData> {
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('')
  if (digest !== expected.detail_sha256) throw new Error('场景对比文件已变化，请重新生成比较结果')
  const value = JSON.parse(text)
  if (value.mode !== expected.mode || value.target !== expected.target || !validComparisonDetail(value, value)) throw new Error('场景对比文件格式不匹配')
  return value
}
