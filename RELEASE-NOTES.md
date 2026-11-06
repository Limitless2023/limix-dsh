# LimiX Agent v0.3.18

五包统一为 0.3.18。改动集中在 preset；data、tool、agent、cover 同步版本，代码与 0.3.17 一致。

## 本次变化

- 修复 DeepSeek Harness 0.2.2 下 LimiX Agent 模式从“模式”菜单消失、新建会话空白的问题。
- 根因：0.2.2 把 `list_agents` 并入 `@deepseek-ai/dsh-tool-subagent-control` 主入口，不再导出 `./list-agents` 子路径。preset 仍单独挂载该行，导致整行 `never started`，整个 preset 被判定不可用并从名册过滤。
- 移除该行；`list_agents` 与 `interrupt_agent` 由主入口继续提供。
- `tool-subagent` 的模型选择改用 0.2.2 的 `modelSelection` + `modelDiscovery`，并保留 0.2.1 的 `modelSelectionSettings` 旧键；旧版本读取旧键，0.2.2 忽略它。
- 其余插件组合、提示词、工具与界面不变。

## 验证

在隔离的 `DSH_HOME` 中按桌面 profile 组合真实安装包复现：修复前 `agentPresets/list` 返回
`tool-subagent-list-agents (@deepseek-ai/dsh-tool-subagent-control/list-agents): never started`；
修复后五个预设均无 `broken`，以 `agentPreset: limix` 新建会话成功，权限、沙箱与审批事件正常写入。

本机 desktop profile 已用同一份修改热修并验证；正式版发布后按 npm 0.3.18 覆盖。

## 发布状态

GitHub Actions [42219306179](https://github.com/Limitless2023/limix-dsh/actions/runs/42219306179) 已成功发布，发布源码为 cf67216。五个 npm 包的版本与 latest 均为 0.3.18；逐包重新下载的 SHA-256 与 Actions 归档一致。GitHub Release v0.3.18 保留同一批五个 tgz、manifest.json 和 SHA256SUMS。

本机 desktop profile 仍为 0.3.17 加同内容热修；切换 npm 0.3.18 需先退出应用，未在本轮声称完成。

最低支持 DeepSeek Harness 0.2.1-rc.5。许可保持 PolyForm Noncommercial 1.0.0。标准模式提示词未修改。

## 已知限制

- 0.2.1 仍读取旧键 `modelSelectionSettings`；若后续版本再次调整键名，需同步本节。
- 本轮只修复模式不可用，未重新验收预测、解释、报告与数据源链路；这些能力沿用 0.3.17 验收结论。
- 报告与最终自然语言总结仍需人工审阅。
