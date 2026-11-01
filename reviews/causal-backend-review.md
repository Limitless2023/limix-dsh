<!--
[INPUT]: 解释 CLI、宿主下载边界、离线测试及既有真实响应。
[OUTPUT]: 可复现缺陷、修复建议和验证边界。
[POS]: 独立后端交叉审查；不提交生产任务，不修改产品代码。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 因果解释后端交叉审查

审查日期：2026-11-01。审查者：独立 subagent `causal_mcp`。

复核结论：本报告列出的 3 项缺陷均已修复并通过针对性离线验证。当前审查范围内没有未关闭的阻塞项。

审查范围：`packages/tool/assets/limix_explain*.py`、`limix.py`、`src/host/{tool,explain-command,csv-access}.js`、`src/index.ts` 和对应测试。另核对独立 MCP 仓库的工具发现及时序入口。

读取并遵守 `~/.codex/CODING.md`、项目根地图和 tool/assets/src/host/tests 地图。审查未调用生产提交、未操作 UI、未修改产品代码。缺陷通过 Mock 或既有响应离线复现。

## 发现

### [P1] 无原回执恢复表格任务，会把新数据绑定到旧解释

位置：`packages/tool/assets/limix_explain.py:190–201`；`limix_explain_batch.py:79–86`。行号指审查开始时版本。

触发：指定旧任务的 `--task-id`，使用新输出路径，并传入同列名、同行数的另一份 CSV。

现有分支直接用新参数建立回执。它没有核对旧任务的 `train_data_version_id` 和 `explain_data_version_id`。局部结果只校验目标、特征集合和样本维度，然后附上新 CSV 的特征值、原始行号及原预测。

离线复现使用已成功的钢材响应。构造 3 行、13 个同名特征的新 CSV，全部值设为 `999`。传入旧任务 ID、`--rows all` 和新输出路径。运行成功，输出同时包含：

```json
{"feature_name":"c","feature_value":"999","prediction":1089.93359375,"receipt_has_request":false}
```

整个复现只有一次模拟 GET，没有上传或 POST。旧响应明确含 `explain_data_version_id=06f7a384e3e9e5de29ce1b37a1e0f8a8`，该版本没有与新 CSV 建立关系。

建议：表格恢复要求原回执，或先验证服务数据版本与输入的对应关系。无证据时只返回原始结果，不附本地特征值、原预测或用户指定行号。时序已有 `result_version_id` 一致性校验，不受该分支影响。

修复复核：`limix_explain.py:219–224` 现在要求表格和关系续查具有原回执。审查者分别检查 local、directed、undirected；无回执时全部在网络前拒绝，且不创建回执或产物。原有时序版本引用恢复保留。

状态：已修复并通过针对性离线复核。

### [P2] 提交响应丢失后，原回执不能绑定找回的任务 ID

位置：`packages/tool/assets/limix_explain.py:190–193,221–224`。行号指审查开始时版本。

触发：解释 POST 已发出，但响应超时或连接中断。原回执保留完整 `request` 和 `context`，其中 `task_id` 仍为 `null`。从历史找到任务后，用同参数、同输出路径和 `--task-id` 续查。

现有检查把 `null != 找回的ID` 判为冲突，直接退出。它不会 GET 验证任务。报错要求“使用新文件名”，这会绕过原回执并进入上一项的错绑分支。

离线复现：让首次模拟 POST 抛出 `SystemExit(4)`，随后指定 `--task-id recovered-task`。得到退出码 1、零次 GET，错误为“输出已有任务回执；请使用新文件名，或带原 --task-id 续查”。

建议：允许缺 ID 但有原请求的回执进入只读核验。核对服务返回的来源版本、模式、目标和模型后再绑定任务 ID。不能自动再次 POST，也不能仅按“最新任务”猜测。

修复复核：`limix_explain.py:182–195,257–261` 增加候选任务核验。有原请求且缺任务 ID 时只执行 GET。模式、任务类型、来源版本、目标、特征、模型、时序结果版本和显式阈值均须匹配，随后才绑定回执。缺字段或值不匹配时保留未绑定回执，不写结果，不重提。

