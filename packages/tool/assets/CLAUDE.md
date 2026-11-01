# packages/tool/assets/

> L2 | 父级: ../CLAUDE.md

limix.py - API 调用、上传、轮询与下载；真值校验失败输出错误 JSON，--truth 不上传。
limix_explain.py - 表格/时序局部解释、全局关系、输入签名回执与 JSON/CSV 导出；丢失响应只在来源核验后恢复。
limix_explain_batch.py - 行号与原始特征对齐、部分覆盖、带符号平均贡献及长表导出。
limix_explain_timeseries.py - 核对矩阵与长表，保留服务时间；输出尺度未确认时清除业务单位。
limix_benchmark.py - 固定拆分比较与逐案例回执；工具输出紧凑摘要，下载原件保留全部样本。
limix_benchmark_report.py - 独立 HTML；验证来源协议，按 manifest 标注许可，不嵌入本机路径。
limix_metrics.py - 校验独立真值；时序核对日期，缺值或错位不报指标。
icon.png - 插件图标。

结果中的目标列是原始真值，不能参与预测列选择。
表格任务使用 pred_label；时序使用 pred_<target>。
所有 limix*.py 模块必须一起打包；本地比较模型按需使用独立 Python 依赖。
benchmark 在写入前隔离输入路径，使用跨平台锁并支持取消进程树。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
