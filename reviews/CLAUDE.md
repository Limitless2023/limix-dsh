# reviews/

> L2 | 父级: ../CLAUDE.md

coffee-release-review.md - v0.3.8 数据库咖啡演示后的调用、日期与报告修复审查；保留人工审阅和未验收边界。
scenarios-release-review.md - v0.3.7 报告、环境、输入与分发交叉审查；记录修复、最终检查和未验收项。
causal-backend-review.md - 解释后端与宿主交叉审查；记录离线复现、修复状态和验证边界。
causal-frontend-review.md - 结果卡交叉审查；记录解释语义、全屏竞态及大结果裁剪的修复证据。
benchmark-release-review.md - 多模型比较与五插件封装审查；记录离线复现、平台边界和打包清单核验。
preset-default-release-review.md - 0.3.2 安装默认值、用户选择持久化、内置模式隔离及发布验证记录。
report-release-review.md - 0.3.1 提示词、报告与界面审查；记录模型一致性、实机结果和五包验收。
benchmark-release-repro.py - 仅用假服务复现输出覆盖、上传失败和无效分类指标。
benchmark-cancel-repro.mjs - 通过真实宿主调用验证取消是否传递到独立 Python。
benchmark-path-repro.py - 离线构造 15 组路径冲突，核验摘要不变、零调用与目录大小写祖先。

本目录保存审查证据，不替代自动化测试。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
