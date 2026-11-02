/**
 * [INPUT]: react、tool-result 展示模型；owner turn 与 useTrajectory
 * [OUTPUT]: LimixTurnStack —— 本轮 LimiX 任务摘要：
 *           逐行汇总任务类型、指标和样本数；不显示任务 ID，不计参数帮助。
 * [POS]: dsh-limix-agent 的对话尾部件。数据与「任务流程」同源（useTrajectory.eventNodes），
 *        按 turn.start.seq / turn.end.seq 切出本轮；按「任务」而不是「调用」分组。
 *        指标只读 stdout JSON 的 metrics；缺失时显示状态，不从日志猜数字。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { openTurnFlow } from './flow-navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parseToolResult, resultState, metricEntries } from './tool-result.ts'

interface Task {
  key: string
  kind: string
  ok: boolean
  metric: string
  unit: string
  facts: string
}

const KIND: Record<string, string> = {
  classify: '分类预测', regress: '回归预测', forecast: '时序预测',
  health: '连通性', check: '权限检查', upload: '上传数据', data: '数据列表',
  task: '查任务', tasks: '任务列表', cancel: '取消任务', result: '取结果',
  download: '下载结果', api: '直调接口', explain: '局部解释', benchmark: '模型比较', report: '分析报告',
}
const PREDICT = new Set(['classify', 'regress', 'forecast', 'explain', 'benchmark', 'report'])
const METRIC_OF: Record<string, [string, string]> = {
  classify: ['accuracy', '准确率'], regress: ['r2', 'R²'], forecast: ['mape', 'MAPE'],
}

/** 输出 JSON 里深扫一个键（最多四层，用于任务状态与摘要）。 */
function deep(obj: any, key: string, depth = 4): unknown {
  if (depth < 0 || obj === null || typeof obj !== 'object') return undefined
  if (key in obj) return obj[key]
  for (const v of Object.values(obj)) {
    const hit = deep(v, key, depth - 1)
    if (hit !== undefined) return hit
  }
  return undefined
}

function textOf(node: any): string {
  const blocks = node?.content ?? node?.blocks ?? []
  return (Array.isArray(blocks) ? blocks : [])
    .filter((b: any) => (b?.type === 'text' || b?.kind === 'text') && b.text)
    .map((b: any) => b.text).join('\n')
}

