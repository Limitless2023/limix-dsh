/**
 * [INPUT]: Agent 保存的 Markdown 正文与已验证的图表占位符。
 * [OUTPUT]: 转义后的报告正文；支持标题、列表、表格、代码和链接。
 * [POS]: 离线报告的文本层；不执行原始 HTML，不加载远程图片。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function inline(text: string): string {
  // 先分离代码和链接，再转义普通文字，避免二次解析用户提供的标签。
  return text.split(/(`[^`]+`|!?\[[^\]]*\]\([^\s)]+\))/g).map(part => {
    if (part.startsWith('`') && part.endsWith('`')) return `<code>${escapeHtml(part.slice(1, -1))}</code>`
    const link = part.match(/^(!?)\[([^\]]*)\]\(([^\s)]+)\)$/)
    if (link) {
      const [, image, label, url] = link
      if (!image && /^(https?:\/\/|#)/i.test(url)) return `<a href="${escapeHtml(url)}" rel="noreferrer">${escapeHtml(label)}</a>`
      return escapeHtml(label || url)
    }
    return escapeHtml(part).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  }).join('')
}

export function renderMarkdown(markdown: string, figures: Map<string, string>): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n'), blocks: string[] = [], used = new Set<string>()
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(s => inline(s.trim()))
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const figure = line.match(/^<!--\s*limix-chart:([\w-]+)\s*-->$/) ?? line.match(/^\{\{chart:([\w-]+)\}\}$/)
    if (figure) {
      if (!figures.has(figure[1])) throw new Error(`正文引用了未配置的图表：${figure[1]}`)
      if (used.has(figure[1])) throw new Error(`正文重复引用图表：${figure[1]}`)
      blocks.push(figures.get(figure[1])!); used.add(figure[1]); continue
    }
    if (line.startsWith('```')) {
      const code: string[] = []
      while (++i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i])
      blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) { const n = heading[1].length; blocks.push(`<h${n}>${inline(heading[2])}</h${n}>`); continue }
    if (/^[-*_]{3,}$/.test(line)) { blocks.push('<hr>'); continue }
    if (line.includes('|') && /^\|?\s*:?-{3,}[-: |]*$/.test(lines[i + 1]?.trim() ?? '')) {
      const head = cells(line), body: string[] = []; i++
      while (i + 1 < lines.length && lines[i + 1].trim().includes('|')) body.push(`<tr>${cells(lines[++i]).map(c => `<td>${c}</td>`).join('')}</tr>`)
      blocks.push(`<div class="table-scroll"><table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table></div>`); continue
    }
    const list = line.match(/^(?:([-*+])|\d+[.)])\s+(.+)$/)
    if (list) {
      const tag = list[1] ? 'ul' : 'ol', items = [`<li>${inline(list[2])}</li>`]
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim().match(tag === 'ul' ? /^[-*+]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/)
        if (!next) break
        items.push(`<li>${inline(next[1])}</li>`); i++
      }
      blocks.push(`<${tag}>${items.join('')}</${tag}>`); continue
    }
    blocks.push(line.startsWith('> ') ? `<blockquote>${inline(line.slice(2))}</blockquote>` : `<p>${inline(line)}</p>`)
  }
  for (const [id, figure] of figures) if (!used.has(id)) blocks.push(figure)
  return blocks.join('\n')
}
