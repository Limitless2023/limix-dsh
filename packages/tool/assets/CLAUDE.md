# packages/tool/assets/

> L2 | 父级: ../CLAUDE.md

limix.py - API 调用、上传、轮询与下载；上传名转安全 ASCII，原文件不变；--truth 不上传，无真值不评估基线。
limix_explain.py - 表格/时序局部解释与全局关系；所有成功模式保存 JSON/CSV/.view.json，视图保留任务状态；输入签名和回执核验续查归属。
limix_explain_input.py - 数值特征预检、可覆盖的标识列排除、按预测类别确定性抽样；保留原行号。
limix_explain_batch.py - 行号与原始特征对齐、部分覆盖、带符号平均贡献及长表导出。
limix_explain_timeseries.py - 核对矩阵与长表，保留服务时间；输出尺度未确认时清除业务单位。
limix_benchmark.py - 固定拆分比较与逐案例回执；委派进程支持取消与可选超时；下载原件保留全部样本。
limix_benchmark_report.py - 独立 HTML；验证来源协议，按 manifest 标注许可，不嵌入本机路径。
limix_metrics.py - 校验独立真值；时序核对日期，七日周期基线只使用预测起点前历史。
icon.png - 插件图标。

结果中的目标列是原始真值，不能参与预测列选择。
表格任务使用 pred_label；时序使用 pred_<target>。
所有 limix*.py 模块必须一起打包；激活时预装固定版本独立 Python 依赖。
benchmark 在写入前隔离输入路径，使用跨平台锁并支持取消进程树。

limix_runtime.py - 固定依赖的独立 venv 预准备、进程锁与限时导入校验；venv/ensurepip/pip/probe 统一终止进程树。

limix_forecast.py - 时序结果提取训练/预测/有效评估范围和最大逐点误差，范围绑定单任务且未知不推算；上传前校验日期、必需列、窗口、协变量与有限分位数；识别常用分隔符及 UTF BOM，未知编码明确交服务端校验。

limix_explain_graph.py - 校验完整图矩阵，保留最多2000条原值预览；成功有向视图的模型/处理口径核验、共同阈值比较、覆盖保护与失败清理；比较详情保留原值，工具回执只传 SHA256 文件描述，避免宿主截断。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
