/**
 * [INPUT]: 已保存的结果文件；Agent 图表、CSV 解析和解释导出函数。
 * [OUTPUT]: renderChart，返回与结果卡共用绘制逻辑的静态图表；缺列时明确提示字段契约。
 * [POS]: 宿主报告的数据适配层；不请求 API，不接受模型手写点阵。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { metricFacts, weekday, type Fact } from './facts'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScatterChart } from '../../../agent/src/client/ScatterChart'
import { ConfusionMatrix } from '../../../agent/src/client/ConfusionMatrix'
import { ForecastChart } from '../../../agent/src/client/ForecastChart'
import { BenchmarkView } from '../../../agent/src/client/BenchmarkView'
import { pickColumn, buildScatter, buildConfusion } from '../../../agent/src/client/eval-csv'
import { parseForecastCsv, parseTrainTail, parseForecastTruth } from '../../../agent/src/client/forecast-csv'
import { singleSampleMatrix, validBatchDetail } from '../../../agent/src/client/explanation-data'
import { contributionMatrix } from '../../../agent/src/client/contribution-matrix'
import { contributionExportSvg, graphExportSvg } from '../../../agent/src/client/explanation-export'

export interface ChartSpec {
  id: string; type: 'regression' | 'classification' | 'forecast' | 'explanation' | 'benchmark'
  title: string; source: string; truth?: string; train?: string; target?: string
  date?: string; id_column?: string; alignment?: 'input_order'; history_points?: number; caption?: string
}
type ReadSource = (path: string, extension: '.csv' | '.json') => Promise<string>

/** 无时区的 ISO 日期时间按 UTC 比较；不允许 Date.parse 自动纠正无效日期。 */
function orderedDates(dates: string[], source: string): number[] {
  const times = dates.map(value => {
    if (!/^\d{4}-\d{2}-\d{2}(?:[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)
      || weekday(value.slice(0, 10)) === '未解析') throw new Error(`${source}日期须为有效 ISO 日期或日期时间`)
    const iso = value.length === 10 ? value + 'T00:00:00Z' : value.replace(' ', 'T') + (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? '' : 'Z')
    const time = Date.parse(iso)
    if (!Number.isFinite(time)) throw new Error(`${source}日期无效`)
    return time
  })
  if (!times.length || times.some((time, i) => i > 0 && time <= times[i - 1])) throw new Error(`${source}日期须严格递增，不能重复或乱序`)
  return times
}

export async function renderChart(chart: ChartSpec, read: ReadSource) {
  if (chart.type === 'explanation') {
    const envelope = JSON.parse(await read(chart.source, '.json')), data = envelope.explanation ?? envelope
    if (envelope.task_status && !['succeeded', 'degraded_succeeded', 'partially_succeeded'].includes(envelope.task_status)) throw new Error('解释未成功，不能生成结果图')
    const statusWarnings = envelope.task_status && envelope.task_status !== 'succeeded' ? ['解释返回部分成功或降级结果；请结合原任务说明解读。'] : []
    if (data.mode === 'local') {
      const matrix = data.samples ? data : singleSampleMatrix(data)
      if (!validBatchDetail(matrix, matrix)) throw new Error('解释视图缺少完整矩阵；请使用 explanation.detail_path 指向的 .view.json')
      const count = matrix.samples!.length, requested = matrix.requested_count ?? count
      const scope = `已解释 ${count} / ${requested} 个${matrix.task_type === 'timeseries' ? '预测步' : '样本'}`
      const warnings = [...statusWarnings, ...(count < requested ? [scope + '，仅展示已返回部分。'] : [])]
      if (matrix.task_type === 'timeseries') warnings.push('贡献分数沿用解释模型尺度，不换算为业务单位。')
      return { html: contributionExportSvg(matrix, undefined, scope), warnings, count, facts: [{ name: '本次解释', value: count }, { name: '请求解释', value: requested }, { name: '输入总行数', value: matrix.input_rows ?? '未返回' }, { name: '特征数量', value: matrix.feature_names?.length ?? 0 }, { name: '适用范围', value: count === matrix.input_rows ? '全部输入样本' : '仅本次已解释样本，不能代表全部输入' }, ...contributionMatrix(matrix).ranking.slice(0, 5).map(f => ({name: f.label + '（' + f.name + '）', value: f.mean === null ? '方向未定' : Number(f.mean.toFixed(6)), meaning: '本次已解释样本的带正负平均贡献；' + [1, -1, 0, null].map(direction => `${direction === 1 ? '正向' : direction === -1 ? '负向' : direction === 0 ? '中性' : '方向未知'} ${matrix.samples!.filter(sample => sample.directions[f.featureIndex] === direction).length} 个`).join('，') + '；不表示干预收益'}))] as Fact[] }
    }
    if (!['directed', 'undirected'].includes(data.mode) || !Array.isArray(data.nodes) || !data.nodes.length || !Array.isArray(data.edges)) throw new Error('关系图须使用完整的 .view.json')
    if (data.nodes.some((n: unknown) => typeof n !== 'string') || new Set(data.nodes).size !== data.nodes.length || data.edges.some((e: any) => !data.nodes.includes(e.source) || !data.nodes.includes(e.target) || !Number.isFinite(e.weight))) throw new Error('关系图节点或连线无效')
    return { html: graphExportSvg(data), warnings: [...statusWarnings, '连线表示模型探索的关系，不能据此认定干预收益。'], count: data.nodes.length, facts: [{ name: '变量数', value: data.nodes.length }, { name: '关系数', value: data.edges.length }, { name: '含义', value: '模型探索关系，不是已验证干预效应' }] as Fact[] }
  }
  if (chart.type === 'benchmark') {
    const data = JSON.parse(await read(chart.source, '.json'))
    if (data.kind !== 'benchmark' || !Array.isArray(data.datasets) || !data.datasets.length || !Array.isArray(data.runs)) throw new Error('模型比较文件结构无效')
    return { html: data.datasets.map((dataset: any) => renderToStaticMarkup(<BenchmarkView data={{ ...data, datasets: [dataset] }} staticView />)).join(''), warnings: [], count: data.runs.length, facts: data.runs.flatMap((r: any) => [{ name: `${r.dataset_id} / ${r.model}`, value: r.status }, ...metricFacts(r.metrics ?? {})]) }
  }
  if (!chart.target) throw new Error('预测图需要 target 目标列名')
  const source = await read(chart.source, '.csv')
  if (chart.type === 'forecast') {
    if (!chart.date) throw new Error('时序图需要 date 日期列名')
    if (!pickColumn(source, chart.date)) throw new Error(`时序预测 CSV 缺少日期列 ${chart.date}`)
    if (!pickColumn(source, `pred_${chart.target}`)) throw new Error(`时序预测 CSV 缺少预测列 pred_${chart.target}；target 应填原始业务目标列名。例如 target=cups_sold 对应 pred_cups_sold，无需删除分位数列。`)
    const series = parseForecastCsv(source, chart.target, chart.date)
    if (!series || pickColumn(source, chart.date)?.length !== series.pred.length || new Set(series.dates).size !== series.dates.length) throw new Error('时序结果无效或日期重复')
    const predictionTimes = orderedDates(series.dates, '预测')
    const historyPoints = chart.history_points ?? 90
    if (!Number.isInteger(historyPoints) || historyPoints < 1 || historyPoints > 1000) throw new Error('history_points 须为 1–1000')
    const train = chart.train ? await read(chart.train, '.csv') : undefined
    const hist = train ? parseTrainTail(train, chart.target, historyPoints, chart.date) : null
    if (train && (!hist || !pickColumn(train, chart.date))) throw new Error('历史数据缺少有效日期或目标值')
    if (train) {
      const historyTimes = orderedDates(pickColumn(train, chart.date)!, '历史')
      if (historyTimes.at(-1)! >= predictionTimes[0]) throw new Error('历史日期必须早于预测首日，不能包含重叠或未来数据')
    }
    const truth = chart.truth ? parseForecastTruth(await read(chart.truth, '.csv'), chart.target, chart.date, series.dates) : undefined
    if (chart.truth && !truth) throw new Error('真值与预测日期未逐行对齐')
    const metrics = truth ? buildScatter(truth.map(String), series.pred.map(String)) : null
    const facts: Fact[] = [{ name: '预测步数', value: series.pred.length }, { name: '点预测合计', value: Number(series.pred.reduce((a, b) => a + b, 0).toFixed(6)), meaning: '先汇总原始小数，再舍入；不是分位区间的合计' }, ...metricFacts(metrics ? { n: metrics.n, mae: metrics.mae, rmse: metrics.rmse, r2: metrics.r2 } : {})]
    series.dates.forEach((date, i) => facts.push({ name: date, value: series.pred[i], meaning: `${weekday(date)}${truth ? `；真实值 ${truth[i]}；差值 ${Number((series.pred[i]-truth[i]).toFixed(4))}` : '；无真值，不能评估误差'}` }))
    return { html: renderToStaticMarkup(<ForecastChart hist={hist?.values ?? []} {...series} truth={truth} startLabel={hist?.dates[0] ?? series.dates[0]} endLabel={series.dates.at(-1)} />), warnings: chart.truth ? [] : ['未提供独立真值，此图展示预测趋势，不能评估误差。'], count: series.pred.length, facts }

  }
  if (!['regression', 'classification'].includes(chart.type)) throw new Error(`不支持的图表类型：${chart.type}`)
  if (!chart.truth) throw new Error('效果对照图需要独立 truth 真值文件；没有真值时请省略该图')
  // 平台表格任务用 pred_label；其他导出只接受目标列的精确预测名，不能猜首个 pred_ 列。
  const truthText = await read(chart.truth, '.csv'), pred = pickColumn(source, 'pred_label') ?? pickColumn(source, `pred_${chart.target}`), truth = pickColumn(truthText, chart.target)
  if (!pred?.length || !truth || pred.length !== truth.length) throw new Error('预测与真值数量不一致或缺少目标列')
  if (chart.id_column) {
    const ids = pickColumn(source, chart.id_column), truthIds = pickColumn(truthText, chart.id_column)
    if (!ids || !truthIds || ids.some((id, i) => !id || id !== truthIds[i]) || new Set(ids).size !== ids.length) throw new Error('预测与真值样本 ID 未逐行对齐或有重复')
  } else if (chart.alignment !== 'input_order') throw new Error('请指定 id_column，或核对后声明 alignment=input_order')
  const values = chart.type === 'regression' ? buildScatter(truth, pred) : buildConfusion(truth, pred)
  if (!values || values.n !== pred.length) throw new Error('图表存在缺失/无效数值，或分类数超过 12；不能静默丢弃样本')
  return { html: chart.type === 'regression' ? renderToStaticMarkup(<ScatterChart data={values as any} />) : renderToStaticMarkup(<ConfusionMatrix data={values as any} />), warnings: [], count: values.n, facts: metricFacts(chart.type === 'regression' ? { n: values.n, mae: (values as any).mae, rmse: (values as any).rmse, r2: (values as any).r2 } : { n: values.n, accuracy: (values as any).accuracy }) }
}
