/**
 * [INPUT]: 有向或无向节点与真实边。
 * [OUTPUT]: 包含孤立节点的分层坐标；环内节点放同层。
 * [POS]: 关系图纯布局；不新增、删除、重定向模型边。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Edge } from './explanation-data'

export function graphLayout(nodes: string[], edges: Edge[]) {
  const adjacency = new Map(nodes.map(n => [n, edges.filter(e => e.source === n).map(e => e.target)]))
  let index = 0
  const stack: string[] = [], onStack = new Set<string>(), indices = new Map<string, number>(), low = new Map<string, number>(), groups: string[][] = []
  const visit = (node: string) => {
    indices.set(node, index); low.set(node, index++); stack.push(node); onStack.add(node)
    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) { visit(next); low.set(node, Math.min(low.get(node)!, low.get(next)!)) }
      else if (onStack.has(next)) low.set(node, Math.min(low.get(node)!, indices.get(next)!))
    }
    if (low.get(node) === indices.get(node)) {
      const group: string[] = []; let member: string
      do { member = stack.pop()!; onStack.delete(member); group.push(member) } while (member !== node)
      groups.push(group)
    }
  }
  nodes.forEach(n => { if (!indices.has(n)) visit(n) })
  const membership = new Map<string, number>(); groups.forEach((g, i) => g.forEach(n => membership.set(n, i)))
  const levels = new Map<number, number>()
  const level = (g: number): number => {
    if (levels.has(g)) return levels.get(g)!
    const parents = edges.filter(e => membership.get(e.target) === g && membership.get(e.source) !== g).map(e => membership.get(e.source)!)
    const value = parents.length ? 1 + Math.max(...parents.map(level)) : 0
    levels.set(g, value); return value
  }
  const isolated = nodes.filter(n => !edges.some(e => e.source === n || e.target === n))
  const columns = new Map<number, string[]>()
  for (const node of nodes.filter(n => !isolated.includes(n))) {
    const l = Math.min(3, level(membership.get(node)!))
    columns.set(l, [...(columns.get(l) ?? []), node])
  }
  if (isolated.length) columns.set(Math.max(-1, ...columns.keys()) + 1, isolated)
  const layers = [...columns.entries()].sort(([a], [b]) => a - b).map(([, group]) => group), width = Math.max(620, layers.length * 190 + 30)
  const height = Math.max(230, Math.max(0, ...layers.map(c => c.length)) * 50 + 48)
  const positions = new Map<string, [number, number]>()
  layers.forEach((col, i) => col.forEach((n, j) => positions.set(n, [layers.length === 1 ? width / 2 : 85 + i * (width - 170) / (layers.length - 1), 35 + (j + .5) * (height - 55) / col.length])))
  const cycles = groups.filter(g => g.length > 1 || edges.some(e => e.source === g[0] && e.target === g[0]))
  return { positions, width, height, isolated, cycles }
}
