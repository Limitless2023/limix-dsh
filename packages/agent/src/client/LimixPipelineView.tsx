/**
 * [INPUT]: useTrajectory 的工具记录、useSession 的运行态、宿主文件预览回调。
 * [OUTPUT]: LimixPipelineView；按发生顺序呈现数据处理、预测、因果解释和报告输出。
 * [POS]: 单一业务流程入口。轮次只作请求边界；不展示原始思考或将回复首句当作结论。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react'
import { fmtTime, parseRounds, type NodeLike, type RunningCallLike } from './pipeline-model.ts'
import { flowState, flowSteps } from './pipeline-flow.ts'
import { FlowStepRow, PIPELINE_CSS } from './PipelineParts.tsx'

export function LimixPipelineView({ useTrajectory, useSession, useSessions, sessionId, cwd, openFile }: any): JSX.Element {
  const traj = useTrajectory((t: any) => t)
  const title = useSessions?.((s: any) => s.byId?.[sessionId]?.title)
  const session = useSession?.((s: any) => s)
  const rounds = useMemo(() => parseRounds((traj?.eventNodes ?? []) as ReadonlyArray<NodeLike>,
    (traj?.runningCalls ?? []) as ReadonlyArray<RunningCallLike>).reverse(), [traj])
  const visible = rounds.filter(round => round.stages.length > 0)
  const stages = visible.flatMap(round => round.stages)
  const state = session?.running ? { kind: 'running', label: '进行中' } : flowState(stages)
  const current = [...stages].reverse().find(stage => stage.running || stage.stateKind === 'running')
  return <div className="lx-flow" key={sessionId}>
    <style>{PIPELINE_CSS}</style><div className="lx-flow-inner">
      <header className="lx-flow-header">
        <div className="lx-flow-heading"><h2>{typeof title === 'string' && title ? title : '从数据到分析交付'}</h2>{stages.length > 0 && <span className="lx-flow-status" data-state={state.kind}>{state.label}</span>}</div>
        {(current || session?.running || !stages.length) && <p className="lx-flow-caption">{current ? `正在执行：${current.title}` : session?.running ? 'Agent 正在继续分析' : '数据处理、预测、因果解释与报告将在这里按顺序呈现。'}</p>}
      </header>
      {visible.length === 0 && <p className="lx-flow-empty">本会话还没有分析活动。</p>}
      {visible.map((round, index) => {
        const steps = flowSteps(round, cwd)
        const revision = index > 0 && steps.some(s => s.title === '报告输出' && s.stages.some(stage => stage.toolName === 'edit')) && !steps.some(s => s.limix)
        return <section className="lx-flow-section" key={`${sessionId ?? ''}-${round.turn}`} aria-label={`第 ${round.turn} 轮分析`}>
          {visible.length > 1 && <div className="lx-flow-section-head"><strong>{index === 0 ? '开始分析' : revision ? '报告修订' : '补充分析'}</strong><span>第 {round.turn} 轮 · {fmtTime(round.time)}</span></div>}
          <details className="lx-flow-request"><summary>本次请求 <span style={{ marginLeft: 8 }}>{fmtTime(round.time)}</span></summary><p>{round.ask}</p></details>
          <ol className="lx-flow-list">{steps.map(step => <FlowStepRow key={step.key} step={step} openFile={openFile} />)}</ol>
        </section>
      })}
    </div>
  </div>
}
