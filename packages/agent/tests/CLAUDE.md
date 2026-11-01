# packages/agent/tests/

> L2 | 父级: ../CLAUDE.md

explanation-batch.test.cjs - 验证 819 个色块、带符号均值抵消与排序、缺方向、统一色阶、20 变量网络与环。
explanation-analysis.test.cjs - 验证任务身份、行步边界、中性与缺方向、时序未知尺度、筛选和独立 SVG。
fixtures/explanation-batch.json - 真实 63×13 解释数据；无凭证。
fixtures/explanation-network.json - 真实 20 变量、28 条边网络。
fixtures/explanation-timeseries.json - 真实电力时序解释的第 1、2、240、480 步，保留 43 个特征与服务时间。
turn-stack.test.cjs - 验证指标缺失与帮助过滤，不从 stderr 猜数字。
pipeline-view.test.cjs - 验证 LimiX 分类与次数、接口步骤、失败原因、本地工具名、统一流程归并、官方解释模式、文件去重、运行态与异常指标；验证业务摘要、差异化标题和报告保存/修订状态。
tool-card.test.cjs - 验证报告双格式下载、error-only 失败状态、帮助卡、模式隔离、解释全屏、CSV 对齐和比较部分成功。
fixtures/explanation-local.json - 真实单样本解释的脱敏展示数据。
fixtures/explanation-directed.json - 真实光学有向图的脱敏展示数据。
fixtures/regression-node.json - T1 会话实际输出的脱敏节点。
运行：node --test packages/agent/tests/*.test.cjs。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
