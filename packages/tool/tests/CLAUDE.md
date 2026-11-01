# packages/tool/tests/

> L2 | 父级: ../CLAUDE.md

test_metrics.py - 覆盖预测列选择、日期对齐、真值错误 JSON、真值不上传及临时下载清理。
test_upload.py - Unicode 与特殊上传文件名兼容；校验原文件、内容和扩展名不变。
test_explain.py - 单条样本与原值对齐、异常参数、回执续查输入签名、降级和进度日志验证。
test_explain_batch.py - 行选择、缺索引/错位拒绝、未知方向、带符号平均及全量导出。
test_explain_timeseries.py - 预测版本、参数覆盖、矩阵长表校验、未知输出尺度、时间与续查契约。
workflow.test.mjs - 验证构建后的三类流程注册、preset 默认配置与隔离、附件、取消、文件边界与超过1000条登记后的历史报告保留。
report.test.mjs - 六类图表、精确目标列、时序日期/历史边界、Markdown 保留、错位拒绝、输出保护、转义及已登记报告下载。
运行：node --test packages/tool/tests/*.test.mjs；python3 -m unittest discover -s packages/tool/tests -v。

test_input_preflight.py - 标识列预检、确定性分类选样和七日周期基线无未来泄漏。
runtime.test.mjs - 独立环境准备合并、失败重试、等待取消、复用及外部 CLI 隔离。
test_runtime.py - 验证 venv/ensurepip/probe 子进程取消、探测超时清理及安装失败不标记 ready。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
