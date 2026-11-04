/**
 * [INPUT]: 全部真实变量与关系边；分层布局、共用说明图标与宿主主题。
 * [OUTPUT]: 全局因果（有向/无向）图、目标聚焦、高亮连线分数、共享选边与右下原值面板；解读说明按需展开。
 * [POS]: ExplanationView 的图分支；图形不代表已验证干预效果。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { graphLayout, graphEdgeGeometry } from './graph-layout'
import { number, type ExplanationData } from './explanation-data'
import { ExplanationHelp } from './ExplanationHelp'
import { ExplanationExport } from './ExplanationExport'
import { graphExportSvg } from './explanation-export'

export function ExplanationGraph({ data, onPair, detail, selectedPair = [], onClearPair, toolbar }: { data: ExplanationData; onPair?:(a:string,b:string)=>void; detail?:ReactNode; selectedPair?:string[]; onClearPair?:()=>void; toolbar?:ReactNode }) {
  const root = useRef<HTMLDivElement>(null), id = useId().replace(/:/g, '')
  const [focus, setFocus] = useState<string | null>(null), [selected, setSelected] = useState<string | null>(null)
  const canvas = useRef<HTMLDivElement>(null), [aspect, setAspect] = useState(2)
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setAspect(previous => Math.abs(previous - width / height) > .05 ? width / height : previous)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const allNodes = data.nodes ?? [], allEdges = data.edges ?? []
  const label = (n: string) => data.labels?.[n] ?? n
  const edges = focus ? allEdges.filter(e => e.source === focus || e.target === focus) : allEdges
  const neighbors = new Set([focus ?? data.target, ...edges.flatMap(e => [e.source, e.target])])
  const nodes = focus ? allNodes.filter(n => neighbors.has(n)) : allNodes
  const { positions, width, height, isolated, cycles } = graphLayout(nodes, edges, aspect)
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-lx-graph]')
      if (!button || !element?.contains(button)) return
      if (button.dataset.lxGraph === 'edge') { setSelected(null); onPair?.(button.dataset.source!,button.dataset.target!) }
      else onClearPair?.()
      if (button.dataset.lxGraph === 'focus') { setFocus(v => v ? null : selected); setSelected(null) }
      if (button.dataset.lxGraph === 'node') setSelected(v => v === button.dataset.node ? null : button.dataset.node!)
      if (button.dataset.lxGraph === 'clear') setSelected(null)
    }
    const keydown = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).matches('[data-lx-graph="node"],[data-lx-graph="edge"]')) { e.preventDefault(); click(e) } }
    element?.addEventListener('click', click); element?.addEventListener('keydown', keydown)
    return () => { element?.removeEventListener('click', click); element?.removeEventListener('keydown', keydown) }
  }, [onPair, onClearPair, selected])
  const active = new Set(selected ? [selected, ...edges.filter(e => e.source === selected || e.target === selected).flatMap(e => [e.source, e.target])] : selectedPair.length ? selectedPair : nodes)
  return <div className="lx-network-view" ref={root}>
    <div className="lx-network-toolbar">
      <strong>因果关系网络</strong><span className="lx-graph-mode">{data.mode === 'directed' ? '有向' : '无向'}<ExplanationHelp label="关系图说明"><p>连线表示模型发现的关系，数值为关系分数。点击变量看分数，点击连线看原始数据。</p>{!!isolated.length && <p>{isolated.length} 个变量暂无关联连线（当前模型结果）。</p>}{data.mode === 'directed' && cycles.length > 0 && <p>图中含双向或循环关系，不代表确定的因果顺序。</p>}</ExplanationHelp></span>
      {(selected || focus) && <button type="button" data-lx-graph="focus" aria-pressed={!!focus}>{focus ? '显示全部' : '聚焦此变量'}</button>}
      {(selected || selectedPair.length > 0) && <button type="button" data-lx-graph="clear">清除高亮</button>}
      <div className="lx-network-actions">{toolbar}<ExplanationExport menuLabel="更多" filename={`${data.target}-关系图`} build={theme => graphExportSvg({ ...data, nodes, edges }, theme, focus ? '目标关系' : '完整网络')}/></div>
    </div>
    <>
    <div className={`lx-network-stage${detail ? ' has-detail' : ''}`}><div className="lx-graph-scroll" ref={canvas}><svg className="lx-causal-graph lx-network-svg" viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 520 }} role="group" aria-label={`${nodes.length} 个变量、${edges.length} 条真实${data.mode === 'directed' ? '有向' : '无向'}关系`}>
      <defs><marker id={`lx-arrow-${id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M 0 1 L 6 3.5 L 0 6" fill="none" stroke="#6f8ebd" /></marker><marker id={`lx-orange-arrow-${id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M 0 1 L 6 3.5 L 0 6" fill="none" stroke="#ff5b2a"/></marker></defs>
      {edges.map((e, i) => {
        const route = graphEdgeGeometry(e, edges, positions)
        if (!route) return null
        const { path } = route
        const chosen = selectedPair[0] === e.source && selectedPair[1] === e.target
        const emphasized = selectedPair.length ? chosen : !selected || e.source === selected || e.target === selected
        return <g key={i} data-lx-graph="edge" data-source={e.source} data-target={e.target} className="lx-graph-edge-button" aria-pressed={chosen} role="button" tabIndex={0} aria-label={`查看${label(e.source)}到${label(e.target)}的关系`} opacity={emphasized ? 1 : .12}><path d={path} fill="none" stroke="transparent" strokeWidth="12" style={{cursor:'pointer'}}/><path className="lx-causal-edge" d={path} style={{ stroke: chosen ? "#ff5b2a" : undefined, strokeWidth: chosen ? 2.6 : selected && emphasized ? 2.1 : 1.25 }} markerEnd={data.mode === 'directed' ? `url(#${chosen ? "lx-orange-arrow" : "lx-arrow"}-${id})` : undefined}><title>{`${label(e.source)} ${data.mode === 'directed' ? '→' : '—'} ${label(e.target)}：${number(e.weight)}`}</title></path>
          {(chosen || (selected ? emphasized : focus)) && <g transform={`translate(${route.label[0]},${route.label[1]})`} className="lx-edge-score"><title>{`模型关系分数 ${e.weight}；来源 result.edges[].weight`}</title><rect x="-23" y="-9" width="46" height="18" rx="4" fill="var(--dsw-alias-background-primary,#fff)" stroke={chosen ? "#ff5b2a" : "#cbd7e8"}/><text y="4" textAnchor="middle" fontSize="10" style={{fill:chosen ? "#ff5b2a" : undefined}}>{e.weight.toFixed(3)}</text></g>}
        </g>
      })}
      {nodes.map(n => { const [x, y] = positions.get(n)!; return <g key={n} data-lx-graph="node" data-node={n} role="button" tabIndex={0} aria-label={`高亮${label(n)}的关系`} aria-pressed={selected === n} opacity={active.has(n) ? 1 : .35} className="lx-graph-node-button">
        <rect className="lx-causal-node" data-target={n === data.target} data-selected={selected === n} x={x - 68} y={y - 22} width="136" height="44" rx="5" />
        <text x={x} y={y - 2} textAnchor="middle" fontSize="12" fontWeight="500">{label(n)}</text><text x={x} y={y + 13} textAnchor="middle" fontSize="10" opacity=".58">{n}</text>
      </g> })}
    </svg></div>{detail && <aside className="lx-network-detail" aria-label="关系原值预览">{detail}</aside>}</div>
    <div className="lx-network-count">{nodes.length} 个变量 · {edges.length} 条关系</div>
    {!edges.length && <p className="lx-explain-foot">当前返回结果未发现与目标直接相连的关系。</p>}
    </>
  </div>
}
