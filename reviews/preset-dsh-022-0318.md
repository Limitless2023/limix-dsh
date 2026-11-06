# 0.3.18 DSH 0.2.2 preset 失效修复审查

日期：2026-11-06。

根因：DeepSeek Harness 0.2.2-rc.1 将 `list_agents` 并入 `@deepseek-ai/dsh-tool-subagent-control` 主入口，删除了 `./list-agents` 子路径导出。preset 仍单独挂载 `tool-subagent-list-agents`，该行始终无法启动，预设被 `agent-preset-registry` 判定为 broken 并从模式菜单过滤；以 `agentPreset: limix` 创建的会话只写入 session 头，没有权限、沙箱与审批事件。

## 复现

隔离 `DSH_HOME` 下按 desktop profile 组合真实安装包启动 Web 实例，直接读取宿主 RPC `agentPresets/list`：

```text
tool-subagent-list-agents (@deepseek-ai/dsh-tool-subagent-control/list-agents): never started
```

同期本机三个 limix 会话只有 `session` 头，标准模式会话正常。应用在 2026-11-04 17:16 升级到 0.2.2-rc.1，最后一次可用 limix 会话为同日 10:45。

## 修复

- 删除 `packages/preset/cordis.patch.yml` 中 `tool-subagent-list-agents` 两行；主入口继续提供 `list_agents` 与 `interrupt_agent`。
- `tool-subagent` 增加 0.2.2 的 `modelSelection` + `modelDiscovery`，保留 0.2.1 的 `modelSelectionSettings`。核对 0.2.0-rc.2 源码只读旧键，0.2.2 只读新键，额外键均由配置解析保留或忽略，不报错。

## 验证

修复后同一隔离实例 `agentPresets/list` 五包预设均无 `broken`；`session/create` 指定 limix 成功，会话日志写入 `permission/preset`、`sandbox/mode`、`approval/policy`、`subagent/model-selection-policy` 四条初始化事件。

本机 desktop profile 用相同两处修改热修 0.3.17 安装包后复验同样的名册与会话结果；备份为 `cordis.patch.yml.bak-20261106`。

## 正式发布回验

待 0.3.18 Actions 发布后回填：run 链接、五包 latest、npm 逐包校验与本机升级结果。

## 保留边界

本轮未重跑预测、解释、模型比较、报告与数据源链路；这些沿用 0.3.17 结论。未验收 Windows、首次安装与 tgz 迁移。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
