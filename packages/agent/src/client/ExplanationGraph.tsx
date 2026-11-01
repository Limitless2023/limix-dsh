/**
 * [INPUT]: 全部真实变量与关系边；分层布局、共用说明图标与宿主主题。
 * [OUTPUT]: 全局因果（有向/无向）图、目标聚焦、高亮与边明细；解读说明按需展开。
 * [POS]: ExplanationView 的图分支；图形不代表已验证干预效果。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useId, useRef, useState } from 'react'
import { graphLayout } from './graph-layout'
import { number, type ExplanationData } from './explanation-data'
import { ExplanationHelp } from './ExplanationHelp'
import { ExplanationDataTable } from './ExplanationDataTable'
import { ExplanationExport } from './ExplanationExport'
import { graphExportSvg } from './explanation-export'

export function ExplanationGraph({ data }: { data: ExplanationData }) {
  const root = useRef<HTMLDivElement>(null), id = useId().replace(/:/g, '')
  const [focus, setFocus] = useState(false), [selected, setSelected] = useState<string | null>(null), [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('visual')
  const allNodes = data.nodes ?? [], allEdges = data.edges ?? []
  const label = (n: string) => data.labels?.[n] ?? n
  const edges = focus ? allEdges.filter(e => e.source === data.target || e.target === data.target) : allEdges
  const neighbors = new Set([data.target, ...edges.flatMap(e => [e.source, e.target])])
  const nodes = focus ? allNodes.filter(n => neighbors.has(n)) : allNodes
  const { positions, width, height, isolated, cycles } = graphLayout(nodes, edges)
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-lx-graph]')
      if (!button || !element?.contains(button)) return
      if (button.dataset.lxGraph === 'focus') { setFocus(v => !v); setSelected(null) }
      if (button.dataset.lxGraph === 'details') setExpanded(v => !v)
      if (button.dataset.lxGraph === 'node') setSelected(v => v === button.dataset.node ? null : button.dataset.node!)
      if (button.dataset.lxGraph === 'clear') setSelected(null)
      if (button.dataset.lxGraph === 'visual' || button.dataset.lxGraph === 'raw') setView(button.dataset.lxGraph)
    }
    const keydown = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).matches('[data-lx-graph="node"]')) { e.preventDefault(); click(e) } }
    element?.addEventListener('click', click); element?.addEventListener('keydown', keydown)
    return () => { element?.removeEventListener('click', click); element?.removeEventListener('keydown', keydown) }
  }, [])
  const active = new Set(selected ? [selected, ...edges.filter(e => e.source === selected || e.target === selected).flatMap(e => [e.source, e.target])] : nodes)
  return <div ref={root}>
    <div className="lx-explain-subtitle"><div className="lx-graph-mode"><span>{data.mode === 'directed' ? '全局因果 · 有向' : '全局因果 · 无向'}</span>
      <ExplanationHelp label="关系图说明"><p>连线表示模型发现的关系，数值为关系分数。</p>{data.mode === 'directed' && cycles.length > 0 && <p>图中含双向或循环关系，不代表确定的因果顺序。</p>}</ExplanationHelp>
    </div><span>{allNodes.length} 个变量 · {allEdges.length} 条关系</span></div>
    <div className="lx-explain-tabs" aria-label="关系数据视图"><button type="button" data-lx-graph="visual" aria-pressed={view === 'visual'}>可视化</button><button type="button" data-lx-graph="raw" aria-pressed={view === 'raw'}>原始数据</button></div>
    <div className="lx-analysis-toolbar"><div className="lx-graph-toolbar"><button type="button" data-lx-graph="focus" aria-pressed={focus}>{focus ? '显示全部关系' : '聚焦目标关系'}</button>
      <span>{focus ? `当前 ${nodes.length} 个变量 · ${edges.length} 条关系` : '完整网络 · 点击变量高亮关联'}</span>
      {selected && <button type="button" data-lx-graph="clear">清除高亮</button>}
    </div><ExplanationExport filename={`${data.target}-关系图`} build={theme => graphExportSvg({ ...data, nodes, edges }, theme, focus ? '目标关系' : '完整网络')}/></div>
    {view === 'raw' ? <ExplanationDataTable data={{ ...data, edges }}/> : <>
    <div className="lx-graph-scroll"><svg className="lx-causal-graph" viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 720), maxHeight: 460 }} role="group" aria-label={`${nodes.length} 个变量、${edges.length} 条真实${data.mode === 'directed' ? '有向' : '无向'}关系`}>
      <defs><marker id={`lx-arrow-${id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M 0 1 L 6 3.5 L 0 6" fill="none" stroke="#6f8ebd" /></marker></defs>
      {edges.map((e, i) => {
        const a = positions.get(e.source)!, b = positions.get(e.target)!
        if (!a || !b) return null
        const right = b[0] > a[0], same = b[0] === a[0]
        const ax = a[0] + (right || same ? 68 : -68), bx = b[0] + (right ? -68 : 68)
        const path = same ? `M ${ax} ${a[1]} C ${ax + 30} ${a[1]}, ${bx + 30} ${b[1]}, ${bx} ${b[1]}` : `M ${ax} ${a[1]} C ${(ax+bx)/2} ${a[1]}, ${(ax+bx)/2} ${b[1]}, ${bx} ${b[1]}`
        const emphasized = !selected || e.source === selected || e.target === selected
        return <g key={i} opacity={emphasized ? 1 : .12}><path className="lx-causal-edge" d={path} style={{ strokeWidth: selected && emphasized ? 2.1 : 1.25 }} markerEnd={data.mode === 'directed' ? `url(#lx-arrow-${id})` : undefined}><title>{`${label(e.source)} ${data.mode === 'directed' ? '→' : '—'} ${label(e.target)}：${number(e.weight)}`}</title></path>
          {edges.length <= 5 && <text x={(ax + bx) / 2} y={(a[1] + b[1]) / 2 - 7} textAnchor="middle" fontSize="11">{number(e.weight)}</text>}
        </g>
      })}
      {nodes.map(n => { const [x, y] = positions.get(n)!; return <g key={n} data-lx-graph="node" data-node={n} role="button" tabIndex={0} aria-label={`高亮${label(n)}的关系`} aria-pressed={selected === n} opacity={active.has(n) ? 1 : .35} className="lx-graph-node-button">
        <rect className="lx-causal-node" data-target={n === data.target} data-selected={selected === n} x={x - 68} y={y - 22} width="136" height="44" rx="5" />
        <text x={x} y={y - 2} textAnchor="middle" fontSize="12" fontWeight="500">{label(n)}</text><text x={x} y={y + 13} textAnchor="middle" fontSize="10" opacity=".58">{n}</text>
      </g> })}
    </svg></div>
    {!edges.length && <p className="lx-explain-foot">当前返回结果未发现与目标直接相连的关系。</p>}
    {!!isolated.length && <p className="lx-explain-foot">{isolated.length} 个变量未检出连线</p>}
    <button type="button" className="lx-explain-toggle" data-lx-graph="details" aria-expanded={expanded}>{expanded ? '收起关系明细 ↑' : `查看 ${edges.length} 条关系明细 ↓`}</button>
    {expanded && <ul className="lx-edge-list">{edges.map((e, i) => <li key={i}><span>{label(e.source)} {data.mode === 'directed' ? '→' : '—'} {label(e.target)}</span><span>{number(e.weight)}</span></li>)}</ul>}
    </>}
  </div>
}
