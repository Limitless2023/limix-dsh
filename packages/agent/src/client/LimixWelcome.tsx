/**
 * [INPUT]: session 槽位、preset 投影、inputActions 与宿主 composer.bar 锚点。
 * [OUTPUT]: LimixWelcome；输入框下方提供销量、材料性能和电价示例。
 * [POS]: 空白 LimiX 会话的输入框引导；示例只填草稿，离开时移除挂载点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const EXAMPLES = [
  { label: '预测销量', question: '下个月，哪些商品会热销？', icon: 'M3 17l6-6 4 4 8-10M15 5h6v6', prompt: '我想预测商品销量。请先帮我确认历史销量数据、预测周期和目标列，再用 LimiX 完成预测。' },
  { label: '材料性能预测', question: '这种材料的抗拉强度有多高？', icon: 'M9 3h6M10 3v7l-5.2 8a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 10V3M8 16h8', prompt: '我想根据材料配方和工艺参数，预测新配方的抗拉强度。请先确认已有实验数据、配方与工艺字段、抗拉强度列及单位，再用 LimiX 做回归预测。' },
  { label: '预测电价', question: '未来电价会怎样变化？', icon: 'M13 2L4 14h7l-1 8 10-12h-7l0-8z', prompt: '我想预测未来电价。请先确认历史电价数据的时间列、采样频率和预测时长，再用 LimiX 做时序预测。' },
]

const CSS = `
.lx-welcome{margin:6px var(--dsh-composer-side-clearance,20px) 0;color:var(--dsw-alias-label-secondary);font:inherit}
.lx-welcome p{margin:0 0 10px;font-size:12px;line-height:1.6}
.lx-welcome-examples{display:flex;gap:10px;flex-wrap:wrap}
.lx-welcome button{box-sizing:border-box;display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:36px;padding:7px 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 3%,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary);text-align:left;font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.lx-welcome button:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 7%,var(--dsw-alias-bg-base,#fff));border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 25%,transparent)}
.lx-welcome button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#3465ce);outline-offset:3px}
.lx-welcome button svg{width:15px;height:15px;flex:none;color:var(--dsw-alias-label-primary-bluish,#3465ce)}
`

export function LimixWelcome({ sessionId, session, useSessions, inputActions }: any) {
  const preset = useSessions((state: any) => state.byId[sessionId]?.projectionValues?.agentPreset)
  if (!session?.blank || preset !== 'limix') return null
  return <WelcomeContent key={sessionId} inputActions={inputActions} />
}

function WelcomeContent({ inputActions }: any) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [examplesHost, setExamplesHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // 宿主没有首页输入框下方槽位；新增独立挂载点，保持视觉与键盘顺序一致。
    const composer = anchor.current?.closest('[data-composer-seat]')
      ?.querySelector('[data-slot="conversation.composer.bar"]')
    if (!composer) return
    const host = document.createElement('div')
    host.setAttribute('data-limix-examples-host', '')
    composer.after(host)
    setExamplesHost(host)
    return () => host.remove()
  }, [])

  return <>
    <span ref={anchor} hidden data-limix-welcome="" />
    {examplesHost && createPortal(
      <section className="lx-welcome" aria-label="LimiX 预测引导">
        <style>{CSS}</style>
        <p>上传数据，或告诉我你想预测什么。</p>
        <div className="lx-welcome-examples" role="group" aria-label="推荐问题">
          {EXAMPLES.map(example => <button key={example.label} type="button" title={example.question}
            onClick={() => inputActions.setDraft(example.prompt)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={example.icon} /></svg>
            {example.label}
          </button>)}
        </div>
      </section>, examplesHost)}
  </>
}
