/**
 * [INPUT]: 说明正文与 React 生命周期；宿主原生指针、焦点和键盘事件。
 * [OUTPUT]: HTML 说明图标，以及 SVG 共用的即时悬停、点击固定与关闭行为。
 * [POS]: 关系图与贡献图共用；说明先消费 Esc，不打断整卡全屏。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export function useExplanationHelp<T extends Element>(enabled = true) {
  const helpRef = useRef<T>(null), helpId = useId(), [helpOpen, setHelpOpen] = useState(false)
  useEffect(() => {
    const group = helpRef.current, trigger = group?.querySelector('[data-lx-help-trigger]')
    if (!enabled || !group || !trigger) return
    const doc = group.ownerDocument
    let pinned = false, visible = false
    const show = (next: boolean) => { visible = next; setHelpOpen(next) }
    const close = () => { pinned = false; show(false) }
    const enter = () => show(true)
    const leave = () => { if (!pinned && !group.contains(doc.activeElement)) show(false) }
    const blur = (event: FocusEvent) => { if (!pinned && !group.contains(event.relatedTarget as Node | null)) show(false) }
    const click = (event: Event) => { event.stopPropagation(); pinned = !pinned; show(pinned) }
    const activate = (event: Event) => {
      const key = (event as KeyboardEvent).key
      if (key === 'Enter' || key === ' ') { event.preventDefault(); click(event) }
    }
    const outside = (event: Event) => { if (!group.contains(event.target as Node)) close() }
    const escape = (event: KeyboardEvent) => {
      if (visible && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    }
    group.addEventListener('pointerenter', enter); group.addEventListener('pointerleave', leave)
    group.addEventListener('focusin', enter); group.addEventListener('focusout', blur as EventListener)
    trigger.addEventListener('click', click); trigger.addEventListener('keydown', activate)
    doc.addEventListener('pointerdown', outside, true); doc.addEventListener('keydown', escape, true)
    return () => {
      group.removeEventListener('pointerenter', enter); group.removeEventListener('pointerleave', leave)
      group.removeEventListener('focusin', enter); group.removeEventListener('focusout', blur as EventListener)
      trigger.removeEventListener('click', click); trigger.removeEventListener('keydown', activate)
      doc.removeEventListener('pointerdown', outside, true); doc.removeEventListener('keydown', escape, true)
    }
  }, [enabled])
  return { helpRef, helpId, helpOpen }
}

export function ExplanationHelp({ label, children }: { label: string; children: ReactNode }) {
  const { helpRef, helpId, helpOpen } = useExplanationHelp<HTMLDivElement>()
  return <div ref={helpRef} className="lx-explain-help">
    <button type="button" className="lx-explain-help-trigger" data-lx-help-trigger aria-label={label} aria-expanded={helpOpen} aria-controls={helpId} aria-describedby={helpOpen ? helpId : undefined}>
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5"/><circle cx="10" cy="6" r=".65" fill="currentColor" stroke="none"/></svg>
    </button>
    {helpOpen && <div className="lx-explain-info-body" id={helpId} role="tooltip"><strong>{label}</strong>{children}</div>}
  </div>
}
