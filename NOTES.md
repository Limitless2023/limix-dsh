# 移植笔记（0.2.1）

## 2026-10-26：datasource 参数定义修复

- 症状：安装 data 包后，每轮请求被拒绝，报 `Invalid schema for function 'datasource'`。
- 根因：`parameters` 是字段表，本地适配器却将它当作完整 schema，转换结果为 `{}`。
- 修复：`src/host/define-tool.ts` 先补 `type: object` 和 `properties`，再转换字段。
- 构建：复用本机已有 tsdown 0.15.12，按 data 的宿主构建配置重建 `lib/index.js`。
- 回归：`cd packages/data && node --test tests/tool-contract.test.mjs`；旧产物失败，新产物通过。
- 桌面验收：重启 DeepSeek Harness 后，在「数据源命令列表」会话实调 `datasource {"command":"list"}`，轨迹返回空数据源清单，模型正常完成回复。
- 边界：本机没有配置数据源；本次未验证数据库连接、查询和 CSV 导出。

## 已验证

- `limix` 工具端到端可用：子 agent 真实调用 `{"command":"health"}` → `{"status":"ok"}`
  （工具注册 ✔ / 包内 `assets/limix.py` 解析 ✔ / 凭据 ✔）
- 「分析过程」视图在 0.2.1 注册成功并渲染空态；`useSession(s => s.nodes / s.runningCalls)` 选择器仍然有效
- `tool.call.toolview` 0.2.1 契约：`{ phase: 'preparing'|'start'|'result', block, callId, toolName, cwd?, home?, openFile, loadImage, inspect? }`
  —— 旧代码读的 `block.call/.argsRaw/.content` 作为 legacy 字段仍在

## 关键约束：树外宿主插件不能 import `@deepseek-ai/dsh-*`

- profile 里没有这些包；Node 按插件 realpath 向上找不到；app-boot 里 `NODE_PATH` 只出现在“禁止 .env 设置”的名单里，没有注入解析
- `@deepseek-ai/dsh-tools` 自身又 import cordis / dsh-llm / dsh-sandbox / dsh-scope / dsh-brand / dsh-util-values
  → 想靠打包内联也做不到（会把整个宿主框架卷进来）
- 结论：宿主半只允许用 **node 内建 + `ctx.*` 服务 + 普通 npm 依赖**，
  需要 schema/工具定义时自己写等价 shim（agent 包已这么做）

## data 包的范围决定

| 候选 | module scope import | 可分发性 |
|---|---|---|
| `limix-datasource`（NL2SQL 旧入口） | 仅 `@deepseek-ai/dsh-tools` + node 内建 | ✅ 换成本地 `defineTool` shim（~30 行 DSL→JSON Schema）即可 |
| `limix-data-agent`（/data-source 数据中心 fork） | dsh-storage / -domain / -json / dsh-credentials / dsh-tools | ❌ 不重写就用不了：这些是宿主内部包，装成 npm dep 会得到第二份服务类 |

→ 先发 `limix-datasource` 这条路（设置页 + `datasource` 工具 + 三闸只读），
  data-agent 留给内部 fork（它本来就是跑在源码检出上的）。
