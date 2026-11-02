# packages/tool/src/host/

> L2 | 父级: ../CLAUDE.md

tool.js - 注册 limix 及参数帮助；容错参数型命令的重复命令词；report 在宿主执行，其余转交 CLI；Windows 取消终止进程树；登记预测、解释、报告副本、预览与本地真值读取权限。
三类命令指引仅在已授权执行时应用；咨询不触发提交或环境检查。

predict-command.js - 注册 /limix-predict，转交输入与附件，核对数据可用性、指定模型、预测终态和业务效果解读。
explain-command.js - 注册 /limix-explain；核对模型与样本范围，区分预测解释与关系探索，约束带符号均值、尺度和误差表述。
benchmark-command.js - 注册 /limix-compare，仅比较分类/回归，遵守模型范围、固定拆分与回执续跑，解释基线及指标方向。
csv-access.js - 限定 CSV 读取及已登记产物下载；沿用旧登记并持久保留 HTML/MD/SVG 历史报告，普通产物最多1000条；拒绝路径越界，普通 CSV 限5MB，已登记解释产物限50MB。

python-runtime.js - preset 激活时预准备 Python 依赖；安装器固定为包内资源，不跟随外部 CLI；比较共用准备任务。

report-workflow.js - 报告生成与核验指引；仅在已授权交付阶段应用。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
