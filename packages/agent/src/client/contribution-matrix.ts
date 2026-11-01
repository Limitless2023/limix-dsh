/**
 * [INPUT]: 已校验的完整样本贡献矩阵与原始行号。
 * [OUTPUT]: 全量矩阵、带符号均值和共用尺度；中性为零，缺方向不补零。
 * [POS]: ContributionHeatmap 的纯数据转换；保留样本和列顺序，不抽样。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { knownDirection, type ExplanationData } from './explanation-data'

export function contributionMatrix(data: ExplanationData) {
  const samples = data.samples ?? [], names = data.feature_names ?? []
  const maximum = samples.reduce((m, s) => s.scores.reduce((n, v) => Math.max(n, Math.abs(v)), m), 0)
  const rows = samples.map((sample, sampleIndex) => ({
    sampleIndex, rowNumber: sample.row_number,
    cells: names.map((name, featureIndex) => ({ name, featureIndex, score: sample.scores[featureIndex], direction: sample.directions[featureIndex] })),
  }))
  const features = names.map((name, featureIndex) => {
    let signed = 0, unknownCount = 0
    for (const sample of samples) {
      const magnitude = Math.abs(sample.scores[featureIndex]), direction = sample.directions[featureIndex]
      if (knownDirection(direction)) signed += magnitude * direction
      else if (magnitude !== 0) unknownCount++
    }
    return {
      name, featureIndex, label: data.labels?.[name] ?? name, unknownCount,
      mean: samples.length && !unknownCount ? signed / samples.length : null,
    }
  })
  const ranking = [...features].sort((a, b) => Number(a.mean === null) - Number(b.mean === null) || Math.abs(b.mean ?? 0) - Math.abs(a.mean ?? 0) || a.featureIndex - b.featureIndex)
  return { rows, ranking, maximum, cellCount: samples.length * names.length }
}

export function contributionScales(...groups: ExplanationData[]) {
  const matrices = groups.map(contributionMatrix)
  return {
    maximum: Math.max(0, ...matrices.map(m => m.maximum)),
    meanMaximum: Math.max(0, ...matrices.flatMap(m => m.ranking.map(f => Math.abs(f.mean ?? 0)))),
  }
}
