# packages/tool/src/

> L2 | 父级: ../CLAUDE.md

index.ts - 报告可用性检查只认已登记文件；优先历史副本，回退工作区同版文件。 在 preset 内注册工具、三类命令和本地报告；已登记 HTML/MD 通过独立附件通道下载。
report/ - 从 Markdown 与已有结果生成离线 HTML；与 Agent 共用图表。
host/predict-command.js - 注册预测命令与自然语言流程；核对特征可用性。
host/explain-command.js - 注册解释命令，保留附件并复用解释工具。
host/benchmark-command.js - 分类/回归比较命令，复用 limix benchmark 与本地报告。
host/csv-access.js - 持久记录成功结果，普通 CSV 限5MB，已登记解释 JSON/CSV 限50MB。
host/tool.js - Python CLI 与宿主 report 分流，登记报告副本和预览；比较等待独立环境。
host/python-runtime.js - 激活预准备、状态、重试与取消等待。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
