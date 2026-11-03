# packages/agent/src/client/

> L2 | 父级: ../../CLAUDE.md

index.tsx - 注册工具卡、任务流程、turnTail 与输入区引导；为流程注入会话授权文件预览。
LimixWelcome.tsx - 空白 LimiX 会话的销量、材料性能、电价示例；通过 Portal 挂在输入框下方，卸载时移除挂载点。
LimixToolCard.tsx - 运行态正圆（覆盖宿主 corner-shape）、任务文案与本次界面等待计时； 预测、解释、比较与报告卡；报告优先历史副本，缺失时提示并回退同版文件；提供受控图表预览；差效果与执行状态分开。下载 JSON/CSV/HTML/Markdown。辅助卡采用紧凑行，失败可见，详情默认折叠。
BenchmarkView.tsx - 切换数据集和指标；staticView 供离线报告复用，隐藏无脚本的选择器；失败不补零。
use-card-fullscreen.ts - 原生 dialog 整卡放大；退出先清除模态语义，提交关闭状态后恢复焦点，保留内容与滚动。
ExplanationView.tsx - 解释入口；全屏网络/矩阵共享弹性高度并预留底栏；底部原始数据切换读取同一详情；按稳定任务身份加载详情。切换身份立即隔离旧详情与错误。
PredictionCheck.tsx - 更多菜单按需打开核对表；当前样本或范围、类别变化和时序尺度共用契约。
ExplanationSingle.tsx - 单条解释外壳；提供可视化、原始数据和图表导出。
LocalExplanation.tsx - 因素标题与右侧样本切换同行，移除重复标题；主视图不显示预测值；单条贡献按绝对值排序的双向条形图，普通卡六项、全屏全部；分类变更；时序未知尺度隐藏业务单位及原预测差值。
ExplanationBatch.tsx - 影响因子热力图与独立单条解释；原始数据由卡片底栏控制；统一工具栏文字及共线选中指示，右上依次显示选择样本、下拉框、前后切换；筛选分组纯文字入口折叠，返回保留选中行；回归预测中位数分组与结论；分组说明展示来源、分界、组数与清除手动筛选行为。
ExplanationFilter.tsx - 按需展开行范围、预测或特征原值条件；提交前校验。
ExplanationDataTable.tsx - 完整贡献、双场景分数与关系原值搜索、25 条分页；不截断数值精度。
ActionMenu.tsx - SVG 箭头居中并随展开翻转； 解释卡共用原生折叠菜单；外部点击、选择操作与 Esc 关闭。
ExplanationExport.tsx - 菜单选择 SVG/PNG，可注入原始数据入口； 解析宿主主题，导出 SVG / PNG；失败保留可见反馈。
ContributionHeatmap.tsx - 双图标题统一，显示设置与样本数同行；中间竖向色阶方向和数值分行，全屏使用剩余高度；悬停底部读数；点击色块整行高亮与精简邻近详情，右侧入口查看单条，右侧固定当前范围均值；显式按钮进入样本；概览与清晰细看切换；全部色块与带符号均值；长轴名称单行斜排、中间省略，悬停/点击/键盘可读全称；中性和缺失方向使用统一语义。
ContributionLegend.tsx - 全局蓝绿数值色阶；中性灰蓝、未知灰色，翻页不改变范围。
contribution-matrix.ts - 保留行列顺序；中性计零，缺方向不补零。对比共用色阶与均值轴。
ExplanationGraph.tsx - 单行工具栏与剩余空间自适应全屏网络、点击变量后按该变量聚焦、右下计数、高亮边分数、橙色选中连线、右下原值面板、原始表及图片导出；说明按需展开。
ExplanationHelp.tsx - HTML 说明图标与 SVG 共用交互；即时悬停、点击固定，Esc 优先关闭说明。
explanation-data.ts - 任务身份、字段顺序及行步边界校验；统一方向和预测尺度，保留原始样本；场景详情核对两组身份与矩阵；精简回执先校验完整文件 SHA256。
explanation-filter.ts - 识别有限数字字符串；分类保持类别，时序标为解释模型输出。条件求交集，不重编号。
explanation-export.ts - 独立 SVG 渲染；单条只导出选中样本双向贡献图，高低组使用独立组名；矩阵行高与排行解耦，轴名精简、全称可读；保留全部矩阵和关系，有向与无向说明一致。
graph-layout.ts - 强连通分层、重心排序及画布比例自适应且限制最大间距；孤立节点保留并紧凑排列。
tool-result.ts - 工具卡与任务流程共用输出解析、状态与指标；识别本地 error-only 失败，错误 JSON 可位于进度日志之后。
LimixPipelineView.tsx - 单一业务流程；按请求顺序展示步骤，原始请求折叠，不截取回复充当结论。
PipelineParts.tsx - 紧凑流程行、浅蓝底 LimiX 来源标签、右侧结果入口与报告强调；输入/执行/结果详情；失败常显，按需挂载既有结果卡，文件交给宿主预览。
pipeline-flow.ts - 从工具事实归并数据处理、预测、因果解释、结果分析与报告；辅助操作和报告复核归入所属步骤；按操作对象区分预测核对与归因解读，摘要描述已返回动作及实际产物。
pipeline-model.ts - 按轮次组织节点；stages 供流程归并，timeline 保留节点顺序；未结束轮次显示运行中。
pipeline-stage.ts - 单次工具调用的业务翻译；解释与比较分类、接口步骤、结果行，只读成功组的有限 metrics。
flow-navigation.ts - 当前会话页签跳转与一次性阶段定位请求。
LimixTurnStack.tsx - 默认三项业务任务，辅助调用折叠，按阶段定位本轮流程； 汇总本轮任务，不计参数帮助；只展示 metrics 中的有限数值，不显示 ID。
ForecastChart.tsx - 时序预测图；显示日期对齐的本地真值。
ScatterChart.tsx - 回归散点图；指标由结果卡统一展示。
ConfusionMatrix.tsx - 分类混淆矩阵；各类别指标默认折叠。
eval-csv.ts - 分类与回归 CSV 解析。
forecast-csv.ts - 时序 CSV 解析与真值日期对齐。

RelationshipView.tsx - 关系网络默认主视图、右侧关系矩阵辅助入口、紧凑原值散点与两组共同阈值对比默认展示分差排名双条，按需展开同坐标散点；分组口径和关系矩阵收进标题右侧更多菜单；显示设置默认折叠，切换节点清除选边。
relationship-data.ts - 阈值筛选与关系结论纯函数；不推断干预收益。
ExplanationInsight.tsx - 单条/批量贡献结论、两组均值差异和回归预测中位数分组。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

成功报告的已登记预览检查失败单独提示；不将其他失败降级为预览问题。
