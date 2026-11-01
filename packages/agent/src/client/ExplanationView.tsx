/**
 * [INPUT]: explain 精简结果与受控批量视图文件；宿主主题。
 * [OUTPUT]: 单条/批量归因与关系网络；详情及重试错误绑定稳定任务身份。
 * [POS]: 解释视图入口；按需加载完整矩阵，避免挤占 Agent 上下文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'
import { ExplanationSingle } from './ExplanationSingle'
import { ExplanationBatch } from './ExplanationBatch'
import { ExplanationGraph } from './ExplanationGraph'
import { batchDetailKey, validBatchDetail, type ExplanationData } from './explanation-data'
export type { ExplanationData } from './explanation-data'

const CSS = `
.lx-explain{margin:16px 0 8px;container-type:inline-size}
.lx-explain-head{display:flex;justify-content:space-between;gap:16px;align-items:baseline;margin:0 0 20px}
.lx-explain-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:4px}
.lx-explain-value{font-size:25px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.35}
.lx-explain-unit{font-size:12px;margin-left:6px;color:var(--dsw-alias-label-secondary)}
.lx-explain-diff{font-size:12px;text-align:right;color:var(--dsw-alias-label-secondary);max-width:48%}
.lx-explain-subtitle{display:flex;justify-content:space-between;font-size:12px;color:var(--dsw-alias-label-secondary);margin:12px 0}
.lx-factor{display:grid;grid-template-columns:minmax(72px,1fr) minmax(70px,2fr) 66px 64px;align-items:center;gap:12px;padding:8px 0}
.lx-factor-name{font-size:13px;font-weight:500}.lx-factor-key{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-left:6px}
.lx-factor-track{height:7px;background:color-mix(in srgb,var(--dsw-alias-label-secondary) 9%,transparent);border-radius:2px;overflow:hidden}
.lx-factor-bar{height:100%;background:#848991;border-radius:2px}.lx-factor-bar[data-direction="-1"]{background:#4168a9}.lx-factor-bar[data-direction="1"]{background:#248575}.lx-factor-bar[data-direction="0"]{background:#697680}
.lx-factor-score{font-variant-numeric:tabular-nums;text-align:right;font-size:12px}
.lx-factor-direction{font-size:11px;color:var(--dsw-alias-label-secondary);text-align:right}
.lx-explain-foot{font-size:11px;color:var(--dsw-alias-label-secondary);margin:14px 0 0;line-height:1.6}
.lx-explain-toggle{margin-top:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
.lx-causal-graph{width:100%;display:block;margin:8px 0;color:var(--dsw-alias-label-primary)}
.lx-causal-graph text{fill:currentColor;font-family:inherit;pointer-events:none}
.lx-causal-edge{stroke:#7793c3;stroke-width:1.7;fill:none}
.lx-causal-node{fill:var(--dsw-alias-background-primary,#fafbfd);stroke:var(--dsw-alias-border-l3,#dce2eb);stroke-width:1}
.lx-causal-node[data-target=true]{fill:color-mix(in srgb,#4676c8 8%,var(--dsw-alias-background-primary,#fafbfd));stroke:#a4bce2}
.lx-edge-list{font-size:12px;margin:12px 0;padding:0;list-style:none;max-height:280px;overflow:auto}.lx-edge-list li{display:flex;justify-content:space-between;gap:10px;padding:5px 0}
.lx-explain-warning{font-size:12px;color:#986b23;margin:10px 0}
@container(max-width:420px){.lx-factor{grid-template-columns:90px minmax(40px,1fr) 50px;gap:8px}.lx-factor-direction{grid-column:1/-1;text-align:left;margin-top:-6px}.lx-explain-head{display:block}.lx-explain-diff{max-width:none;text-align:left;margin-top:8px}}

.lx-causal-node[data-selected=true]{stroke:#4168a9;stroke-width:2}
.lx-graph-node-button{cursor:pointer}.lx-graph-node-button:focus{outline:none}.lx-graph-node-button:focus-visible rect{stroke:#4168a9;stroke-width:2}
.lx-batch-summary{display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-bottom:16px}.lx-batch-summary strong{font-weight:500;font-size:14px}.lx-batch-summary span{color:var(--dsw-alias-label-secondary)}
.lx-batch-meta{display:flex;align-items:center;gap:6px}.lx-explain-info{position:relative;color:var(--dsw-alias-label-secondary)}
.lx-explain-info summary{display:flex;align-items:center;justify-content:center;width:22px;height:22px;list-style:none;cursor:pointer;border-radius:4px}.lx-explain-info summary::-webkit-details-marker{display:none}.lx-explain-info summary:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}
.lx-explain-info-body{position:absolute;top:calc(100% + 6px);right:0;z-index:3;width:280px;max-width:70vw;box-sizing:border-box;padding:12px 14px;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:8px;box-shadow:0 4px 18px #00000010;font-size:12px;line-height:1.6}.lx-explain-info-body strong{font-size:12px;color:var(--dsw-alias-label-primary)}.lx-explain-info-body p{margin:6px 0 0}
.lx-graph-mode{display:flex;align-items:center;gap:5px}.lx-explain-help{position:relative;display:inline-flex}
.lx-result button.lx-explain-help-trigger{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;color:var(--dsw-alias-label-secondary);border-radius:4px}
.lx-result button.lx-explain-help-trigger:hover,.lx-result button.lx-explain-help-trigger[aria-expanded=true]{color:var(--dsw-alias-state-business-primary,#3465ce);background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}
.lx-explain-help .lx-explain-info-body{top:100%;left:0;right:auto;max-width:min(280px,60cqw)}
.lx-explain-tabs{display:flex;gap:22px;border-bottom:1px solid var(--dsw-alias-border-l3,#e7e9ed);margin-bottom:18px}
.lx-explain-tabs button{font-size:13px!important;padding:8px 0 11px!important;color:var(--dsw-alias-label-secondary)!important;border-bottom:2px solid transparent!important;border-radius:0!important}
.lx-explain-tabs button[aria-pressed=true]{color:var(--dsw-alias-label-primary)!important;border-color:#466fbc!important;font-weight:500}
.lx-heatmap-heading{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:24px 0 8px;font-size:12px}
.lx-heatmap-scroll,.lx-graph-scroll{overflow:auto}
.lx-heatmap{width:100%;border-collapse:separate;border-spacing:3px;font-size:10px;font-variant-numeric:tabular-nums}
.lx-heatmap th{font-weight:400;color:var(--dsw-alias-label-secondary);text-align:center;white-space:nowrap;padding:3px 0!important}.lx-heatmap td{padding:0!important;min-width:22px}
.lx-heat-cell{display:block;height:17px;min-width:20px;border-radius:2px}
.lx-heatmap tbody button{font-size:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important;padding:0 4px!important;white-space:nowrap}
.lx-heat-pred{text-align:right;white-space:nowrap;font-size:10px;padding-left:6px!important}
.lx-heatmap-footer{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:var(--dsw-alias-label-secondary);margin-top:8px}
.lx-heatmap-footer>div{display:flex;gap:12px;align-items:center}.lx-heatmap-footer button{padding:2px 6px!important}.lx-heatmap-footer button:disabled{opacity:.3;cursor:default}
.lx-sample-control,.lx-graph-toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:18px}
.lx-sample-control select{background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:5px;padding:4px 8px;margin-left:8px}
.lx-graph-toolbar{justify-content:flex-start;margin:4px 0 0}.lx-graph-toolbar button{font-size:11px!important;padding:5px 9px!important;border:1px solid var(--dsw-alias-border-l3,#dce2eb)!important;border-radius:5px!important}
.lx-analysis-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.lx-small-button{border:1px solid var(--dsw-alias-border-l3,#dce2eb)!important;border-radius:5px!important;padding:5px 9px!important;font-size:11px!important;white-space:nowrap}
.lx-filter{flex:1}.lx-filter-panel{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:12px;padding:12px;background:var(--dsw-alias-background-secondary,#f7f8fa);border-radius:6px}.lx-filter-panel label{display:grid;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.lx-filter input,.lx-filter select,.lx-raw input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:4px;padding:5px 7px;min-height:29px;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary,#202734);font:inherit;max-width:220px}.lx-filter-range{display:flex;align-items:center;gap:6px}.lx-filter-range input{width:74px}.lx-filter-actions{display:flex;align-items:center;gap:10px;font-size:11px}.lx-filter-error{width:100%;font-size:11px;color:#986b23;margin:0}
.lx-filter-summary{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11px;margin:8px 0 16px;color:var(--dsw-alias-label-secondary)}.lx-filter-summary strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.lx-export{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:10px;color:var(--dsw-alias-label-secondary);padding-top:5px}.lx-export button{font-size:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}.lx-export-status:empty{display:none}
.lx-plot-tabs{display:flex;gap:14px;margin:0 0 16px}.lx-plot-tabs button{font-size:11px!important;color:var(--dsw-alias-label-secondary)!important;padding:3px 0!important}.lx-plot-tabs button[aria-pressed=true]{color:var(--dsw-alias-state-business-primary,#3465ce)!important;font-weight:500}
.lx-matrix-comparison>div+div{border-top:1px solid var(--dsw-alias-border-l3,#dce2eb);margin-top:20px;padding-top:20px}.lx-matrix-comparison .lx-matrix-svg{max-height:290px}.lx-matrix-comparison .lx-matrix-readout{min-height:0}
.lx-raw-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0;font-size:11px;color:var(--dsw-alias-label-secondary)}.lx-raw-toolbar input{width:250px;max-width:70%;font-size:11px}.lx-raw-scroll{overflow:auto;max-height:490px}.lx-raw-table{border-collapse:collapse;width:100%;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}.lx-raw-table th,.lx-raw-table td{text-align:left;padding:7px 10px!important;border-bottom:1px solid var(--dsw-alias-border-l3,#e7e9ed)}.lx-raw-table th{position:sticky;top:0;background:var(--dsw-alias-background-primary,#fff);font-weight:500;color:var(--dsw-alias-label-secondary)}.lx-raw-table button{font-size:11px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
@container(max-width:520px){.lx-heatmap-heading{display:block}.lx-batch-summary{flex-wrap:wrap}.lx-graph-toolbar{flex-wrap:wrap}}
`

export function ExplanationView({ data }: { data: ExplanationData }) {
  const [detail, setDetail] = useState<{ key: string; data: ExplanationData } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null), [attempt, setAttempt] = useState(0)
  const detailKey = batchDetailKey(data), error = failure?.key === detailKey ? failure.message : ''
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = root.current
    const click = (event: Event) => { if ((event.target as Element).closest('[data-lx-explain-retry]')) setAttempt(n => n + 1) }
    element?.addEventListener('click', click)
    return () => element?.removeEventListener('click', click)
  }, [])
  useEffect(() => {
    if (!data.detail_path) return
    const controller = new AbortController(); setFailure(null); setDetail(null)
    fetch('/limix-ui/artifact?path=' + encodeURIComponent(data.detail_path), { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`读取失败（${response.status}）`)
      const value = await response.json()
      if (!validBatchDetail(value, data)) throw new Error('样本文件与本次结果不一致')
      if (!controller.signal.aborted) setDetail({ key: detailKey, data: value })
    }).catch(reason => { if (!controller.signal.aborted) setFailure({ key: detailKey, message: reason.message }) })
    return () => controller.abort()
  }, [detailKey, attempt])
  const loaded = detail?.key === detailKey ? detail.data : data, batch = (data.requested_count ?? 1) > 1 || data.task_type === 'timeseries'
  return <div className="lx-explain" ref={root} aria-label={data.mode === 'local' ? '样本贡献解释' : '变量关系图'}>
    <style>{CSS}</style>
    {data.mode !== 'local' ? <ExplanationGraph data={data} /> : batch ? loaded.samples ? <ExplanationBatch data={loaded} /> : <p className="lx-explain-foot" role="status">{error || `正在加载 ${data.explained_count} 个样本的解释…`} {error && <button type="button" data-lx-explain-retry>重试</button>}</p> : <ExplanationSingle data={data} />}
    {!!data.risks?.length && <p className="lx-explain-warning" role="note">{data.risks.map(r => typeof r === 'string' ? r : JSON.stringify(r)).join('；')}</p>}
  </div>
}
