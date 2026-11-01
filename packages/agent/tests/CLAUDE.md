# packages/agent/tests/

> L2 | 父级: ../CLAUDE.md

explanation-batch.test.cjs - 验证 819 个色块、带符号均值抵消与排序、缺方向、统一色阶、20 变量网络与环。
explanation-analysis.test.cjs - 验证任务身份、行步边界、中性与缺方向、时序未知尺度、筛选和独立 SVG。
fixtures/explanation-batch.json - 真实 63×13 解释数据；无凭证。
fixtures/explanation-network.json - 真实 20 变量、28 条边网络。
fixtures/explanation-timeseries.json - 真实电力时序解释的第 1、2、240、480 步，保留 43 个特征与服务时间。
turn-stack.test.cjs - 验证指标缺失与帮助过滤，不从 stderr 猜数字。
tool-card.test.cjs - 验证状态、帮助卡、模式隔离、解释全屏入口、指标说明折叠、CSV 日期对齐与模型比较部分成功。
fixtures/explanation-local.json - 真实单样本解释的脱敏展示数据。
fixtures/explanation-directed.json - 真实光学有向图的脱敏展示数据。
fixtures/regression-node.json - T1 会话实际输出的脱敏节点。
运行：node --test packages/agent/tests/*.test.cjs。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
