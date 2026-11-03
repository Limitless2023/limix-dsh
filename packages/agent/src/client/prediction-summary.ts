/**
 * [INPUT]: 结果 CSV 的预测日期、结果行数与实际评估数量。
 * [OUTPUT]: forecastSummary，紧凑预测范围与评估文案；不将未知频率称为天。
 * [POS]: 工具卡时序展示口径；只读已返回的数据，不计算评估指标。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export function forecastSummary(dates: string[] | undefined, rows: unknown, evaluated: unknown) {
  const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
  const total = dates?.length || (count(rows) ? rows : undefined)
  const daily = !!dates && dates.length > 1 && dates.every((date, i) => {
    const timestamp = Date.parse(date)
    return Number.isFinite(timestamp) && (!i || timestamp - Date.parse(dates[i - 1]) === 86400000)
  })
  const unit = daily ? '天' : '步'
  const range = dates?.length ? `${dates[0]} — ${dates[dates.length - 1]}` : total !== undefined ? `预测 ${total} 步` : ''
  const evaluation = count(evaluated)
    ? total !== undefined && evaluated < total ? `已评估 ${evaluated}/${total} ${unit}` : `评估 ${evaluated} ${unit}`
    : ''
  return { range, evaluation }
}
