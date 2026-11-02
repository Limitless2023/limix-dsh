/**
 * [INPUT]: 本地 Markdown、报告清单与真实预测/解释/比较文件。
 * [OUTPUT]: runReportCommand；统一生成同版 HTML/Markdown，返回交付路径、预览格式与来源摘要。
 * [POS]: limix report 的宿主入口；独占创建输出，不覆盖任何已有文件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdir, open, realpath, writeFile, unlink } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { factsHtml, factsMarkdown, validateNarrative } from './facts'
import { basename, dirname, extname, resolve, join } from 'node:path'
import { renderChart, type ChartSpec } from './charts'
import { escapeHtml, renderMarkdown } from './markdown'
import { REPORT_CSS, REPORT_JS } from './styles'

const HELP = `limix report --manifest /绝对路径/报告清单.json --output /绝对路径/报告.html
本地生成带图 HTML 与同名最终 Markdown（包含核验附录），不调用预测 API、不修改输入 Markdown，不覆盖已有文件。正文原稿应使用不同文件名。
preview_paths 为浏览器可查看的 SVG，不能传给仅支持位图的 read_image；通过结果卡或浏览器查看 HTML。
可先用 report --manifest 清单.json --inspect 获取程序核验的指标、方向、日期和覆盖范围，再写正文。inspect 不需要 markdown，不写文件。
清单：{"title":"业务分析报告","markdown":"报告.md","charts":[...]}
所有文件路径相对清单目录解析；charts 可为空。正文单独一行 <!-- limix-chart:图表id --> 可指定插图位置，未指定的图追加在正文后；标记在 Markdown 阅读器中隐藏。
每张图须有 id（字母数字下划线短横线）、title、type、source，可选 caption（图的业务解读）。
type=regression 或 classification：source=预测CSV、truth=独立真值CSV、target=目标列；优先 id_column=共同样本ID列，否则核对行序后 alignment="input_order"。无真值时不要配置效果对照图。
type=forecast：source=原始预测CSV、target=原始业务目标列（如 cups_sold，对应预测列 pred_cups_sold）、date=日期列，可选 train=历史CSV、truth=真值CSV、history_points=90；真值须与预测日期逐行对齐。保留 pred_q10_<目标列>、pred_q90_<目标列> 以绘制区间阴影，不要删列。
type=explanation：source=explain 返回 explanation.detail_path 指向的完整 .view.json（单行/批量/时序贡献、有向/无向关系）；不使用原始 API JSON。
type=benchmark：source=benchmark 保存的比较JSON，包含所有数据集和运行状态。
HTML 内嵌图表和样式，可离线阅读；长图可横向滚动。正文支持标题、段落、粗体、列表、表格、代码、网页链接；原始 HTML 转义，远程图片不加载。`


export async function runReportCommand(args: string[], workdir = process.cwd(), signal?: AbortSignal, settings: { archiveRoot?: string } = {}) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { exitCode: 0, stdout: HELP, stderr: '' }
  try {
    signal?.throwIfAborted()
    const options: Record<string, string> = {}
    const inspect = args.includes('--inspect')
    args = args.filter(a => a !== '--inspect')
    for (let i = 0; i < args.length; i += 2) {
      if (!['--manifest', '--output'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('参数无效；请查看 report --help')
      options[args[i]] = args[i + 1]
    }
    if (!options['--manifest'] || (!inspect && !options['--output'])) throw new Error('需要 --manifest 和 --output')
    const manifestPath = resolve(workdir, options['--manifest']), base = dirname(manifestPath)
    const sources = new Map<string, { file: string; sha256: string }>()
    let bytes = 0
    const read = async (path: string, extension: string) => {
      if (typeof path !== 'string' || extname(path).toLowerCase() !== extension) throw new Error(`输入必须为 ${extension} 文件`)
      signal?.throwIfAborted()
      const actual = await realpath(resolve(base, path)), handle = await open(actual, 'r')
      try {
        const stat = await handle.stat()
        if (!stat.isFile() || stat.size > 50_000_000 || bytes + stat.size > 100_000_000) throw new Error('输入文件过大，或不是普通文件')
        const text = await handle.readFile('utf8'); bytes += Buffer.byteLength(text)
        if (bytes > 100_000_000) throw new Error('报告输入总大小超过 100MB')
        sources.set(actual, { file: basename(path), sha256: createHash('sha256').update(text).digest('hex') })
        return text
      } finally { await handle.close() }
    }
    const manifest = JSON.parse(await read(manifestPath, '.json'))
    if (typeof manifest.title !== 'string' || !manifest.title.trim() || (!inspect && typeof manifest.markdown !== 'string') || !Array.isArray(manifest.charts) || manifest.charts.length > 20) throw new Error('报告清单须包含 title、markdown、charts（最多 20 张图）')
    const markdownPath = inspect ? '' : await realpath(resolve(base, manifest.markdown))
    const markdown = inspect ? '' : await read(manifest.markdown, '.md'), figures = new Map<string, string>(), charts = [], previews: { id: string; svg: string }[] = []
    for (const chart of manifest.charts as ChartSpec[]) {
      if (!chart || !/^[\w-]{1,64}$/.test(chart.id) || figures.has(chart.id) || typeof chart.title !== 'string' || !chart.title.trim()) throw new Error('图表 id 须唯一，且必须有 title')
      const rendered = await renderChart(chart, read)
      const warnings = rendered.warnings.map(w => `<p class="chart-note">${escapeHtml(w)}</p>`).join('')
      const wide = chart.type === 'explanation' ? ' chart-wide' : ''
      const zoom = wide ? '<label class="zoom-label"><input class="chart-zoom" type="checkbox"> 清晰细看（横向滚动）</label>' : ''
      const graphic = rendered.html.replace(/id="(contribution-scale|arrow)"/g, `id="${chart.id}-$1"`).replace(/url\(#(contribution-scale|arrow)\)/g, `url(#${chart.id}-$1)`)
      const firstSvg = graphic.match(/<svg[\s\S]*?<\/svg>/)?.[0]
      if (firstSvg) previews.push({ id: chart.id, svg: firstSvg.includes('xmlns=') ? firstSvg : firstSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"') })
      figures.set(chart.id, `<figure id="chart-${chart.id}"><figcaption>${escapeHtml(chart.title)}${zoom}</figcaption><p class="chart-readout" role="status">悬停或点击图形查看数值；密集图可切换清晰细看。</p><div class="chart${wide}">${graphic}</div>${chart.caption ? `<p class="chart-caption">${escapeHtml(chart.caption)}</p>` : ''}${warnings}${factsHtml(rendered.facts ?? [])}<div class="source">图表来源：${escapeHtml(basename(chart.source))}</div></figure>`)
      charts.push({ id: chart.id, type: chart.type, title: chart.title, count: rendered.count, warnings: rendered.warnings, facts: rendered.facts ?? [] })
    }
    if (inspect) return { exitCode: 0, stdout: JSON.stringify({ kind: 'report_facts', charts, sources: [...sources.values()] }), stderr: '' }
    validateNarrative(markdown)
    validateNarrative(manifest.title)
    for (const chart of manifest.charts) {
      validateNarrative(chart.title)
      if (chart.caption !== undefined) {
        if (typeof chart.caption !== 'string') throw new Error('图注必须是文本')
        validateNarrative(chart.caption)
      }
    }
    const content = renderMarkdown(markdown.replace(/^(\s*)# [^\n]+\n/, '$1'), figures), date = new Date().toISOString()
    const provenance = [...sources.values()].map(s => `<li>${escapeHtml(s.file)}<br><code>${s.sha256}</code></li>`).join('')
    const scriptHash = createHash('sha256').update(REPORT_JS).digest('base64')
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; img-src data:; base-uri 'none'; form-action 'none'"><title>${escapeHtml(manifest.title)}</title><style>${REPORT_CSS}</style></head><body><main><header><small>LimiX · 分析报告</small><h1>${escapeHtml(manifest.title)}</h1><p>${charts.length} 张结果图 · 可离线阅读</p></header><article>${content}</article><footer><details><summary>数据来源与文件校验</summary><p>生成时间：${date}。图表复用结果卡的绘制逻辑；报告正文来自 ${escapeHtml(basename(markdownPath))}。</p><ul>${provenance}</ul></details></footer></main><script>${REPORT_JS}</script></body></html>`
    if (Buffer.byteLength(html) > 50_000_000) throw new Error('生成的报告超过 50MB，请减少图表数量')
    const output = resolve(workdir, options['--output'])
    if (extname(output).toLowerCase() !== '.html') throw new Error('输出必须是 .html 文件')
    signal?.throwIfAborted()
    const outputMarkdown = output.slice(0, -5) + '.md'
    const verifiedMarkdown = markdown + '\n\n## 已核验数据（程序生成）\n\n' + charts.map(c => factsMarkdown(c.title, c.facts)).join('\n\n')
    // 历史卡片使用独立副本；工作区文件被移动或清理后仍可阅读。
    const archive = join(settings.archiveRoot ?? join(homedir(), '.limix', 'reports'), randomUUID())
    await mkdir(archive, { recursive: true, mode: 0o700 })
    const stableHtml = join(archive, basename(output)), stableMarkdown = join(archive, basename(output, '.html') + '.md')
    await writeFile(stableHtml, html, { flag: 'wx', mode: 0o600 })
    await writeFile(stableMarkdown, verifiedMarkdown, { flag: 'wx', mode: 0o600 })
    const previewPaths = []
    for (const preview of previews) {
      const path = join(archive, preview.id + '.svg')
      await writeFile(path, preview.svg, { flag: 'wx', mode: 0o600 }); previewPaths.push(path)
    }
    // 两份交付文件都独占创建；失败仅移除本次创建的文件，不触碰已有输入。
    signal?.throwIfAborted()
    const created: string[] = []
    try {
      for (const [path, text] of [[output, html], [outputMarkdown, verifiedMarkdown]]) {
        const handle = await open(path, 'wx', 0o600)
        created.push(path)
        try { await handle.writeFile(text, 'utf8') } finally { await handle.close() }
      }
    } catch (error) {
      await Promise.all(created.map(path => unlink(path).catch(() => {})))
      throw error
    }
    return { exitCode: 0, stdout: JSON.stringify({ kind: 'report', status: 'succeeded', saved_to: output, markdown_saved_to: outputMarkdown, preview_format: 'svg', preview_instruction: '通过结果卡或浏览器查看 HTML/SVG；read_image 不支持 SVG。报告已生成，视觉检查需单独确认。', report_path: stableHtml, markdown_path: stableMarkdown, source_markdown_path: markdownPath, preview_paths: previewPaths, chart_count: charts.length, charts, sources: [...sources.values()] }), stderr: '' }
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error
    return { exitCode: 2, stdout: JSON.stringify({ error: error?.code === 'EEXIST' ? '输出文件已存在，请使用新文件名' : String(error.message ?? error) }), stderr: '' }
  }
}
