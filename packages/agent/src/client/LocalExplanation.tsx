/**
 * [INPUT]: 一条样本的真实贡献与可选原预测。
 * [OUTPUT]: 六项默认贡献与重算结果；时序未知尺度不带单位或原预测差值。
 * [POS]: 单条解释及批量逐条查看的共用视图。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'
import { directionLabel, explanationPrediction, number, sampleLabel, type ExplanationData } from './explanation-data'

export function LocalExplanation({ data }: { data: ExplanationData }) {
  const root = useRef<HTMLDivElement>(null), [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => { if ((event.target as Element).closest('[data-lx-local-toggle]')) setExpanded(v => !v) }
    element?.addEventListener('click', click)
    return () => element?.removeEventListener('click', click)
  }, [])
  const factors = (data.features ?? []).filter(f => Number.isFinite(f.score))
  const maximum = Math.max(...factors.map(f => Math.abs(f.score)), .00001)
  const prediction = explanationPrediction(data)
  return <div ref={root}>
    <div className="lx-explain-head"><div><div className="lx-explain-label">{sampleLabel({ row_number: data.row_number ?? 1, step: data.step, timestamp: data.timestamp }, data)} · {prediction.label}</div>
      <div className="lx-explain-value">{typeof data.prediction === 'number' ? number(data.prediction) : data.prediction ?? '未返回'}<span className="lx-explain-unit">{prediction.unit}</span></div></div>
      {prediction.comparable && data.prior_prediction !== undefined && <div className="lx-explain-diff">原预测 {typeof data.prior_prediction === 'number' ? number(data.prior_prediction) : data.prior_prediction} {prediction.unit}
        {data.task_type === 'classification' && data.prediction !== undefined
          ? <div>{String(data.prior_prediction) === String(data.prediction) ? '分类结果一致' : `重算类别 ${data.prior_prediction} → ${data.prediction}`}</div>
          : typeof data.prediction_delta === 'number' && <div>重算差异 {data.prediction_delta > 0 ? '+' : ''}{number(data.prediction_delta)} {prediction.unit}</div>}
      </div>}
    </div>
    <div className="lx-explain-subtitle"><span>主要影响因素</span><span>贡献分数 · 模型方向</span></div>
    {(expanded ? factors : factors.slice(0, 6)).map(f => <div className="lx-factor" key={f.name}>
      <span className="lx-factor-name">{f.label}{f.label !== f.name && <span className="lx-factor-key">{f.name}</span>}</span>
      <div className="lx-factor-track"><div className="lx-factor-bar" data-direction={f.direction} style={{ width: `${Math.abs(f.score) / maximum * 100}%` }} /></div>
      <span className="lx-factor-score">{number(f.score)}</span><span className="lx-factor-direction">{directionLabel(f.direction)}{f.direction === 1 ? ' ↑' : f.direction === -1 ? ' ↓' : ''}</span>
    </div>)}
    {factors.length > 6 && <button type="button" className="lx-explain-toggle" data-lx-local-toggle aria-expanded={expanded}>{expanded ? '收起因素 ↑' : `查看全部 ${factors.length} 个因素 ↓`}</button>}
    <p className="lx-explain-foot">解释模型如何得到本次预测；贡献分数不代表实际调节收益。</p>
  </div>
}