审查者使用既有钢材 local、光学 directed 和时序 local 响应，分别核验正确匹配、每个请求字段缺失、每个请求字段错误、任务 ID 错误及任务类型错误。光学测试包含显式阈值。全部通过。仓库回归测试另覆盖错误来源不绑定、正确来源绑定以及全程只有 GET。

状态：已修复并通过针对性离线复核。

### [P2] 真实时序原始 JSON 超过 5 MB，下载返回 404

位置：审查开始时 `packages/tool/src/host/csv-access.js:13,50`、`src/index.ts:33,45–46`。

触发：下载现有真实时序任务的原始 JSON。该任务有 480 个预测步、43 个特征。既有 `/tmp/limix-timeseries-real.json` 为 6,610,162 bytes；CLI `save_json` 格式化后为 9,871,004 bytes。对应 CSV 为 2,297,319 bytes，视图 JSON 为 903,939 bytes。

原下载访问器对所有文件使用 5,000,000 bytes 上限。即使文件已登记，`resolve` 也返回 `null`；路由据此返回 404。原测试只确认超大文件会拒绝，没有覆盖真实解释原始文件。

主代理已修复：普通 CSV 保留 5 MB 上限，已登记解释产物使用 50 MB 上限。审查者复核真实原始文件：默认访问器返回 `null`，50 MB 解释访问器返回真实路径。新增 6 MB JSON 可读与 51 MB 拒绝用例通过。

状态：已修复并通过针对性离线复核；本审查未做 UI 点击验证。

## 已验证的正确行为

- 单行上传只包含所选行与特征列。批量请求保留用户行序。
- 返回索引能映射原始行号；部分结果缺索引时拒绝猜测。
- 特征重排后，原始特征值按名称对应。
- 平均贡献使用 `abs(score) × direction`。未知方向不补零，也不改变分母。
- 分类贡献方向没有被宣称为某个类别的概率变化。
- 时序请求只引用预测结果版本，不覆盖原参数。
- 时序长表与矩阵核对分数、方向、预测值、索引和时间标签。
- 既有真实 480×43 时序响应可归一化和完整导出。
- 降级与部分成功保留原状态和风险。解释调用没有自动重提。
- 已登记产物校验真实路径、扩展名和大小；普通工作区 JSON 不自动放行。

## 离线验证

首次完整检查：

```text
python3 -m unittest discover -s packages/tool/tests -v  → 45 passed
node --test packages/tool/tests/*.test.mjs             → 6 passed
```

主代理补充下载限额测试后再次检查：

```text
node --test packages/tool/tests/*.test.mjs             → 8 passed
```

恢复分支修复后复核：

```text
python3 -m unittest discover -s packages/tool/tests -q  → 47 passed
额外只读契约与无回执拒绝检查                            → 42 passed
```

额外检查在临时目录执行，未写入产品测试目录。输入为既有真实响应及其复制件；修改复制件用于验证拒绝路径。

独立 MCP 仓库：`/Users/limitless/Desktop/Projects/stable-ai/80-Agent与Skill工具箱/mcp-server`。

```text
uv run --with 'mcp[cli]>=1.2.0,<2' --with requests python -m unittest discover -s tests -q
→ 22 passed
```

真实 stdio 离线握手发现 15 个工具。`limix_submit_explanation` 支持 directed、undirected、local。时序 local 只接收 `local_task_type=timeseries` 与 `result_version_id`，与 Agent CLI 一致。扩展查询保留 `task_status`、风险及失败字段，不混用预测的 `status/is_ready`。

新启动审查 agent 的工具快照包含全部 15 个 `mcp__limix` 工具。主代理报告：它已建立的主会话仍为 11 个旧工具。两个会话快照不同，不能把新 agent 的发现当作主会话刷新成功。审查没有全局重启 Codex。

## 验证边界

本报告的真实响应来自既有文件。所有新增缺陷复现均在临时目录内完成，HTTP 均为 Mock。没有重复提交预测或解释，没有制造指标，没有替代主代理负责的 UI 验证。三个缺陷均已完成代码及离线复核；本报告不声明已经点击验证浏览器下载或恢复入口。
