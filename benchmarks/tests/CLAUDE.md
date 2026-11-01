# tests/

> L2 | 父级: ../CLAUDE.md

test_benchmark.py - 验证输入哈希与输出路径隔离、指标、续跑及报告转义；不调用生产服务。
test_benchmark_output.py - 用真实 12 模型结果验证紧凑 stdout、委派路径及完整下载原件。
cancellation.test.mjs - 通过真实宿主取消独立解释器及孙进程；模拟 Windows 树终止分支。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
