# packages/agent/tests/

> L2 | 父级: ../CLAUDE.md

explanation-batch.test.cjs - 验证整体分布默认入口、独立单条入口、819 个色块、带符号均值抵消与排序、缺方向、统一色阶、20 变量网络与环。
explanation-analysis.test.cjs - 单条导出范围与两组导出口径； 验证任务身份、行步边界、中性与缺方向、时序未知尺度、筛选和独立 SVG。
fixtures/explanation-batch.json - 真实 63×13 解释数据；无凭证。
fixtures/explanation-network.json - 真实 20 变量、28 条边网络。
fixtures/explanation-timeseries.json - 真实电力时序解释的第 1、2、240、480 步，保留 43 个特征与服务时间。
turn-stack.test.cjs - 验证指标缺失与帮助过滤，不从 stderr 猜数字。
pipeline-view.test.cjs - 验证 LimiX 分类与次数、接口步骤、失败原因、本地工具名、统一流程归并、官方解释模式、文件去重、运行态与异常指标；验证业务摘要、差异化标题和报告保存/修订状态。
tool-card.test.cjs - 预测值默认收起及按需核对； 验证单条双向贡献条与全屏全部因素、报告双格式下载、error-only 失败状态、帮助卡、模式隔离、解释全屏、CSV 对齐和比较部分成功。
task-files.test.cjs - 预测、解释与场景比较文件用途；相对路径、版本 ID、URL、缺失输出、同路径合并及宿主文件按钮。
fixtures/explanation-local.json - 真实单样本解释的脱敏展示数据。
fixtures/explanation-directed.json - 真实光学有向图的脱敏展示数据。
fixtures/regression-node.json - T1 会话实际输出的脱敏节点。
运行：node --test packages/agent/tests/*.test.cjs。

relationship.test.cjs - 场景分差排序、默认矩阵折叠、两组详情身份、原始表、图阈值方向、原预测分组、分类/时序隔离与详情身份校验。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

pipeline-view.test.cjs 补充登记预览失败与其他失败区分验证。

工具卡测试补充日级/小时级范围、部分评估、底栏缺失指标及基线入口。
