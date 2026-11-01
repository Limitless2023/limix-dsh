# packages/tool/tests/

> L2 | 父级: ../CLAUDE.md

test_metrics.py - 覆盖预测列选择、日期对齐、真值错误 JSON、真值不上传及临时下载清理。
test_explain.py - 单条样本与原值对齐、异常参数、回执续查输入签名与降级验证。
test_explain_batch.py - 行选择、缺索引/错位拒绝、未知方向、带符号平均及全量导出。
test_explain_timeseries.py - 预测版本、参数覆盖、矩阵长表校验、未知输出尺度、时间与续查契约。
workflow.test.mjs - 验证预测/解释/比较命令附件、取消、历史 CSV 与读取边界。
运行：node --test packages/tool/tests/*.test.mjs；python3 -m unittest discover -s packages/tool/tests -v。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
