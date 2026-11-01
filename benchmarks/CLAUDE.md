# benchmarks/

> L2 | 父级: ../CLAUDE.md

datasets.json - UCI 来源、许可、业务目标、字段与普通用户提示。
prepare.py - 固定分组拆分；预测输入与独立真值分离。
run.py - 调用 assets 中的可复用 benchmark 命令。
requirements.txt - 独立 Python 环境依赖；不改变基础 CLI 运行环境。
README.md - 重现入口、评估口径、失败与续跑约定。
tests/ - 拆分、指标、请求续跑、紧凑输出与报告安全测试。
results/ - 2026-11-01 真实实测的公开指标与离线报告。

原件与真实任务输出写入仓库外。模型之间共用同一拆分。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
