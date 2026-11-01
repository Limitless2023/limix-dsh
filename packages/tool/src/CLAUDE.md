# packages/tool/src/

> L2 | 父级: ../CLAUDE.md

index.ts - 在 preset 内注册工具、预测/解释/比较命令与受控下载；先读取文件再发送成功响应。
host/predict-command.js - 注册原生预测命令，保留附件并排入 Agent。
host/explain-command.js - 注册解释命令，保留附件并复用解释工具。
host/benchmark-command.js - 比较命令，复用 limix benchmark 与本地报告。
host/csv-access.js - 持久记录成功结果，普通 CSV 限5MB，已登记解释 JSON/CSV 限50MB。
host/tool.js - Python CLI 调用与工具参数契约。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
