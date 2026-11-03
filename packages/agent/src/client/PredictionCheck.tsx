/**
 * [INPUT]: 局部解释的原预测、解释时预测与尺度契约。
 * [OUTPUT]: 按需核对表；分类显示类别变化，未知时序尺度不比较业务值。
 * [POS]: 单条和批量解释共用；仅在用户打开预测值核对时挂载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { explanationPrediction, number, sampleLabel, type ExplanationData } from './explanation-data'
export function PredictionCheck({ data }: { data: ExplanationData }) {
  const prediction = explanationPrediction(data)
  const samples = data.samples ?? [{ row_number: data.row_number ?? 1, step: data.step, timestamp: data.timestamp, prediction: data.prediction, prior_prediction: data.prior_prediction, prediction_delta: data.prediction_delta }]
  const format = (v: unknown) => typeof v === 'number' ? number(v) : v === undefined || v === null ? '未返回' : String(v)
  return <section aria-label="预测值核对" style={{marginTop:16}}>
    <strong style={{fontSize:12}}>预测值核对</strong>
    <p className="lx-explain-foot" style={{margin:'6px 0'}}>{prediction.comparable ? '贡献图对应解释接口本次计算的结果；原预测用于核对。' : '解释模型输出的尺度尚未核实，不与业务预测值比较。'}</p>
    <div className="lx-raw-scroll" style={{maxHeight:240}}><table className="lx-raw-table"><thead><tr><th>样本</th>{prediction.comparable && <th>原预测{prediction.unit && `（${prediction.unit}）`}</th>}<th>{prediction.label}{prediction.unit && `（${prediction.unit}）`}</th>{prediction.comparable && <th>{data.task_type==='classification'?'类别核对':'与原预测相差'}</th>}</tr></thead>
    <tbody>{samples.map(s=><tr key={s.row_number}><td>{sampleLabel(s,data)}</td>{prediction.comparable && <td>{format(s.prior_prediction)}</td>}<td>{format(s.prediction)}</td>{prediction.comparable && <td>{data.task_type==='classification' ? s.prior_prediction===undefined || s.prediction===undefined ? '无法核对' : String(s.prior_prediction)===String(s.prediction) ? '一致' : `重算类别 ${s.prior_prediction} → ${s.prediction}` : typeof s.prediction_delta==='number' ? `${s.prediction_delta>0?'+':''}${number(s.prediction_delta)} ${prediction.unit}` : '未返回'}</td>}</tr>)}</tbody></table></div>
  </section>
}
