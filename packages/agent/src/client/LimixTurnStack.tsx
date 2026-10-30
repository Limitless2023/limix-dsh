/**
 * [INPUT]: 宿主 external react；owner props { turn }；standardProps.useTrajectory
 * [OUTPUT]: LimixTurnStack —— 本轮 LimiX 任务卡堆：
 *           默认「阶梯叠压」只占一张卡的高度；hover 抬起；点任意一张展开成平铺列表；再点收起。
 *           头部带「牌堆」开关（演示用：完全重叠 + 微旋转 + 逐张翻）。
 * [POS]: dsh-limix-agent 的对话尾部件。数据与「分析过程」同源（useTrajectory.eventNodes），
 *        按 turn.start.seq / turn.end.seq 切出本轮；按「任务」而不是「调用」分组。
 */
import { useEffect, useMemo, useState } from 'react'

const STYLE_ID = 'limix-deck-style'
const CSS = `
.lx-deck{position:relative;height:132px;margin-top:4px}
.lx-card{position:absolute;width:290px;background:#fff;border:1px solid rgba(16,24,40,.08);
  border-radius:12px;padding:11px 13px 10px;text-align:left;font:inherit;cursor:pointer;
  box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 24px -18px rgba(16,24,40,.30);
  transition:transform .2s ease,box-shadow .2s ease}
.lx-card::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;border-radius:12px 12px 0 0;
  background:linear-gradient(90deg,#12b76a,#5ce0a4 35%,rgba(18,183,106,0) 92%)}
.lx-card .lx-metric{background:linear-gradient(120deg,#122a72,#2e5bff 62%,#5f7dff);-webkit-background-clip:text;background-clip:text;color:transparent}
.lx-card.bad .lx-metric{background:none;color:#d92d20}
.lx-card.bad::before{background:linear-gradient(90deg,#f04438,#f97066 35%,rgba(240,68,56,0) 92%)}
.lx-card:hover{transform:translateY(-6px);box-shadow:0 2px 4px rgba(16,24,40,.06),0 18px 34px -18px rgba(16,24,40,.42);z-index:99!important}
.lx-cards.pile{height:170px}
.lx-cards.pile .lx-card{left:50%;translate:-50% 0}
.lx-cards.pile .lx-card:nth-child(1){top:8px;rotate:-6deg}
.lx-cards.pile .lx-card:nth-child(2){top:14px;rotate:-2deg;z-index:2}
.lx-cards.pile .lx-card:nth-child(3){top:20px;rotate:2deg;z-index:3}
.lx-cards.pile .lx-card:nth-child(4){top:26px;rotate:6deg;z-index:4}
.lx-cards.pile .lx-card:hover{translate:-50% -6px;rotate:0deg}
.lx-row{display:flex;align-items:baseline;gap:10px;padding:8px 12px;border:1px solid rgba(16,24,40,.08);
  border-radius:10px;background:#fff;margin-top:6px}
.lx-row .m{font-family:var(--ds-font-family-code,ui-monospace);font-size:11px;color:#98a2b3;width:64px;flex:none}
.lx-row .v{font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums}
.lx-row .u{font-size:11px;color:#667085}
.lx-row .r{margin-left:auto;font-size:11px;color:#98a2b3}
`

interface Task {
  key: string
  kind: string
  command: string
  ok: boolean
  metric: string
  unit: string
  facts: string
  id: string
  count: number
}

const KIND: Record<string, string> = {
  classify: '分类预测', regress: '回归预测', forecast: '时序预测',
  health: '连通性', check: '权限检查', upload: '上传数据', data: '数据列表',
  task: '查任务', tasks: '任务列表', cancel: '取消任务', result: '取结果',
  download: '下载结果', api: '直调接口',
}
const PREDICT = new Set(['classify', 'regress', 'forecast'])
const METRIC_OF: Record<string, [string, string]> = {
  classify: ['accuracy', '准确率'], regress: ['r2', 'R²'], forecast: ['mape', 'MAPE'],
}

