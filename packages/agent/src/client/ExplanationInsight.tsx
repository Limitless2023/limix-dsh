/**
 * [INPUT]: 真实贡献分数、方向与当前样本范围。
 * [OUTPUT]: 预测解释与两组差异的简短结论；数字与图表共享计算口径。
 * [POS]: 单条与批量解释共用结论，不推导干预效果。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { contributionMatrix } from './contribution-matrix'
import { number, singleSampleMatrix, type ExplanationData } from './explanation-data'
export function ExplanationInsight({data}:{data:ExplanationData}) {
  const value=data.samples?data:singleSampleMatrix(data),count=value.samples?.length??0
  const top=contributionMatrix(value).ranking.filter(f=>f.mean!==null&&f.mean!==0).slice(0,3)
  return <p className="lx-insight">{!count?'当前筛选没有样本，请调整条件。':top.length?`在当前 ${count} 个样本中，${count===1?'贡献':'平均贡献'}较突出的因素是${top.map(f=>f.label).join('、')}。${count>1?'先看整体分布，再点击样本查看差异。':'下方展示各因素在本次预测中的贡献。'}`:'当前贡献没有可汇总的非零已知方向，请查看原始数据与方向说明。'}{data.task_type==='classification'?' 分类方向未绑定具体类别，不代表某一类别概率变化。':''}</p>
}
export function predictionGroups(data:ExplanationData) {
  if(data.task_type==='classification'||data.task_type==='timeseries')return null
  const samples=data.samples??[],prior=samples.length>0&&samples.every(s=>typeof s.prior_prediction==='number'&&Number.isFinite(s.prior_prediction))
  const values=samples.map(s=>prior?s.prior_prediction:s.prediction)
  if(values.length<2||!values.every(v=>typeof v==='number'&&Number.isFinite(v)))return null
  const sorted=(values as number[]).slice().sort((a,b)=>a-b),mid=Math.floor(sorted.length/2),median=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2
  return {median,label:prior?'原预测':'解释时预测',low:{...data,samples:samples.filter((_,i)=>(values[i] as number)<median)},high:{...data,samples:samples.filter((_,i)=>(values[i] as number)>=median)}}
}

export function GroupInsight({low,high}:{low:ExplanationData;high:ExplanationData}) {
  const left=contributionMatrix(low).ranking,right=contributionMatrix(high).ranking
  const changes=left.flatMap(a=>{const b=right.find(b=>b.name===a.name);return a.mean!==null&&b?.mean!=null?[{label:a.label,delta:b.mean-a.mean}]:[]}).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).filter(x=>x.delta!==0).slice(0,3)
  return <p className="lx-insight">低预测组 {low.samples?.length??0} 条，高预测组 {high.samples?.length??0} 条。{changes.length?`高组减低组的平均贡献差异较大的是${changes.map(x=>`${x.label}（${x.delta>0?'+':''}${number(x.delta)}）`).join('、')}。`:'当前两组没有可比较的非零平均贡献差异。'}下方共用色阶和数值轴。</p>
}
