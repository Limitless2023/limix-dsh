/**
 * [INPUT]: 一条样本的真实贡献、可选原预测与样本切换控件。
 * [OUTPUT]: 因素标题与样本选择同行的正负双向贡献图；预测数值由按需核对表承载；普通卡默认六项，全屏展示全部；时序未知尺度不带单位或原预测差值。
 * [POS]: 单条解释及批量逐条查看的共用视图。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { directionLabel, number, sampleLabel, type ExplanationData } from './explanation-data'

export function LocalExplanation({ data, controls }: { data: ExplanationData; controls?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null), [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => { if ((event.target as Element).closest('[data-lx-local-toggle]')) setExpanded(v => !v) }
    element?.addEventListener('click', click)
    return () => element?.removeEventListener('click', click)
  }, [])
  const factors = (data.features ?? []).filter(f => Number.isFinite(f.score)).sort((a,b) => Math.abs(b.score)-Math.abs(a.score))
  const maximum = Math.max(...factors.map(f => Math.abs(f.score)), .00001)
  return <div ref={root}>
    <div className="lx-explain-head lx-local-head"><div className="lx-local-heading"><span>主要影响因素</span></div>{controls ?? <span className="lx-explain-label">{sampleLabel({ row_number: data.row_number ?? 1, step: data.step, timestamp: data.timestamp }, data)}</span>}</div>
    <style>{`
.lx-local-head{align-items:center;margin-top:16px;margin-bottom:12px}.lx-local-heading{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}.lx-local-summary-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px}.lx-local-summary-right .lx-explain-diff{max-width:none}.lx-local-summary-right:empty{display:none}@container(max-width:420px){.lx-local-summary-right{align-items:flex-start;margin-top:12px}}
.lx-tornado{width:100%;max-width:1050px;margin:0 auto}.lx-tornado-row,.lx-tornado-axis-row{display:grid;grid-template-columns:minmax(95px,150px) minmax(100px,1fr) 85px;gap:18px;align-items:center;min-height:34px}.lx-tornado-name{font-size:12px;overflow-wrap:anywhere}.lx-tornado-name small{color:var(--dsw-alias-label-secondary);margin-left:6px;font-size:10px}.lx-tornado-track{height:34px;position:relative}.lx-tornado-track:before{content:'';position:absolute;left:50%;height:100%;border-left:1px solid var(--dsw-alias-border-primary,#ddd)}.lx-tornado-bar{position:absolute;top:12px;height:10px;border-radius:2px}.lx-tornado-score{text-align:right;font-size:12px;font-variant-numeric:tabular-nums}.lx-tornado-axis{display:flex;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:11px}.lx-tornado:not([data-expanded=true]) .lx-tornado-row:nth-child(n+7){display:none}.lx-fullscreen-dialog[open] .lx-tornado .lx-tornado-row:nth-child(n){display:grid}.lx-fullscreen-dialog[open] .lx-local-expand{display:none}.lx-tornado-toggle{max-width:1050px;margin:8px auto}.lx-tornado-row:last-child{margin-bottom:0}@container(max-width:520px){.lx-tornado-row{grid-template-columns:85px minmax(80px,1fr) 65px;gap:8px}}
`}</style>
    <div className="lx-tornado" data-expanded={expanded} aria-label="单条样本正负贡献图">
    {factors.map(f => {
      const known = f.direction === 1 || f.direction === -1 || f.direction === 0
      const value = f.direction === 0 ? 0 : Math.abs(f.score) * (f.direction === -1 ? -1 : 1)
      const width = known ? Math.abs(value) / maximum * 50 : 0
      return <div className="lx-tornado-row" key={f.name} title={`${f.label} · ${f.name}：${number(f.score)} · ${directionLabel(f.direction)}`}>
        <span className="lx-tornado-name">{f.label}{f.label !== f.name && <small>{f.name}</small>}</span>
        <div className="lx-tornado-track"><div className="lx-tornado-bar" data-direction={f.direction} style={{left:`${value < 0 ? 50-width : 50}%`,width:`${width}%`,background:value < 0 ? '#4168a9' : '#248575'}} /></div>
        <span className="lx-tornado-score">{known ? `${value>0?'+':''}${number(value)}` : `${number(f.score)} · 方向未定`}</span>
      </div>
    })}
    <div className="lx-tornado-axis-row"><span/><div className="lx-tornado-axis"><span>负向</span><span>0</span><span>正向</span></div><span/></div>
    </div>
    {factors.length > 6 && <button type="button" className="lx-explain-toggle lx-local-expand" data-lx-local-toggle aria-expanded={expanded}>{expanded ? '收起因素 ↑' : `查看全部 ${factors.length} 个因素 ↓`}</button>}
  </div>
}
