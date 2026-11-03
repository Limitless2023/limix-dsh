/**
 * [INPUT]: 关系数据契约。
 * [OUTPUT]: 本地阈值筛选、两组分差排序与基于返回边的可核验结论。
 * [POS]: 关系视图纯函数；不推断业务因果收益。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { type ExplanationData } from './explanation-data'
export function graphEdges(data:ExplanationData,t:number){const names=data.nodes??[];return names.flatMap((source,i)=>names.flatMap((target,j)=>{const weight=data.graph_weights?.[i]?.[j];return i!==j&&typeof weight==='number'&&Number.isFinite(weight)&&weight>0&&weight>=t?[{source,target,weight}]:[]}))}
export function graphConclusion(data:ExplanationData){const edges=data.edges??[],target=data.target_label??data.target,label=(n:string)=>data.labels?.[n]??n;const connected=edges.filter(e=>data.mode==='directed'?e.target===data.target:e.target===data.target||e.source===data.target).sort((a,b)=>b.weight-a.weight);if(!edges.length)return '当前结果未检出关系。可以检查数据范围与分析条件，不能据此认定变量之间没有实际联系。';if(!connected.length)return `当前显示 ${edges.length} 条变量关系，但未检出${target}的${data.mode==='directed'?'入向':'直接'}关系。`;return `模型发现 ${connected.length} 条与${target}${data.mode==='directed'?'相连的入向':'直接相连的'}关系，分数较高的包括${connected.slice(0,3).map(e=>label(e.source===data.target?e.target:e.source)).join('、')}。点击关系可查看对应分数与原始数据。`}

// 分差只排序当前至少一组达到阈值的关系，不把两组均未显示的关系当作重点。
export function rankedRelations(data: ExplanationData) {
  return (data.comparison?.records ?? []).filter(r => r.left_present || r.right_present)
    .slice().sort((a,b) => Math.abs(b.right_weight-b.left_weight)-Math.abs(a.right_weight-a.left_weight)
      || a.source.localeCompare(b.source) || a.target.localeCompare(b.target))
}
