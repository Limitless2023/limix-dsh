/**
 * [INPUT]: React、pipeline-flow 的业务步骤，以及 LimixToolCard 的既有结果图表。
 * [OUTPUT]: PIPELINE_CSS、FlowStepRow；紧凑业务行、LimiX 来源标签、右侧结果入口、报告强调与按需展开的技术详情。
 * [POS]: 分析流程的展示层。文件交给宿主预览；完整图表只在用户请求时挂载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react'
import { LimixToolCard } from './LimixToolCard.tsx'
import { explanationMode, fileName, flowState, stepFiles, stepSummary, stepTitle, type FlowStep } from './pipeline-flow.ts'
import type { Stage } from './pipeline-stage.ts'

export const PIPELINE_CSS = `
.lx-flow{height:100%;overflow:auto;box-sizing:border-box;padding:20px clamp(18px,3vw,44px) 160px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5;container-type:inline-size}
.lx-flow-inner{max-width:1000px;margin:0 auto}
.lx-flow button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;text-align:left;padding:0}
.lx-flow button:focus-visible,.lx-flow summary:focus-visible{outline:2px solid #416fbd;outline-offset:4px;border-radius:3px}
.lx-flow-kicker{color:var(--dsw-alias-label-secondary);font-size:11px;letter-spacing:.08em;margin-bottom:5px}
.lx-flow-header{padding-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l3,#e3e7ec);margin-bottom:12px}
.lx-flow-heading{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
.lx-flow h2{font-size:20px;font-weight:600;letter-spacing:-.02em;margin:0;overflow-wrap:anywhere}
.lx-flow-status{font-size:12px;color:#258068;white-space:nowrap}
.lx-flow-status[data-state=error]{color:#c64b42}.lx-flow-status[data-state=warning],.lx-flow-status[data-state=running]{color:#a47320}.lx-flow-status[data-state=idle]{color:var(--dsw-alias-label-secondary)}
.lx-flow-caption{color:var(--dsw-alias-label-secondary);margin:6px 0 0;font-size:12px}
.lx-flow-section{margin:0 0 18px}
.lx-flow-section-head{display:flex;align-items:center;gap:12px;margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-flow-section-head span:last-child{margin-left:auto;font-size:11px}
.lx-flow-request{margin-bottom:10px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-flow-request summary{cursor:pointer}.lx-flow-request p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}
.lx-flow-list{list-style:none;margin:0;padding:0}
.lx-flow-step{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:16px;margin:0;padding:7px 10px 11px 34px;min-width:0;border-radius:6px}
.lx-flow-step:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 3%,transparent)}
.lx-flow-step[data-step="报告输出"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 5%,transparent);margin-top:4px}
.lx-flow-step>.lx-flow-detail,.lx-flow-step>.lx-flow-result,.lx-flow-step>.lx-flow-error{grid-column:1/-1}
.lx-flow-step:not(:last-child):before{content:"";position:absolute;left:9px;top:29px;bottom:-3px;width:1px;background:var(--dsw-alias-border-l3,#dfe5ed)}
.lx-flow-marker{position:absolute;left:0;top:11px;border:0;border-radius:50%;width:19px;height:19px;display:flex;align-items:center;justify-content:center;color:#258068;font-size:12px;background:var(--dsw-alias-bg-base,#fff)}
.lx-flow-marker[data-state=running]{color:#a47320}.lx-flow-marker[data-state=error]{color:#c64b42}.lx-flow-marker[data-state=warning],.lx-flow-marker[data-state=idle]{color:#a47320}
.lx-flow button.lx-flow-step-toggle{display:block;width:100%;padding:0;min-width:0;grid-column:1;grid-row:1}
.lx-flow-step-toggle>*{pointer-events:none}
.lx-flow-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:25px}
.lx-flow-title{font-weight:600;font-size:15px}.lx-flow-brand{font-size:10px;line-height:16px;color:var(--dsw-alias-state-business-primary,#3465ce);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 10%,transparent);padding:0 6px;border-radius:4px;font-weight:500;white-space:nowrap}
.lx-flow-chevron{color:var(--dsw-alias-label-secondary);font-size:11px}
.lx-flow-summary{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:100%}
.lx-flow-actions{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap;align-self:center;max-width:220px}
.lx-flow-actions:empty{display:none}
.lx-flow button.lx-flow-link{color:var(--dsw-alias-state-business-primary,#3465ce);font-size:12px;overflow-wrap:anywhere}
.lx-flow button.lx-flow-link:hover{text-decoration:underline}
.lx-flow-detail{margin-top:13px;padding:16px 18px;background:var(--dsw-alias-interactive-bg-hover,#f5f7fa);border-radius:8px;min-width:0}
.lx-flow-detail h4{font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:500;letter-spacing:.04em;margin:0 0 8px}
.lx-flow-detail h4:not(:first-child){margin-top:18px}
.lx-flow-fields{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px 20px;margin:0;font-size:12px}
.lx-flow-fields dt{color:var(--dsw-alias-label-secondary)}.lx-flow-fields dd{margin:0;overflow-wrap:anywhere}
.lx-flow-files{display:flex;flex-direction:column;gap:6px}.lx-flow-files small{margin-right:10px;color:var(--dsw-alias-label-secondary)}
.lx-flow-operations{padding-left:18px;margin:0;font-size:12px}.lx-flow-operations li{padding:3px 0;overflow-wrap:anywhere}
.lx-flow-error{font-size:12px;color:#c64b42;margin:7px 0;overflow-wrap:anywhere}
.lx-flow-technical{margin-top:16px;font-size:12px;color:var(--dsw-alias-label-secondary)}.lx-flow-technical summary{cursor:pointer}
.lx-flow-technical pre{max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;background:var(--dsw-alias-bg-base,#fff);padding:12px;border-radius:6px}
.lx-flow-result{margin-top:16px;min-width:0}.lx-flow-empty{padding:35px 0;color:var(--dsw-alias-label-secondary)}
@container(max-width:650px){.lx-flow-step{grid-template-columns:minmax(0,1fr);padding-right:4px}.lx-flow-actions{grid-column:1;grid-row:2;justify-content:flex-start;max-width:none;margin-top:4px}.lx-flow-step>.lx-flow-detail,.lx-flow-step>.lx-flow-result,.lx-flow-step>.lx-flow-error{grid-column:1}.lx-flow-summary{white-space:normal}.lx-flow h2{font-size:19px}.lx-flow-step{padding-left:34px}.lx-flow-title{font-size:15px}.lx-flow-detail{padding:13px 12px}.lx-flow-fields{gap:5px 10px}.lx-flow-status{font-size:11px}.lx-flow-summary{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}
`

type OpenFile = (path: string) => void | Promise<void>
function FileLinks({ step, openFile, role }: { step: FlowStep; openFile?: OpenFile; role: 'input' | 'output' }) {
  const [error, setError] = useState('')
  return <div className="lx-flow-files">
    {stepFiles(step).filter(f => f.role === role).map(file => <div key={file.path}>
      <small>{file.label}</small>
      {openFile ? <button type="button" className="lx-flow-link" title={file.path} onClick={() => {
        setError(''); Promise.resolve().then(() => openFile(file.path)).catch(() => setError('文件打开失败，请在工作区检查文件是否仍存在。'))
      }}>{fileName(file.path)}</button> : <span title={file.path}>{fileName(file.path)}</span>}
    </div>)}
    {error && <p className="lx-flow-error" role="alert">{error}</p>}
  </div>
}
function TechnicalDetails({ stages }: { stages: Stage[] }) {
  return <details className="lx-flow-technical"><summary>查看技术详情 · {stages.length} 次操作</summary>
    {stages.map(stage => <div key={stage.key}><p>{stage.title} · {stage.stateLabel}</p><pre>{stage.inputRaw}</pre><pre>{stage.output}</pre></div>)}
  </details>
}
function StepDetails({ step, openFile, expandToken }: { step: FlowStep; openFile?: OpenFile; expandToken?: object }) {
  const last = step.stages[step.stages.length - 1]
  const fields = last.inputKv.filter(([key]) => !['子命令', '命令', '说明', '参数', '解释方式'].includes(key) && !/文件|环境/.test(key))
  if (typeof last.data?.model_type === 'string' && !fields.some(([key]) => key === '模型')) fields.unshift(['模型', last.data.model_type])
  const inputs = stepFiles(step).filter(file => file.role === 'input')
  const outputs = stepFiles(step).filter(file => file.role === 'output')
  const prediction = ['分类预测', '回归预测', '时序预测'].includes(step.title)
  return <div className="lx-flow-detail">
    {inputs.length > 0 && <><h4>输入</h4><FileLinks step={step} role="input" openFile={openFile} /></>}
    {(fields.length > 0 || step.title === '因果解释') && <><h4>分析配置</h4><dl className="lx-flow-fields">
      {step.title === '因果解释' && <><dt>解释模式</dt><dd>{explanationMode(last)}</dd></>}
      {fields.map(([key, value], i) => <div key={i} style={{ display: 'contents' }}><dt>{key}</dt><dd>{key === '任务类型' ? (({ regression: '回归', classification: '分类', timeseries: '时序' } as Record<string, string>)[value] ?? value) : key === '解释范围' && value === 'all' ? '全部样本' : value}</dd></div>)}
    </dl></>}
    <h4>执行内容</h4>
    <ol className="lx-flow-operations">{step.stages.map(stage => <li key={stage.key}>
      {stage.title} <span className="lx-flow-caption">· {stage.stateLabel}</span>
      {stage.substeps.length > 0 && <div className="lx-flow-caption">{stage.substeps.join(' → ')}</div>}
    </li>)}</ol>
    {(outputs.length > 0 || last.outcome || last.metrics.length > 0 || prediction) && <><h4>结果</h4>
      {last.outcome && <p style={{ margin: '0 0 8px', fontSize: 12 }}>{last.outcome}</p>}
      <FileLinks step={step} role="output" openFile={openFile} />
      {prediction && last.metrics.length === 0 && <p className="lx-flow-caption">{last.running ? '预测结果返回后显示评估指标。' : '工具未返回评估指标；仅在有真值并完成评估后展示。'}</p>}
    </>}
    <TechnicalDetails stages={step.stages} />
  </div>
}

export function FlowStepRow({ step, openFile, expandToken }: { step: FlowStep; openFile?: OpenFile; expandToken?: object }) {
  const state = flowState(step.stages)
  const [override, setOverride] = useState<boolean | null>(null)
  useEffect(() => { if (expandToken) setOverride(true) }, [expandToken])
  const [showResult, setShowResult] = useState(false)
  const [fileError, setFileError] = useState('')
  const open = override ?? state.kind === 'running'
  const last = step.stages[step.stages.length - 1]
  const result = last.toolName === 'limix' && last.data && ['分类预测', '回归预测', '时序预测', '因果解释', '模型比较'].includes(step.title)
  const reports = stepFiles(step).filter(f => f.role === 'output' && /\.(md|html?|pdf|docx|pptx)$/i.test(f.path))
  return <li className="lx-flow-step" data-step={step.title}>
    <span className="lx-flow-marker" data-state={state.kind} aria-hidden="true">{state.kind === 'done' ? '✓' : state.kind === 'running' ? '◌' : '!'}</span>
    <button type="button" className="lx-flow-step-toggle" aria-label={`${open ? '收起' : '展开'}${stepTitle(step)}`} aria-expanded={open} onClick={() => setOverride(!open)}>
      <span className="lx-flow-title-row"><span className="lx-flow-title">{stepTitle(step)}</span>{step.limix && <span className="lx-flow-brand">LimiX</span>}
        {state.kind !== 'done' && <span className="lx-flow-status" data-state={state.kind}>{state.label}</span>}
        <span className="lx-flow-chevron">{open ? '▴' : '▾'}</span></span>
      <span className="lx-flow-summary">{stepSummary(step)}</span>
    </button>
    {step.stages.filter(s => s.errLine).map(s => <p key={s.key} className="lx-flow-error">{s.errLine}</p>)}
    <div className="lx-flow-actions">
      {result && <button type="button" className="lx-flow-link" aria-expanded={showResult} onClick={() => setShowResult(!showResult)}>{showResult ? '收起结果' : step.title === '因果解释' ? '解释图表' : step.title === '模型比较' ? '比较结果' : '预测结果'}</button>}
      {openFile && reports.map((file, index) => <button key={file.path} type="button" className="lx-flow-link" title={file.path} onClick={() => {
        setFileError(''); Promise.resolve().then(() => openFile(file.path)).catch(() => setFileError('文件打开失败，请在工作区检查文件是否仍存在。'))
      }}>{reports.length === 1 ? '打开报告' : /\.md$/i.test(file.path) ? '分析报告' : /\.html?$/i.test(file.path) ? 'HTML 报告' : `报告 ${index + 1}`}</button>)}
    </div>
    {fileError && <p className="lx-flow-error" role="alert">{fileError}</p>}
    {open && <StepDetails step={step} openFile={openFile} />}
    {showResult && result && <div className="lx-flow-result"><LimixToolCard callId={last.key} toolName="limix" openFile={openFile}
      block={{ kind: 'tool-result', call: { name: 'limix', argsRaw: JSON.stringify(last.args) }, content: [{ type: 'text', text: JSON.stringify(last.data) }], isError: !last.ok }} /></div>}
  </li>
}
