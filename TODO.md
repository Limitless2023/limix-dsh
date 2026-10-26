# dsh-limix 移植进度

- [x] agent 包：工具 + 卡片 + 分析过程 + csv 路由 → 已装、已验
- [x] limix.py 随包自带，`health` 端到端 ok
- [x] 分析过程视图在 0.2.1 上线
- [ ] data 包：已移植并修复参数 schema；desktop 的 `datasource list` 已验证，设置页和数据库查询待验，见 NOTES.md
- [x] data 包注册验证：`settings.section` 里 `limix-datasource`（order 30, active）
- [x] 工具卡视觉确认：用户实机截图（`limix regress` 卡片，任务 ID/状态/created_at 等 + 原始输出折叠）
- [x] brand 包并入仓库（packages/brand）
- [x] README / INSTALL（同事 agent 安装说明）/ release.sh
- [x] Release tarball 实跑：v0.1.0 已发布（3 个 tarball）
