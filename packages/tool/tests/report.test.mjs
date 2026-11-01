/**
 * [INPUT]: 构建后的报告入口；临时 Markdown、CSV 与解释结果。
 * [OUTPUT]: 离线图表、样本对齐、路径保护、转义和下载通道契约测试。
 * [POS]: report 工作流测试，不调用生产 API。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm, symlink, link } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, runReportCommand } from '../lib/index.js'

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'limix-report-'))
  const put = (name, data) => writeFile(join(root, name), typeof data === 'string' ? data : JSON.stringify(data))
  const local = { mode: 'local', target: 'y', feature_names: ['x'], requested_count: 2, explained_count: 2,
    samples: [{ row_number: 1, prediction: 2, scores: [.4], directions: [-1] }, { row_number: 2, prediction: 3, scores: [.2], directions: [1] }] }
  try {
    await put('body.md', '# 报告\n\n**核心结论**\n\n{{chart:reg}}\n\n| 模型 | 分数 |\n| --- | --- |\n| LimiX | 1 |')
    await put('pred.csv', 'id,pred_label\na,2\nb,3\n'); await put('truth.csv', 'id,y\na,1\nb,4\n')
    await put('forecast.csv', 'date,pred_y,pred_q10_y,pred_q90_y\n2026-02-01,2,1,3\n2026-02-02,3,2,4\n')
    await put('history.csv', 'date,y\n2026-01-31,1\n'); await put('future.csv', 'date,y\n2026-02-01,2\n2026-02-02,4\n')
    await put('local.view.json', local)
    await put('graph.view.json', { mode: 'directed', target: 'y', nodes: ['x', 'y', 'isolated'], edges: [{ source: 'x', target: 'y', weight: .4 }] })
    await put('benchmark.json', { kind: 'benchmark', datasets: [{ id: 'd', name: '固定拆分', task_type: 'regression', train_rows: 20, test_rows: 2, feature_count: 1 }], runs: [{ dataset_id: 'd', model: 'LIMIX_16M', status: 'succeeded', metrics: { rmse: 1, mae: 1, r2: -.5 } }, { dataset_id: 'd', model: 'XGBoost', status: 'failed', error: '依赖缺失' }] })
    const spec = { title: '报告 <安全>', markdown: 'body.md', charts: [
      { id: 'reg', type: 'regression', title: '预测效果', source: 'pred.csv', truth: 'truth.csv', target: 'y', id_column: 'id' },
      { id: 'cls', type: 'classification', title: '分类效果', source: 'pred.csv', truth: 'truth.csv', target: 'y', id_column: 'id' },
      { id: 'time', type: 'forecast', title: '预测趋势', source: 'forecast.csv', train: 'history.csv', truth: 'future.csv', target: 'y', date: 'date' },
      { id: 'local', type: 'explanation', title: '贡献', source: 'local.view.json' },
      { id: 'graph', type: 'explanation', title: '关系', source: 'graph.view.json' },
      { id: 'compare', type: 'benchmark', title: '比较', source: 'benchmark.json' },
    ] }
    const run = async (output = 'report.html') => { await put('manifest.json', spec); return runReportCommand(['--manifest', 'manifest.json', '--output', output], root, undefined, { archiveRoot: join(root, 'versions') }) }
    await fn({ root, put, spec, run, local })
  } finally { await rm(root, { recursive: true, force: true }) }
}

test('六类图复用真实文件，HTML 无外部资源，Markdown 不改写，失败模型不补零', () => fixture(async ({ root, run }) => {
  const before = await readFile(join(root, 'body.md'), 'utf8'), result = await run()
  assert.equal(result.exitCode, 0, result.stdout)
  const data = JSON.parse(result.stdout), html = await readFile(data.saved_to, 'utf8')
  assert.equal(data.chart_count, 6)
  assert.equal((html.match(/<svg\b/g) ?? []).length, 6)
  assert.match(html, /各影响因子影响分数对比/)
  assert.match(html, /isolated/)
  assert.match(html, /XGBoost/); assert.match(html, /失败/)
  assert.match(html, /<table>/)
  assert.doesNotMatch(html, /<select|<link|<img|NaN/)
  assert.equal(await readFile(join(root, 'body.md'), 'utf8'), before)
  assert.ok(data.sources.every(s => /^[a-f0-9]{64}$/.test(s.sha256)))
}))

test('输出独占创建，拒绝覆盖已有文件、软链接与硬链接，含扩展名伪装', () => fixture(async ({ root, put, run }) => {
  await put('input.html', 'training data')
  await symlink(join(root, 'input.html'), join(root, 'alias.html'))
  await link(join(root, 'input.html'), join(root, 'hard.html'))
  for (const output of ['input.html', 'alias.html', 'hard.html', 'truth.csv']) assert.equal((await run(output)).exitCode, 2)
  assert.equal(await readFile(join(root, 'input.html'), 'utf8'), 'training data')
  assert.equal((await run()).exitCode, 0); assert.equal((await run()).exitCode, 2)
}))

test('同数量错序 ID、时序日期错位和缺失数据均拒绝，不输出误导图表', () => fixture(async ({ root, put, run, spec }) => {
  await put('truth.csv', 'id,y\nb,1\na,4\n')
  assert.match((await run()).stdout, /样本 ID/)
  await put('truth.csv', 'id,y\na,1\nb,4\n')
  await put('future.csv', 'date,y\n2026-02-02,2\n2026-02-01,4\n')
  assert.match((await run()).stdout, /日期未逐行对齐/)
  spec.charts = spec.charts.slice(0, 1)
  await put('truth.csv', 'id,y\na,\nb,4\n')
  assert.match((await run()).stdout, /缺失/)
  await assert.rejects(readFile(join(root, 'report.html')), { code: 'ENOENT' })
}))

test('多预测列只读取指定目标，兼容平台 pred_label；缺少目标不猜其他预测列', () => fixture(async ({ root, put, spec }) => {
  spec.charts = [spec.charts[0]]
  await put('manifest.json', spec)
  await put('truth.csv', 'id,y\na,1\nb,2\n')
  await put('pred.csv', 'id,pred_x,pred_y\na,1,10\nb,2,20\n')
  const inspect = () => runReportCommand(['--manifest','manifest.json','--inspect'],root)
  const first = JSON.parse((await inspect()).stdout)
  assert.equal(first.charts[0].facts.find(f => f.name === 'MAE').value, 13.5)
  await put('pred.csv', 'id,pred_x\na,1\nb,2\n')
  assert.equal((await inspect()).exitCode, 2)
  await put('pred.csv', 'id,pred_y,pred_label\na,10,1\nb,20,2\n')
  assert.equal(JSON.parse((await inspect()).stdout).charts[0].facts.find(f => f.name === 'MAE').value, 0)
}))

test('时序报告误填预测列时提示原始目标，并保留分位数', () => fixture(async ({ root, put, spec, run }) => {
  await put('body.md', '# 时序报告')
  spec.charts = [spec.charts.find(c => c.type === 'forecast')]
  spec.charts[0].target = 'pred_y'
  assert.match((await run()).stdout, /缺少预测列 pred_pred_y.*原始业务目标列/)
  spec.charts[0].target = 'y'
  assert.equal((await run()).exitCode, 0)
  assert.match(await readFile(join(root, 'report.html'), 'utf8'), /P10/)
}))

test('时序报告拒绝乱序、未来历史和无效日期，接受 ISO 日期时间', () => fixture(async ({ root, put, spec }) => {
  spec.charts = [spec.charts.find(c => c.type === 'forecast')]
  delete spec.charts[0].truth
  await put('manifest.json', spec)
  const inspect = () => runReportCommand(['--manifest','manifest.json','--inspect'],root)
  await put('history.csv', 'date,y\n2026-02-04,200\n2026-02-03,100\n')
  assert.match((await inspect()).stdout, /严格递增/)
  await put('history.csv', 'date,y\n2026-02-01,100\n')
  assert.match((await inspect()).stdout, /必须早于预测/)
  await put('history.csv', 'date,y\n2026-01-31,100\n')
  for (const dates of [['2026-02-02','2026-02-01'],['2026-02-30','2026-03-01'],['2026-02-01T24:01:00','2026-02-02T00:00:00']]) {
    await put('forecast.csv', `date,pred_y\n${dates[0]},2\n${dates[1]},3\n`)
    assert.equal((await inspect()).exitCode, 2)
  }
  await put('history.csv', 'date,y\n2026-02-01T07:00:00+08:00,100\n')
  await put('forecast.csv', 'date,pred_y\n2026-02-01T00:00:00Z,2\n2026-02-02 00:00:00,3\n')
  assert.equal((await inspect()).exitCode, 0)
}))

test('未知占位符不静默漏图，正文及字段名不能注入 HTML', () => fixture(async ({ root, put, run, spec, local }) => {
  await put('body.md', '{{chart:missing}}')
  assert.match((await run()).stdout, /未配置/)
  await put('body.md', '<script>alert(1)</script>\n\n[链接](javascript:alert)\n\n![图片](https://example.com/track.png)')
  local.labels = { x: '<img src=x onerror=alert(1)>' }; await put('local.view.json', local)
  const result = await run(), html = await readFile(join(root, 'report.html'), 'utf8')
  assert.equal(result.exitCode, 0)
  assert.doesNotMatch(html, /<img|href="javascript:|src="https:/)
  assert.match(html, /&lt;script&gt;/)
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  assert.equal(scripts.length, 1)
  assert.doesNotMatch(scripts[0][1], /alert\(1\)/)
  assert.ok(html.includes("script-src 'sha256-" + createHash('sha256').update(scripts[0][1]).digest('base64') + "'"))
  assert.match(html, /&lt;img/)
}))

test('部分解释注明覆盖数量，时序未知尺度保留说明，无真值预测不冒充评估', () => fixture(async ({ put, run, spec, local }) => {
  local.requested_count = 3
  local.task_type = 'timeseries'
  await put('local.view.json', local)
  spec.charts = spec.charts.filter(c => ['local', 'time'].includes(c.id)); delete spec.charts[0].truth
  await put('body.md', '本次结果')
  const result = await run(); assert.equal(result.exitCode, 0, result.stdout)
  const warnings = JSON.parse(result.stdout).charts.flatMap(c => c.warnings).join(' ')
  assert.match(warnings, /已解释 2 \/ 3/); assert.match(warnings, /不能评估误差/); assert.match(warnings, /不换算/)
}))

test('宿主 report 入口可调用且只下载已登记报告，保留附件与安全响应头', () => fixture(async ({ root, run, spec, put }) => {
  let limix; const routes = []
  apply({ limixDatasource: { register() {} }, tools: { register: t => { limix = t } }, commands: { register() {} }, systemPrompt: { section() {} }, effect: fn => fn(), webServer: { register: route => routes.push(route) } }, { csvRoots: [root], preparePython: false })
  assert.ok(limix.parameters.properties.command.enum.includes('report'))
  await put('manifest.json', spec)
  const result = await limix.execute({ command: 'report', args: ['--manifest', 'manifest.json', '--output', 'host.html'], workdir: root }, {})
  assert.equal(result.exitCode, 0, result.stdout)
  const route = routes.find(r => r.path === '/limix-ui/report')
  let status, headers, body
  const res = { writeHead: (s, h) => { status = s; headers = h }, end: b => { body = b } }
  await route.handler({ method: 'GET', url: '/?path=' + encodeURIComponent(join(root, 'host.html')) }, res)
  assert.equal(status, 200); assert.match(headers['content-disposition'], /attachment/); assert.match(headers['content-security-policy'], /sandbox/); assert.match(body.toString(), /<svg/)
  await put('private.html', 'private')
  await route.handler({ method: 'GET', url: '/?path=' + encodeURIComponent(join(root, 'private.html')) }, res)
  assert.equal(status, 404)
  const preview = routes.find(r => r.path === '/limix-ui/report-preview')
  const report = JSON.parse(result.stdout)
  await preview.handler({method:'GET',url:'/?path='+encodeURIComponent(report.preview_paths[0])},res)
  assert.equal(status,200); assert.equal(headers['content-type'],'image/svg+xml'); assert.match(body.toString(),/<svg/)
  await put('private.svg','<svg/>')
  await preview.handler({method:'GET',url:'/?path='+encodeURIComponent(join(root,'private.svg'))},res)
  assert.equal(status,404)
  await preview.handler({method:'POST',url:'/'},res); assert.equal(status,405)
  const availability = routes.find(r => r.path === '/limix-ui/report-status')
  const statusUrl='/?path='+encodeURIComponent(report.report_path)+'&fallback='+encodeURIComponent(report.saved_to)
  await availability.handler({method:'GET',url:statusUrl},res)
  assert.equal(JSON.parse(body).status,'available')
  await rm(report.report_path)
  await availability.handler({method:'GET',url:statusUrl},res)
  assert.equal(JSON.parse(body).status,'fallback')
  await rm(report.saved_to)
  await availability.handler({method:'GET',url:statusUrl},res)
  assert.equal(JSON.parse(body).status,'missing')

  const help = await limix.execute({ command: 'report', args: ['--help'] }, {})
  assert.equal(help.exitCode, 0); assert.match(help.stdout, /explanation.detail_path/)
}))


test('inspect 不要求 Markdown，不写输出，指标方向与真实日期由程序返回', () => fixture(async ({ root, put, spec }) => {
  delete spec.markdown
  await put('manifest.json', spec)
  const result = await runReportCommand(['--manifest', 'manifest.json', '--inspect'], root)
  assert.equal(result.exitCode, 0, result.stdout)
  const data = JSON.parse(result.stdout)
  assert.match(JSON.stringify(data), /拟合优度；越高越好/)
  assert.match(JSON.stringify(data), /2026-02-01.*周日/)
  assert.match(JSON.stringify(data), /正向 1 个，负向 1 个，中性 0 个/)
  await assert.rejects(readFile(join(root, 'report.html')), { code: 'ENOENT' })
}))

test('工作区报告删除后历史副本和 Markdown 仍可读，每版独立且只有一个主标题', () => fixture(async ({ root, run }) => {
  const first = JSON.parse((await run('first.html')).stdout)
  const original = await readFile(first.report_path)
  const second = JSON.parse((await run('second.html')).stdout)
  const third = JSON.parse((await run('third.html')).stdout)
  assert.equal(new Set([first.report_path, second.report_path, third.report_path]).size, 3)
  assert.deepEqual(await readFile(first.report_path), original)
  assert.notEqual(first.report_path, second.report_path)
  await rm(first.saved_to)
  const html = await readFile(first.report_path, 'utf8')
  assert.equal((html.match(/<h1>/g) ?? []).length, 1)
  assert.match(await readFile(first.markdown_path, 'utf8'), /已核验数据（程序生成）/)
  assert.equal(first.preview_paths.length, 6)
  assert.match(await readFile(first.preview_paths[0], 'utf8'), /xmlns=/)
}))

test('正文指标方向、日期星期与残缺括号在落盘前被阻止', () => fixture(async ({ put, run, root, spec }) => {
  for (const text of ['R² 越低越好。','RMSE 越高越好。','2026-02-01（周一）','材料性能（尚未结束']) {
    await put('body.md',text)
    assert.match((await run()).stdout,/正文核验未通过/)
    await assert.rejects(readFile(join(root,'report.html')),{code:'ENOENT'})
  }
  await put('body.md','本次结果')
  spec.charts[0].caption='R² 越低越好'
  assert.match((await run()).stdout,/正文核验未通过/)
  delete spec.charts[0].caption
  await put('body.md','R² 0.9145（三项中误差越低越好、R² 越高越好）。')
  assert.equal((await run()).exitCode,0)
}))
