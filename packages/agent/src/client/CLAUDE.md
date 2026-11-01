# packages/agent/src/client/

> L2 | 父级: ../../CLAUDE.md

index.tsx - 注册工具卡、分析过程、turnTail 与输入区引导槽位。
LimixWelcome.tsx - 空白 LimiX 会话的销量、材料性能、电价示例；通过 Portal 挂在输入框下方，卸载时移除挂载点。
LimixToolCard.tsx - 显示预测、解释或模型比较卡、图表与 JSON/CSV 下载；服务连接与参数帮助采用紧凑行，失败原因可见，详情默认折叠。
BenchmarkView.tsx - 按数据集切换指标，对比固定拆分下各模型效果；失败不补零。
use-card-fullscreen.ts - 原生 dialog 整卡放大；退出先清除模态语义，提交关闭状态后恢复焦点，保留内容与滚动。
ExplanationView.tsx - 解释入口；按稳定任务身份加载详情。切换身份立即隔离旧详情与错误。
ExplanationSingle.tsx - 单条解释外壳；提供可视化、原始数据和图表导出。
LocalExplanation.tsx - 单条贡献与分类变更；时序未知尺度隐藏业务单位及原预测差值。
ExplanationBatch.tsx - 筛选与全量同尺度对比，逐样本及原始数据视图；按原始行号跳转。
ExplanationFilter.tsx - 按需展开行范围、预测或特征原值条件；提交前校验。
ExplanationDataTable.tsx - 完整贡献与关系原值搜索、25 条分页；不截断数值精度。
ExplanationExport.tsx - 解析宿主主题，导出 SVG / PNG；失败保留可见反馈。
ContributionHeatmap.tsx - 全量色块与带符号均值；长轴名称单行斜排、中间省略，悬停/点击/键盘可读全称；中性和缺失方向使用统一语义。
ContributionLegend.tsx - 全局蓝绿数值色阶；中性灰蓝、未知灰色，翻页不改变范围。
contribution-matrix.ts - 保留行列顺序；中性计零，缺方向不补零。对比共用色阶与均值轴。
ExplanationGraph.tsx - 完整网络、目标聚焦、高亮、原始表及图片导出；说明按需展开。
ExplanationHelp.tsx - HTML 说明图标与 SVG 共用交互；即时悬停、点击固定，Esc 优先关闭说明。
explanation-data.ts - 任务身份、字段顺序及行步边界校验；统一方向和预测尺度，保留原始样本。
explanation-filter.ts - 识别有限数字字符串；分类保持类别，时序标为解释模型输出。条件求交集，不重编号。
explanation-export.ts - 独立 SVG 渲染；保留全部矩阵和关系，有向与无向说明一致。
graph-layout.ts - 强连通分组与分层坐标；保留环和孤立节点。
tool-result.ts - 工具卡与轮次摘要共用输出解析、状态与指标。
LimixPipelineView.tsx - 按轮次显示调用阶段。
LimixTurnStack.tsx - 汇总本轮任务，不计参数帮助；只展示 metrics 中的有限数值，不显示 ID。
ForecastChart.tsx - 时序预测图；显示日期对齐的本地真值。
ScatterChart.tsx - 回归散点图；指标由结果卡统一展示。
ConfusionMatrix.tsx - 分类混淆矩阵；各类别指标默认折叠。
eval-csv.ts - 分类与回归 CSV 解析。
forecast-csv.ts - 时序 CSV 解析与真值日期对齐。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
