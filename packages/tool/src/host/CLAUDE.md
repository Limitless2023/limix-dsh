# packages/tool/src/host/

> L2 | 父级: ../CLAUDE.md

tool.js - 注册 limix 及参数帮助，执行 CLI；Windows 取消终止进程树；登记预测 CSV、解释原始 JSON、批量视图 JSON/CSV 和本地真值读取权限。
predict-command.js - 注册 /limix-predict，转交输入与附件，约束预测步骤与简短结论。
explain-command.js - 注册 /limix-explain；按本轮样本范围调用，约束带符号平均、输出尺度及误差原因表述。
benchmark-command.js - 注册 /limix-compare，固定数据拆分、依赖隔离和回执续跑。
csv-access.js - 限定 CSV 读取及已登记 JSON/CSV 下载；持久记录成功调用的文件，拒绝路径越界；普通 CSV 限5MB，已登记解释产物限50MB。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
