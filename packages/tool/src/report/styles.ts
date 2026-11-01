/**
 * [INPUT]: 离线报告的正文与共用图表结构。
 * [OUTPUT]: REPORT_CSS，响应式阅读、原始尺寸切换与打印样式。
 * [POS]: 报告的独立样式；不依赖宿主主题或远程字体。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const REPORT_CSS = `
:root{color-scheme:light;--dsw-alias-label-secondary:#687586;--dsw-alias-label-primary:#202734}
*{box-sizing:border-box}
body{margin:0;background:#f3f5f8;color:#202734;font:16px/1.85 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:1340px;margin:32px auto;padding:40px 48px;background:#fff;border:1px solid #e2e7ee;border-radius:14px}
header{border-bottom:1px solid #e2e7ee;padding-bottom:22px;margin-bottom:30px}
header small{color:#4168a9;font-weight:600;letter-spacing:.12em}
header h1{font-size:30px;margin:10px 0 4px;line-height:1.4}
header p,footer{font-size:13px;color:#687586}
article>h1{font-size:25px}
h2{font-size:21px;margin:34px 0 14px}
h3{font-size:18px;margin:26px 0 10px}
p{margin:12px 0}
a{color:#4168a9}
code{font-size:.9em;background:#f3f5f8;padding:2px 5px;overflow-wrap:anywhere}
pre{padding:16px;background:#f3f5f8;overflow:auto}
blockquote{border-left:3px solid #aebfdb;padding-left:16px;color:#566575}
table{border-collapse:collapse;width:100%;font-size:14px}
td,th{text-align:left;padding:10px 12px;border-bottom:1px solid #e2e7ee}
th{background:#f7f9fb}
figure{margin:28px 0 34px;padding:24px;border:1px solid #dfe6ef;border-radius:10px;break-inside:avoid}
figcaption{font-size:17px;font-weight:600;margin-bottom:18px}
.chart{overflow:auto}
.chart>svg{display:block;max-width:100%;height:auto}
.chart svg{margin-left:auto;margin-right:auto}
.chart-wide>svg{min-width:800px}
.chart-readout{position:sticky;top:8px;z-index:1;background:#fff;padding:6px 0;min-height:24px;color:#4168a9;font-size:13px;overflow-wrap:anywhere}
.verified-facts summary{font-size:13px;color:#687586}
.chart rect:focus{outline:1px solid #4168a9}
.zoom-label{float:right;font-size:12px;font-weight:400;color:#687586;cursor:pointer}
.chart-zoom{accent-color:#4168a9}
figure:has(.chart-zoom:checked) .chart>svg{max-width:none;min-width:0;width:auto}
.chart:not(.chart-wide)>div>svg{max-width:640px!important}
.chart p,.chart-note{font-size:13px;color:#687586}
.chart-caption{font-size:14px;margin-top:18px}
.source{font-size:12px;color:#687586;overflow-wrap:anywhere;margin-top:14px}
details{margin:16px 0}
summary{cursor:pointer}
.table-scroll{overflow:auto}
footer{margin-top:38px;border-top:1px solid #e2e7ee;padding-top:20px}
@media(max-width:700px){main{margin:0;padding:24px 18px;border:0;border-radius:0}
header h1{font-size:25px}
figure{padding:16px 12px}
}
@media print{body{background:#fff}
main{margin:0;max-width:none;border:0;padding:0}
.chart-wide>svg{min-width:0}
.chart{overflow:visible}
details[open]{break-inside:avoid}
a{color:inherit}
}

@media print { figure:has(.chart-zoom:checked) .chart>svg { max-width:100%; min-width:0; width:100% } .zoom-label { display:none } }
`

/** 固定脚本只读 SVG title 并写入 textContent；不执行正文内容，不访问网络。 */
export const REPORT_JS = `document.querySelectorAll('.chart').forEach(chart=>{
 const readout=chart.parentElement.querySelector('.chart-readout');
 const show=event=>{const node=event.target.closest('rect,g,path');const title=node?.querySelector('title');if(title&&readout)readout.textContent=title.textContent};
 chart.addEventListener('pointerover',show);chart.addEventListener('click',show);chart.addEventListener('focusin',show);
 chart.querySelectorAll('rect:has(title)').forEach(node=>{node.setAttribute('tabindex','0');node.setAttribute('aria-label',node.querySelector('title').textContent)});
});`
