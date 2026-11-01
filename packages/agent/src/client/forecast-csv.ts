/**
 * [INPUT]: 无外部依赖；输入为 limix CLI 的结果/训练 CSV 文本
 * [OUTPUT]: 对外提供 parseForecastCsv（结果文件 → 预测/分位序列）、
 *           parseTrainTail（历史尾部）、parseForecastTruth（日期对齐的本地真值），
 *           以及 splitCsvLine（供 eval-csv.ts 复用，CSV 切分只此一份实现）
 * [POS]: limix-ui 图表数据层的**时序分支**；分类/回归分支在 eval-csv.ts。
 *        列名契约来自 LimiX 平台结果文件实测
 *        （日期, pred_<目标列>, pred_q10_<目标列>, pred_q50_<目标列>, pred_q90_<目标列>）；
 *        三类任务共用 pred_ 前缀，故本文件负责把非时序结果挡在门外
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface ForecastSeries {
  dates: string[]
  pred: number[]
  p10?: number[]
  p90?: number[]
  /** 从 pred_ 列名里还原的目标列名 */
  target?: string
}

/** 最小 CSV 行切分：支持双引号包裹字段（够用即可，结果文件无嵌套引号场景） */
export function splitCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(',')
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

function toNums(rows: string[][], idx: number): number[] {
  return rows.map(r => r[idx]?.trim() ? Number(r[idx]) : NaN)
}

/**
 * 解析 limix 时序结果 CSV。识别不出 pred_ 列时返回 null（渲染方零回归降级）。
 *
 * ⚠️ 必须把分类/回归结果挡在门外：三类任务共用 pred_ 前缀但语义不同——
 * 时序是 `pred_{目标列}`，分类与回归都是字面 `pred_label`。若不区分，
 * `limix download` 一个分类结果（标签为 0/1 等数值）会被画成一条按行序连点的
 * 折线，而分类结果的行序不含时间语义，那条线纯属无中生有。
 * 出现 pred_probs_ 概率列时拒绝作时序图。未指定时序目标时，
 * pred_label 也按分类或回归拒绝；明确指定目标 label 的时序仍可绘制。
 */
export function parseForecastCsv(text: string, target?: string, dateColumn?: string): ForecastSeries | null {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return null
  const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ''))
  if (header.some(h => h.startsWith('pred_probs_'))) return null
  const predIdx = target ? header.indexOf(`pred_${target}`) : header.findIndex(h => h.startsWith('pred_') && !h.startsWith('pred_q'))
  if (predIdx < 0 || (!target && header[predIdx] === 'pred_label')) return null
  const resolvedTarget = header[predIdx].slice('pred_'.length)
  const q10Idx = header.indexOf(`pred_q10_${resolvedTarget}`)
  const q90Idx = header.indexOf(`pred_q90_${resolvedTarget}`)
  const dateIdx = dateColumn ? header.indexOf(dateColumn) : 0
  if (dateIdx < 0) return null
  const rows = lines.slice(1).map(splitCsvLine).filter(r => r.length === header.length)
  if (!rows.length) return null
  const pred = toNums(rows, predIdx)
  if (pred.some(v => !Number.isFinite(v))) return null
  const series: ForecastSeries = {
    dates: rows.map(r => r[dateIdx]),
    pred,
    target: header[predIdx].slice('pred_'.length),
  }
  if (q10Idx >= 0 && q90Idx >= 0) {
    const p10 = toNums(rows, q10Idx)
    const p90 = toNums(rows, q90Idx)
    if (p10.every(Number.isFinite) && p90.every(Number.isFinite)) {
      series.p10 = p10
      series.p90 = p90
    }
  }
  return series
}

/** 从训练 CSV 取目标列尾部 n 点作图表历史段；列缺失/不可数值化返回 null */
export function parseTrainTail(text: string, colTarget: string, n: number, dateColumn?: string): { dates: string[]; values: number[] } | null {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return null
  const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ''))
  const idx = header.indexOf(colTarget)
  if (idx < 0) return null
  const rows = lines.slice(Math.max(1, lines.length - n)).map(splitCsvLine).filter(r => r.length === header.length)
  const values = toNums(rows, idx)
  if (!values.length || values.some(v => !Number.isFinite(v))) return null
  const dateIdx = dateColumn ? header.indexOf(dateColumn) : 0
  return { dates: rows.map(r => r[dateIdx] ?? ''), values }
}

/** 真值仅在日期顺序与预测完全一致时叠加，禁止错位比较。 */
export function parseForecastTruth(text: string, target: string, date: string, dates: string[]): number[] | undefined {
  const lines = text.trim().split(/\r?\n/)
  const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ''))
  const targetIdx = header.indexOf(target), dateIdx = header.indexOf(date)
  if (targetIdx < 0 || dateIdx < 0) return undefined
  const rows = lines.slice(1).map(splitCsvLine)
  if (rows.length !== dates.length || rows.some((r, i) => r[dateIdx]?.trim() !== dates[i]?.trim())) return undefined
  const values = toNums(rows, targetIdx)
  return values.every(Number.isFinite) ? values : undefined
}
