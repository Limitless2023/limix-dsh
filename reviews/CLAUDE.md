# reviews/

> L2 | 父级: ../CLAUDE.md

causal-backend-review.md - 解释后端与宿主交叉审查；记录离线复现、修复状态和验证边界。
causal-frontend-review.md - 结果卡交叉审查；记录解释语义、全屏竞态及大结果裁剪的修复证据。
benchmark-release-review.md - 多模型比较与五插件封装审查；记录离线复现、平台边界和打包清单核验。
benchmark-release-repro.py - 仅用假服务复现输出覆盖、上传失败和无效分类指标。
benchmark-cancel-repro.mjs - 通过真实宿主调用验证取消是否传递到独立 Python。
benchmark-path-repro.py - 离线构造 15 组路径冲突，核验摘要不变、零调用与目录大小写祖先。

本目录保存审查证据，不替代自动化测试。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
