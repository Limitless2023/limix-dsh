/**
 * [INPUT]: 依赖 ./forecast-csv.ts 的 splitCsvLine（CSV 切分实现全仓只此一份）
 * [OUTPUT]: 对外提供 pickColumn / pickPredLabel 两个取列函数，
 *           buildConfusion（分类 → 混淆矩阵 + 逐类指标）与
 *           buildScatter（回归 → 散点 + MAE/RMSE/R²）两个统计函数
 * [POS]: limix-ui 图表数据层的**分类/回归分支**，对位 forecast-csv.ts 的时序分支。
 *        指标在浏览器本地算而非取平台评估接口，是刻意取舍：标准工作流
 *        （limix-predict-workflow v2.5）明确"预测走 limix-api、评估走本地脚本"，
 *        平台评估接口不在常规链路上；本地算则对既有 agent 行为零要求。
 *        列名契约来自 limix-api SKILL：分类结果只留 样本ID + pred_probs_N + pred_label
 *        （真值列被平台丢弃，故混淆矩阵须另取预测输入文件按行序对齐）；
 *        回归结果保留原预测数据列 + pred_label（真值同表，单次取数即可）。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { splitCsvLine } from './forecast-csv.ts'

/** 混淆矩阵与逐类指标；classes 为真值与预测的并集，已排序 */
export interface ConfusionData {
  classes: string[]
  /** matrix[真实类下标][预测类下标] = 计数 */
  matrix: number[][]
  n: number
  correct: number
  accuracy: number
  perClass: Array<{
    label: string
    /** 该类的真实样本数 */
    support: number
    precision: number
    recall: number
    f1: number
  }>
  /** 多数类占比——分类的"什么都不学"基线，Accuracy 必须与它对照才有意义 */
  majorityBaseline: number
}

/** 回归散点与误差指标 */
export interface ScatterData {
  points: Array<{ t: number; p: number }>
  /** 配对总数 */
  n: number
  /** 实际画出的点数（超过上限时抽样） */
  shown: number
  mae: number
  rmse: number
  /** 决定系数；真值方差为 0 时为 null（此时 R² 无定义，不可填 0 冒充） */
  r2: number | null
  min: number
  max: number
}

/** 类别数上限：超过则不画矩阵（格子退化成噪点，读不出信息） */
const MAX_CLASSES = 12
/** 散点上限：超过则等距抽样，避免上万点拖垮 SVG */
const MAX_POINTS = 1500

function rows(text: string): { header: string[]; body: string[][] } | null {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return null
  const header = splitCsvLine(lines[0])
  const body = lines.slice(1).map(splitCsvLine).filter(r => r.length === header.length)
  return body.length ? { header, body } : null
}

/** 按列名取整列原始字符串；列不存在返回 null */
export function pickColumn(text: string, col: string): string[] | null {
  const t = rows(text)
  if (!t) return null
  const i = t.header.indexOf(col)
  return i < 0 ? null : t.body.map(r => r[i])
}

/**
 * 取分类/回归结果的预测列。优先字面 pred_label（平台契约），
 * 退而求其次取首个非分位的 pred_ 列（防平台日后改名导致整块失效）
 */
export function pickPredLabel(text: string): string[] | null {
  const t = rows(text)
  if (!t) return null
  let i = t.header.indexOf('pred_label')
  if (i < 0) i = t.header.findIndex(h => h.startsWith('pred_') && !h.startsWith('pred_q') && !h.startsWith('pred_probs_'))
  return i < 0 ? null : t.body.map(r => r[i])
}

/** 标签归一：去首尾空白与包裹引号，使 "A" 与 A 视为同类 */
function norm(s: string): string {
  return s.trim().replace(/^"(.*)"$/, '$1')
}

/**
 * 真值/预测两列 → 混淆矩阵。
 * 长度不等（对齐失败）、类别数超上限、或有效配对为空时返回 null，渲染方零回归降级。
 */
export function buildConfusion(truthRaw: string[], predRaw: string[]): ConfusionData | null {
  if (truthRaw.length !== predRaw.length || !truthRaw.length) return null
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < truthRaw.length; i++) {
    const t = norm(truthRaw[i])
    const p = norm(predRaw[i])
    // 任一侧缺失即整对丢弃——补默认值会凭空制造错例
    if (!t || !p) continue
    pairs.push([t, p])
  }
  if (!pairs.length) return null

  const set = new Set<string>()
  for (const [t, p] of pairs) { set.add(t); set.add(p) }
  if (set.size > MAX_CLASSES) return null
  // 数值型标签按数值序，否则按字典序——0/1/2 不应排成 0/1/10/2
  const classes = [...set].sort((a, b) => {
    const na = Number(a), nb = Number(b)
    return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b)
  })
  const idx = new Map(classes.map((c, i) => [c, i]))

  const matrix = classes.map(() => classes.map(() => 0))
  for (const [t, p] of pairs) matrix[idx.get(t)!][idx.get(p)!]++

  const n = pairs.length
  let correct = 0
  for (let i = 0; i < classes.length; i++) correct += matrix[i][i]

  const perClass = classes.map((label, i) => {
    const support = matrix[i].reduce((s, v) => s + v, 0)
    const predicted = matrix.reduce((s, row) => s + row[i], 0)
    const tp = matrix[i][i]
    const precision = predicted ? tp / predicted : 0
    const recall = support ? tp / support : 0
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
    return { label, support, precision, recall, f1 }
  })

  return {
    classes, matrix, n, correct,
    accuracy: correct / n,
    perClass,
    majorityBaseline: Math.max(...perClass.map(c => c.support)) / n,
  }
}

/**
 * 真值/预测两列 → 散点与误差指标。
 * 长度不等、无有效数值对时返回 null。点数超上限按等距抽样（保留分布形状，
 * 但指标仍用**全量**计算——抽样只影响画什么，不影响算什么）。
 */
export function buildScatter(truthRaw: string[], predRaw: string[]): ScatterData | null {
  if (truthRaw.length !== predRaw.length || !truthRaw.length) return null
  const all: Array<{ t: number; p: number }> = []
  for (let i = 0; i < truthRaw.length; i++) {
    const t = Number(norm(truthRaw[i]))
    const p = Number(norm(predRaw[i]))
    if (Number.isFinite(t) && Number.isFinite(p)) all.push({ t, p })
  }
  if (!all.length) return null

  const n = all.length
  let ae = 0, se = 0, sum = 0
  for (const { t, p } of all) { ae += Math.abs(p - t); se += (p - t) ** 2; sum += t }
  const mean = sum / n
  let ssTot = 0
  for (const { t } of all) ssTot += (t - mean) ** 2
  const r2 = ssTot > 0 ? 1 - se / ssTot : null

  const step = Math.ceil(n / MAX_POINTS)
  const points = step > 1 ? all.filter((_, i) => i % step === 0) : all

  const vals = all.flatMap(({ t, p }) => [t, p])
  return {
    points, n, shown: points.length,
    mae: ae / n,
    rmse: Math.sqrt(se / n),
    r2,
    min: Math.min(...vals),
    max: Math.max(...vals),
  }
}
