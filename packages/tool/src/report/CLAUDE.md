# packages/tool/src/report/

> L2 | 父级: ../CLAUDE.md

index.ts - report/inspect 命令、正文/图注文案核验、来源摘要与历史副本；独占输出，保留 HTML/Markdown/预览。
facts.ts - 程序生成指标方向、ISO 星期及解释范围；拒绝明确的正文指标/星期冲突和残缺括号。
charts.tsx - 精确匹配预测目标，拒绝错位真值与时序乱序/未来历史；复用 Agent 图表；按字段名返回平均贡献与正负样本数。
styles.ts - 离线报告样式、清晰细看与打印；固定脚本通过 CSP 哈希允许，只读取图形说明。
markdown.ts - 安全文本渲染与图表占位符；不执行 HTML，不加载远程图片。

构建时将 React 服务端渲染与共用图表打入宿主包。
运行时无需访问源码目录或安装图表依赖。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