export function LimixTurnStack({ turn, useTrajectory, openView, sessionId }: any): any {
  const nodes = (useTrajectory((t: any) => t?.eventNodes) ?? []) as any[]
  const tasks = useMemo<Task[]>(() => {
    const from = turn?.start?.seq ?? -Infinity
    const to = turn?.end?.seq ?? Infinity
    const list: any[] = []
    for (const n of Array.isArray(nodes) ? nodes : []) {
      if (typeof n?.seq === 'number' && (n.seq < from || n.seq > to)) continue
      const call = n?.call ?? n?.block?.call ?? null
      if (call?.name !== 'limix') continue
      let args: any = {}
      try {
        const value = JSON.parse(call.argsRaw ?? '{}')
        if (value && typeof value === 'object' && !Array.isArray(value)) args = value
      } catch { /* 原文兜底 */ }
      if (Array.isArray(args.args) && args.args.some((arg: unknown) => arg === '--help' || arg === '-h')) continue
      list.push({ seq: n.seq, command: String(args.command ?? 'limix'), args, text: textOf(n), isError: n?.isError === true })
    }

    const out: Task[] = []
    const others: any[] = []
    // 同一服务任务或比较产物的续查只保留最新状态；无可靠身份时不猜测合并。
    const grouped = new Map<string, any>()
    for (const c of list) {
      const parsed = parseToolResult(c.text).data
      if (!PREDICT.has(c.command) || (c.command === 'report' && parsed?.kind === 'report_facts')) { others.push(c); continue }
      const id = parsed ? deep(parsed, 'task_id') : undefined
      const artifact = ['benchmark','report'].includes(c.command) ? parsed?.saved_to : undefined
      const identity = typeof id === 'string' && id ? `task:${id}` : typeof artifact === 'string' && artifact ? `file:${artifact}` : `call:${c.seq}`
      grouped.set(`${c.command}:${identity}`, c)
    }
    for (const c of grouped.values()) {
      const result = parseToolResult(c.text)
      const parsed = result.data
      const [mk, ml] = METRIC_OF[c.command] ?? ['', '']
      const metric = c.isError || result.failed ? undefined : metricEntries(parsed).find(item => item.key === mk)
      const tid = parsed ? deep(parsed, 'task_id') : undefined
      const state = resultState(true, c.isError || result.failed, parsed)
      const ok = state.kind !== 'error'
      const rows = parsed ? deep(parsed, 'rows') : undefined
      const cols = parsed ? deep(parsed, 'columns') : undefined
      const outFile = parsed ? deep(parsed, 'output') : undefined
      const facts = [
        outFile ? String(outFile).split('/').pop() : '',
        rows !== undefined ? `${rows} 行` : '',
        cols !== undefined ? `${cols} 列` : '',
        c.args?.context ? `context ${c.args.context}` : '',
        c.args?.horizon ? `horizon ${c.args.horizon}` : '',
      ].filter(Boolean).join(' · ')
      out.push({
        key: `s${c.seq}`,
        kind: (() => {
          const args = Array.isArray(c.args.args) ? c.args.args : []
          const flag = (name: string) => { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined }
          const mode=flag('--mode'), target=parsed?.explanation?.target_label ?? flag('--target')
          const label=c.command==='explain' ? (['directed','undirected'].includes(mode) ? '关系探索' : '局部解释') : KIND[c.command] ?? c.command
          return target ? `${label} · ${target}` : label
        })(),
        ok,
        metric: metric?.value ?? state.label,
        unit: metric ? ml : '',
        facts,
      })
    }

    if (others.length > 0) {
      const bad = others.filter((c) => c.isError || parseToolResult(c.text).failed).length
      const cmds = Array.from(new Set(others.map((c) => c.command))) as string[]
      out.push({
        key: 'others',
        kind: '其它调用',
        ok: bad === 0,
        metric: `${others.length} 次`,
        unit: bad ? `· ${bad} 失败` : '',
        facts: cmds.map((c) => KIND[c] ?? c).join(' / '),
      })
    }
    return out
  }, [nodes, turn])

  const [expanded, setExpanded] = useState(false)
  const [navigationError, setNavigationError] = useState('')
  const root = useRef<HTMLElement>(null)
  const business = tasks.filter(task => task.key !== 'others')
  const auxiliary = tasks.find(task => task.key === 'others')
  const hidden = business.slice(3)
  const failures = hidden.filter(task => !task.ok).length
  useEffect(() => { setExpanded(false) }, [turn?.start?.seq])
  useEffect(() => {
    const el = root.current
    const click = (event: Event) => {
      const action = (event.target as Element).closest<HTMLElement>('[data-lx-turn]')?.dataset.lxTurn
      if (action === 'expand') setExpanded(value => !value)
      if (action === 'flow') {
        const first = nodes.find(n => typeof n?.seq === 'number' && n.seq >= (turn?.start?.seq ?? -Infinity) && n.seq <= (turn?.end?.seq ?? Infinity) && (n.call?.name ?? n.block?.call?.name) === 'limix')
        const key = tasks.find(task => task.key !== 'others')?.key ?? (first ? `s${first.seq}` : '')
        if (openView) openView('limix-pipeline', {stageKey:key})
        else if (el && !openTurnFlow(el, sessionId, key)) setNavigationError('请打开上方「任务流程」查看本轮。')
      }
    }
    el?.addEventListener('click', click)
    return () => el?.removeEventListener('click', click)
  }, [openView, tasks, turn, sessionId, nodes])
  if (tasks.length === 0) return null
  return <section ref={root} className="lx-turn-summary" aria-label="本轮 LimiX 结果" style={{ margin: '12px 0 4px', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
    <style>{`.lx-turn-summary button{border:0;background:none;padding:3px 0;font:inherit;font-size:11px;color:var(--dsw-alias-state-business-primary,#466eb9);cursor:pointer}.lx-turn-summary button:focus-visible{outline:2px solid #466eb9;outline-offset:3px}`}</style>
    <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',marginBottom:5,fontSize:11,color:'var(--dsw-alias-label-tertiary)'}}>
      <span>{business.length ? `本轮 LimiX · ${business.length} 个任务` : '本轮 LimiX · 辅助调用'}</span>
      {<button type="button" data-lx-turn="flow">查看本轮任务流程 ↗</button>}
    </div>
    {(expanded ? tasks : business.slice(0,3)).map(task => <div key={task.key} style={{ display:'flex',flexWrap:'wrap',gap:'4px 16px',alignItems:'baseline',padding:'5px 0' }}>
      <span>{task.kind}</span><span style={{fontWeight:500,fontVariantNumeric:'tabular-nums',color:task.ok?'var(--dsw-alias-label-primary)':'#cf4545'}}>{task.metric} {task.unit}</span>
      {task.facts && <span style={{color:'var(--dsw-alias-label-tertiary)'}}>{task.facts}</span>}
    </div>)}
    {navigationError && <p role="status">{navigationError}</p>}
    {(hidden.length>0 || auxiliary) && <button type="button" data-lx-turn="expand" aria-expanded={expanded}>{expanded?'收起 ⌃':`${hidden.length ? `展开其余 ${hidden.length} 个任务` : '查看辅助调用'}${failures ? ` · 其中 ${failures} 个未完成` : ''}${auxiliary && !auxiliary.ok ? ' · 辅助调用有失败' : ''} ⌄`}</button>}
  </section>
}
