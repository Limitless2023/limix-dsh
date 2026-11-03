/**
 * [INPUT]: 有向或无向节点与真实边。
 * [OUTPUT]: 按画布比例分配有上限的层间空间；重心排序，孤立节点独立紧凑排列。
 * [POS]: 关系图纯布局；不新增、删除、重定向模型边。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Edge } from './explanation-data'

export function graphLayout(nodes: string[], edges: Edge[], aspect = 2) {
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
  const layers = [...columns.entries()].sort(([a], [b]) => a - b).map(([, group]) => group)
  // 重心排序降低相邻层交叉；相同重心保留输入顺序，保证重绘稳定。
  for (let pass = 0; pass < 4; pass++) {
    const forward = pass % 2 === 0
    const order = forward ? layers.map((_, i) => i) : layers.map((_, i) => layers.length - 1 - i)
    for (const i of order) {
      const neighbor = layers[i + (forward ? -1 : 1)]
      if (!neighbor) continue
      const score = (n: string) => {
        const linked = neighbor.map((m, j) => edges.some(e => (e.source === n && e.target === m) || (e.source === m && e.target === n)) ? j : -1).filter(j => j >= 0)
        return linked.length ? linked.reduce((a, b) => a + b, 0) / linked.length : layers[i].indexOf(n)
      }
      const scores = new Map(layers[i].map(n => [n, score(n)]))
      layers[i].sort((a, b) => scores.get(a)! - scores.get(b)!)
    }
  }
  const isolateColumns = isolated.length > 4 ? 2 : isolated.length ? 1 : 0
  const height = Math.max(230, Math.max(0, ...layers.map(c => c.length), Math.ceil(isolated.length / Math.max(1,isolateColumns))) * 62 + 40)
  const isolateWidth = isolateColumns ? isolateColumns * 154 + 36 : 0
  const width = Math.max(620, layers.length * 260 + isolateWidth, height * Math.max(1.2, Math.min(1.9, aspect)))
  const mainWidth = width - isolateWidth
  const positions = new Map<string, [number, number]>()
  layers.forEach((col, i) => col.forEach((n, j) => positions.set(n, [layers.length === 1 ? mainWidth / 2 : 85 + i * (mainWidth - 170) / (layers.length - 1), 20 + (j + .5) * (height - 40) / col.length])))
  isolated.forEach((n, i) => positions.set(n, [mainWidth + 100 + (i % isolateColumns) * 154, 55 + Math.floor(i / isolateColumns) * 70]))
  const cycles = groups.filter(g => g.length > 1 || edges.some(e => e.source === g[0] && e.target === g[0]))
  return { positions, width, height, isolated, cycles }
}