/** 输出 JSON 里深扫一个键（只扫两层，够用且不会失控）。 */
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

/** 从混杂文本里取出第一个完整 JSON 值（输出常带前导说明与尾部 [stderr] 段）。 */
function extractJson(text: string): any {
  const start = text.search(/[[{]/)
  if (start < 0) return null
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') { inStr = true; continue }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) } catch { return null }
      }
    }
  }
  return null
}

export function LimixTurnStack({ turn, useTrajectory }: any): any {
  const nodes = (useTrajectory((t: any) => t?.eventNodes) ?? []) as any[]
  const [open, setOpen] = useState(false)
  const [pile, setPile] = useState(false)

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const tag = document.createElement('style')
    tag.id = STYLE_ID
    tag.textContent = CSS
    document.head.appendChild(tag)
  }, [])

  const tasks = useMemo<Task[]>(() => {
    const from = turn?.start?.seq ?? -Infinity
    const to = turn?.end?.seq ?? Infinity
    const list: any[] = []
    for (const n of Array.isArray(nodes) ? nodes : []) {
      if (typeof n?.seq === 'number' && (n.seq < from || n.seq > to)) continue
      const call = n?.call ?? n?.block?.call ?? null
      if (call?.name !== 'limix') continue
      let args: any = {}
      try { args = JSON.parse(call.argsRaw ?? '{}') } catch { /* 原文兜底 */ }
      list.push({ command: String(args.command ?? 'limix'), args, text: textOf(n), isError: n?.isError === true })
    }

    const out: Task[] = []
    const others: any[] = []
    for (const c of list) {
      if (!PREDICT.has(c.command)) { others.push(c); continue }
      let parsed: any = null
      parsed = extractJson(c.text)
      // 工具输出常是 {command, exitCode, stdout, stderr} 信封，指标在 stdout 的 JSON 里
      if (parsed && typeof parsed.stdout === 'string') {
        const inner = extractJson(parsed.stdout)
        if (inner) parsed = inner
      }
      // 兜底：整段文本可能是被转义过的 JSON 字符串
      if (!parsed) parsed = extractJson(c.text.replace(/\\"/g, '"'))
      const [mk, ml] = METRIC_OF[c.command] ?? ['', '']
      let mv = parsed ? deep(parsed, mk) : undefined
      if (mv === undefined) {
        // 兜底：指标可能以 metrics 对象出现在节点的任何字段里，直接扫原始 JSON
        const raw = JSON.stringify(n)
        const mm = raw.match(/\\?"metrics\\?"\s*:\s*\\?{([^}]*)/)
        if (mm && mk) {
          const hit = mm[1].match(new RegExp('\\\\?"' + mk + '\\\\?"\\s*:\\s*(-?[0-9.]+)'))
          if (hit) mv = hit[1]
        }
      }
      if (mv === undefined && mk) {
        // 兜底：指标可能被塞进某个字符串字段里（stringified JSON），直接按文本找
        const re = new RegExp('"?' + mk + '"?\\s*[:=]\\s*"?(-?[0-9.]+)', 'i')
        const hit = c.text.match(re)
        if (hit) mv = hit[1]
      }
      const tid = parsed ? deep(parsed, 'task_id') : (c.text.match(/"task_id"\s*:\s*"([^"]+)"/)?.[1])
      const ready = parsed ? deep(parsed, 'is_ready') : undefined
      const ok = !c.isError && !/^\s*(error|traceback)/i.test(c.text) && ready !== false
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
        key: `${c.command}:${String(tid ?? out.length)}`,
        kind: KIND[c.command] ?? c.command,
        command: c.command,
        ok,
        metric: mv !== undefined ? String(mv) : (ok
          ? String((parsed && (deep(parsed, 'status') ?? (deep(parsed, 'is_ready') === true ? 'finished' : undefined))) ?? '已完成')
          : '失败'),
        unit: mv !== undefined ? ml : '',
        facts,
        id: tid ? String(tid) : '',
        count: 1,
      })
    }

    if (others.length > 0) {
      const bad = others.filter((c) => c.isError || /^\s*(error|traceback)/i.test(c.text)).length
      const cmds = Array.from(new Set(others.map((c) => c.command))) as string[]
      out.push({
        key: 'others',
        kind: '其它调用',
        command: cmds.slice(0, 3).join(' · '),
        ok: bad === 0,
        metric: `${others.length} 次`,
        unit: bad ? `· ${bad} 失败` : '',
        facts: cmds.map((c) => KIND[c] ?? c).join(' / '),
        id: '',
        count: others.length,
      })
    }
    return out
  }, [nodes, turn])

  if (tasks.length === 0) return null

  const shown = tasks.slice(0, 4)
  const rest = tasks.length - shown.length

  return (
    <div style={{ margin: '4px 0 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--dsw-alias-label-caption, #98a2b3)', marginBottom: 2 }}>
        <span>本轮 LimiX · {tasks.length} 个任务</span>
        <button type="button" onClick={() => setPile((v) => !v)}
          style={{ font: 'inherit', fontSize: 11, color: 'inherit', background: 'transparent', border: '1px solid rgba(16,24,40,.14)', borderRadius: 6, padding: '1px 6px', cursor: 'pointer' }}>
          {pile ? '离开牌堆' : '牌堆'}
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)}
          style={{ marginLeft: 'auto', font: 'inherit', fontSize: 11, color: 'inherit', background: 'transparent', border: 0, cursor: 'pointer' }}>
          {open ? '收起（也可点任意一行）' : '展开'}
        </button>
      </div>

      {open ? (
        <div>
          {tasks.map((t) => (
            <div key={t.key} className="lx-row" onClick={() => setOpen(false)} style={{ cursor: 'pointer' }} title="点击收起">
              <span className="m">{t.command}</span>
              <span className="v">{t.metric}</span>
              <span className="u">{t.unit}</span>
              <span className="r">{t.kind}{t.facts ? ` · ${t.facts}` : ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={`lx-deck lx-cards${pile ? ' pile' : ''}`}>
          {shown.map((t, i) => (
            <button
              key={t.key}
              type="button"
              className={`lx-card${t.ok ? '' : ' bad'}`}
              onClick={() => setOpen(true)}
              style={pile ? {} : { left: 12 + i * 30, top: 8 + i * 9, zIndex: i + 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#667085' }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: t.ok ? '#12b76a' : '#d92d20', display: 'inline-block' }} />
                {t.kind}
                <span style={{ fontSize: 10, padding: '0 6px', borderRadius: 999, lineHeight: '16px',
                  background: t.ok ? '#ecfdf3' : '#fef3f2', color: t.ok ? '#079455' : '#d92d20' }}>
                  {t.ok ? '完成' : '失败'}
                </span>
                {t.count > 1 && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#98a2b3' }}>×{t.count}</span>}
              </div>
              <div style={{ fontSize: t.metric.length > 6 ? 15 : 23, fontWeight: 600, letterSpacing: '-.03em', marginTop: 6, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }} className="lx-metric">
                {t.metric}
                {t.unit && <span style={{ fontSize: 10.5, fontWeight: 400, color: '#98a2b3', marginLeft: 4, letterSpacing: 0 }}>{t.unit}</span>}
              </div>
              <div style={{ fontSize: 10.5, color: '#98a2b3', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.facts || (t.id ? t.id.slice(0, 12) + '…' : t.command)}
              </div>
              {t.facts && t.id && (
                <div style={{ fontSize: 10, color: '#c0c7d2', marginTop: 2, fontFamily: 'var(--ds-font-family-code,ui-monospace)' }}>
                  {t.id.slice(0, 13)}…
                </div>
              )}
            </button>
          ))}
          {rest > 0 && (
            <span style={{ position: 'absolute', right: 4, bottom: 2, fontSize: 10.5, color: '#98a2b3' }}>+{rest}</span>
          )}
        </div>
      )}
    </div>
  )
}
