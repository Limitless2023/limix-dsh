"""真实 benchmark 结果的离线浏览视图。

[INPUT]: limix_benchmark 汇总与 manifest 来源许可；只保留 HTTP(S) 来源链接。
[OUTPUT]: write_report；无需外网资源的交互 HTML。
[POS]: benchmark 展示层，不修改拆分、预测和分数，不嵌入凭据或绝对路径。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import json
from pathlib import Path
from urllib.parse import urlsplit


def safe_source_url(value):
    """来源链接只接受完整 HTTP(S) 地址；缺省不生成可点击链接。"""
    if not isinstance(value,str) or any(ord(c)<32 or ord(c)==127 for c in value):
        return None
    try:
        parsed = urlsplit(value)
        if parsed.scheme.lower() not in ('http','https') or not parsed.hostname or parsed.username or parsed.password:
            return None
    except ValueError:
        return None
    return value


def public_dataset(dataset):
    result = {k:dataset.get(k) for k in ('id','name','task_type','target','unit','train_rows','test_rows','feature_count','split','source_name','license','citation')}
    result.update(source_url=safe_source_url(dataset.get('source_url')),
                  license_url=safe_source_url(dataset.get('license_url')))
    return result


def public_payload(summary):
    return {
        'created_at':summary['created_at'], 'status':summary['status'],
        'seed':summary['seed'], 'methodology':summary['methodology'],
        'datasets':[public_dataset(d) for d in summary['datasets']],
        'runs':[{k:r.get(k) for k in ('dataset_id','model','status','metrics','elapsed_seconds','samples')}
                for r in summary['runs']], 'versions':summary['versions']}


def write_report(summary,path):
    payload = json.dumps(public_payload(summary),ensure_ascii=False,allow_nan=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    Path(path).write_text(HTML.replace('__BENCHMARK_DATA__',payload),encoding='utf-8')


HTML = r'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LimiX · 多模型实测</title><style>
:root{color-scheme:light;--blue:#3767b2;--ink:#172338;--muted:#67758a;--line:#e2e7ef}*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:var(--ink);font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}main{max-width:1360px;margin:auto;padding:40px 36px 64px}.brand{color:var(--blue);font-weight:700;letter-spacing:.06em;font-size:13px}h1{margin:8px 0;font-size:32px;letter-spacing:-.04em}h2{font-size:17px;margin:0 0 16px}p{margin:7px 0;color:var(--muted)}.intro{margin-bottom:28px}.toolbar{display:flex;gap:18px;flex-wrap:wrap;align-items:end;margin:24px 0}label{display:flex;flex-direction:column;gap:6px;color:var(--muted);font-size:12px}select{font:inherit;font-size:14px;padding:10px 32px 10px 12px;min-width:190px;border:1px solid #ccd6e5;background:white;color:var(--ink);border-radius:8px}.meta{margin:0 0 20px;display:flex;gap:12px;flex-wrap:wrap}.pill{background:#eaf0f9;border-radius:6px;padding:5px 10px;font-size:13px;color:#3c557b}.grid{display:grid;grid-template-columns:1fr 1.2fr;gap:20px}.panel{padding:24px;background:white;border:1px solid var(--line);border-radius:12px;min-width:0}svg{width:100%;height:auto;display:block;overflow:visible}.legend{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:12px;margin:14px 0 4px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}.table{margin-top:20px;overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:right;padding:12px 10px;border-bottom:1px solid #edf0f5;white-space:nowrap}th:first-child,td:first-child{text-align:left}th{color:var(--muted);font-weight:500}td.best{font-weight:700;color:var(--blue)}.note{font-size:12px;margin-top:14px}details{margin-top:20px}summary{cursor:pointer;color:#355d98}a{color:var(--blue)}footer{margin-top:24px;font-size:12px;color:var(--muted)}.empty{padding:60px 0;text-align:center;color:var(--muted)}button{border:1px solid #d2dceb;background:#fff;color:var(--ink);padding:9px 14px;border-radius:8px;cursor:pointer}button:hover{background:#edf2fa}@media(max-width:850px){main{padding:24px 16px}.grid{grid-template-columns:1fr}h1{font-size:26px}.panel{padding:18px}}
</style><main><div class="intro"><div class="brand">LimiX / MODEL BENCHMARK</div><h1>同一批数据，多模型对比</h1><p>固定拆分、独立真值、真实服务调用。结果用于判断当前案例，单次留出不构成通用模型排名。</p></div>
<div class="toolbar"><label>业务案例<select id="dataset"></select></label><label>对比指标<select id="metric"></select></label><label>预测明细<select id="model"><option value="all">全部模型</option></select></label><button id="download">下载当前指标 CSV</button></div>
<div class="meta" id="meta"></div><div class="grid"><section class="panel"><h2 id="metricTitle"></h2><div id="bars"></div><p class="note" id="metricNote"></p></section><section class="panel"><h2 id="detailTitle"></h2><div id="detail"></div><div class="legend" id="legend"></div><p class="note" id="detailNote"></p></section></div>
<section class="panel table"><h2>指标与耗时</h2><table id="table"></table><p class="note">远端耗时包含提交、排队、轮询和下载；本地耗时为训练与预测。两者运行环境不同，不能直接比较硬件速度。上传耗时不计。</p></section>
<details class="panel"><summary>评测口径与来源</summary><div id="method"></div></details><footer id="footer"></footer></main>
<script type="application/json" id="data">__BENCHMARK_DATA__</script><script>
const D=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id),colors={LIMIX_7M:'#477bc0',LIMIX_16M:'#294a82',XGBoost:'#bd7b58',BASELINE:'#a1adba'},names={LIMIX_7M:'LimiX 7M',LIMIX_16M:'LimiX 16M',XGBoost:'XGBoost',BASELINE:'简单基线'},titles={rmse:'RMSE',mae:'MAE',r2:'R²',accuracy:'准确率',balanced_accuracy:'平衡准确率',f1_macro:'宏平均 F1',elapsed_seconds:'耗时（秒）'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=v=>v==null?'—':Number(v).toLocaleString('zh-CN',{maximumFractionDigits:4}),value=(r,k)=>k==='elapsed_seconds'?r.elapsed_seconds:r.metrics?.[k],higher=k=>['r2','accuracy','balanced_accuracy','f1_macro'].includes(k);
D.datasets.forEach(d=>$('dataset').add(new Option(d.name,d.id)));Object.keys(names).forEach(m=>$('model').add(new Option(names[m],m)));
function sourceMarkup(d){const source=d.source_url?`<a href="${esc(d.source_url)}" target="_blank" rel="noreferrer">${esc(d.source_name||'数据来源')}</a>`:esc(d.source_name||'来源未提供');const license=d.license?(d.license_url?`<a href="${esc(d.license_url)}" target="_blank" rel="noreferrer">${esc(d.license)}</a>`:esc(d.license)):'许可未提供';return `<p>${source} · ${license}</p>`}
function updateMetrics(){const d=D.datasets.find(x=>x.id===$('dataset').value),keys=d.task_type==='classification'?['accuracy','balanced_accuracy','f1_macro','elapsed_seconds']:['rmse','mae','r2','elapsed_seconds'];$('metric').replaceChildren(...keys.map(k=>new Option(titles[k],k)));render()}
function render(){const d=D.datasets.find(x=>x.id===$('dataset').value),all=D.runs.filter(r=>r.dataset_id===d.id),ok=all.filter(r=>r.status==='succeeded'),selected=ok.filter(r=>$('model').value==='all'||r.model===$('model').value),key=$('metric').value;
$('meta').innerHTML=[`${d.train_rows} 训练样本`,`${d.test_rows} 测试样本`,`${d.feature_count} 个特征`,d.task_type==='classification'?'分类':'回归',`seed ${D.seed}`].map(x=>`<span class="pill">${esc(x)}</span>`).join('');$('metricTitle').textContent=titles[key]+(higher(key)?' · 越高越好':' · 越低越好');$('metricNote').textContent=key==='elapsed_seconds'?'单次观测耗时；包含远端服务等待。':'所有分数均由同一份独立真值计算。简单基线只使用训练集。';
const chart=ok.filter(r=>value(r,key)!=null),vals=chart.map(r=>value(r,key)),min=Math.min(0,...vals),max=Math.max(...vals,0.001),range=max-min||1,x=v=>132+(v-min)/range*270;let svg='<svg viewBox="0 0 470 245" role="img" aria-label="模型指标对比">';svg+=`<line x1="${x(0)}" y1="15" x2="${x(0)}" y2="215" stroke="#cdd6e2"/>`;chart.forEach((r,i)=>{let v=value(r,key),y=28+i*49;svg+=`<text x="0" y="${y+17}" fill="#526174" font-size="12">${esc(names[r.model])}</text><rect x="${Math.min(x(0),x(v))}" y="${y}" width="${Math.max(1,Math.abs(x(v)-x(0)))}" height="26" rx="3" fill="${colors[r.model]}"/><text x="${Math.max(x(v),x(0))+7}" y="${y+18}" fill="#26354b" font-size="11">${num(v)}</text>`});svg+='</svg>';$('bars').innerHTML=chart.length?svg:'<div class="empty">暂无成功结果</div>';
const keys=d.task_type==='classification'?['accuracy','balanced_accuracy','f1_macro','elapsed_seconds']:['mae','rmse','r2','elapsed_seconds'];$('table').innerHTML='<thead><tr><th>模型</th>'+keys.map(k=>`<th>${esc(titles[k])}</th>`).join('')+'<th>状态</th></tr></thead><tbody>'+all.map(r=>'<tr><td>'+esc(names[r.model])+'</td>'+keys.map(k=>`<td>${num(value(r,k))}</td>`).join('')+`<td>${esc(r.status==='succeeded'?'已完成':r.status==='pending'?'等待 / 可续查':'失败')}</td></tr>`).join('')+'</tbody>';
$('legend').innerHTML=selected.map(r=>`<span><i class="dot" style="background:${colors[r.model]}"></i>${esc(names[r.model])}</span>`).join('');renderDetail(d,selected);$('method').innerHTML='<p>'+esc(d.split)+'</p>'+Object.values(D.methodology).map(s=>`<p>${esc(s)}</p>`).join('')+sourceMarkup(d)+`<p>${esc(d.citation)}</p><p>版本：${esc(Object.entries(D.versions).map(([k,v])=>k+' '+v).join(' · '))}</p>`;$('footer').textContent='生成时间：'+D.created_at+' · 此页面包含离线结果，不会调用 API。'}
function renderDetail(d,runs){if(!runs.length){$('detail').innerHTML='<div class="empty">该模型没有成功预测</div>';return}if(d.task_type==='classification'){$('detailTitle').textContent='分类正确率 · 按真实类别';const labels=[...new Set(runs.flatMap(r=>r.samples.map(s=>String(s.truth))))].sort();let svg='<svg viewBox="0 0 560 245" role="img" aria-label="各类别预测正确率">';labels.forEach((l,i)=>{const y=28+i*92;svg+=`<text x="0" y="${y+12}" font-size="12" fill="#536174">真实类别 ${esc(l)}</text>`;runs.forEach((r,j)=>{const subset=r.samples.filter(s=>String(s.truth)===l),p=subset.filter(s=>Number.isFinite(Number(s.truth))?Number(s.truth)===Number(s.prediction):String(s.truth)===String(s.prediction)).length/subset.length;svg+=`<rect x="105" y="${y+j*17}" width="${p*350}" height="11" rx="2" fill="${colors[r.model]}"/><text x="${110+p*350}" y="${y+9+j*17}" font-size="9" fill="#536174">${(p*100).toFixed(1)}%</text>`})});$('detail').innerHTML=svg+'</svg>';$('detailNote').textContent='每个类别单独计算召回率；用于发现整体准确率掩盖的偏差。';return}
$('detailTitle').textContent='预测误差分布';const vals=runs.flatMap(r=>r.samples.map(s=>Number(s.error))),lo=Math.min(...vals,0),hi=Math.max(...vals,0),span=hi-lo||1,x=i=>48+i/Math.max(1,d.test_rows-1)*460,y=v=>204-(v-lo)/span*170;let svg='<svg viewBox="0 0 560 245" role="img" aria-label="全部测试样本预测误差">';svg+=`<line x1="48" y1="${y(0)}" x2="515" y2="${y(0)}" stroke="#bcc8da" stroke-dasharray="4 4"/><text x="2" y="30" fill="#6b7890" font-size="10">预测 − 真值</text><text x="260" y="238" fill="#6b7890" font-size="10">测试样本顺序</text><text x="9" y="48" fill="#6b7890" font-size="10">${num(hi)}</text><text x="9" y="206" fill="#6b7890" font-size="10">${num(lo)}</text>`;runs.forEach(r=>r.samples.forEach((s,i)=>{svg+=`<circle cx="${x(i)}" cy="${y(s.error)}" r="2.3" fill="${colors[r.model]}" opacity=".6"><title>${esc(names[r.model])} · 样本 ${s.sample} · 真实 ${num(s.truth)} · 预测 ${num(s.prediction)} · 误差 ${num(s.error)}</title></circle>`}));$('detail').innerHTML=svg+'</svg>';$('detailNote').textContent='每个点是一条测试样本，靠近零线表示误差更小；悬停查看数值。'}
$('dataset').onchange=updateMetrics;$('metric').onchange=render;$('model').onchange=render;$('download').onclick=()=>{const d=$('dataset').value,rows=D.runs.filter(r=>r.dataset_id===d),cols=['model','status','mae','rmse','r2','accuracy','balanced_accuracy','f1_macro','elapsed_seconds'];const csv=[cols.join(','),...rows.map(r=>cols.map(k=>k in r?r[k]:(r.metrics?.[k]??'')).join(','))].join('\r\n'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=d+'-metrics.csv';a.click();URL.revokeObjectURL(url)};updateMetrics();
</script></html>'''
