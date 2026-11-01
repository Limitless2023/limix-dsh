# 公开案例与多模型评测

用同一份固定拆分比较 LimiX 7M、LimiX 16M、XGBoost 和简单基线。
结果只说明本次留出样本的表现。不得据此宣称普适模型排名。

## 案例

- 混凝土抗压强度：8 个配合比、龄期特征预测 MPa；实验观测数据。
- 红葡萄酒质量分级：11 个理化指标预测原评分是否 ≥6；此阈值是演示定义，不是行业标准。
- 建筑采暖负荷：8 个建筑参数预测仿真采暖负荷；排除冷却负荷。
- 共享单车日需求：日历与历史需求预测未来 14 天；作为时序界面案例，不混入表格模型排名。

来源、署名、CC BY 4.0 许可与中文提示见 [datasets.json](datasets.json)。
准备后每个案例包含 train.csv、predict.csv、truth.csv、labels.json、split.json、provenance.json 和 README.md。
原件、完整数据及运行结果留在指定输出目录，不写入插件源码。

## 重现

在仓库根目录执行。`DATA_ROOT`、`RESULT_DIR` 使用自己的目录。

```bash
uv venv .venv-benchmark --python 3.12
uv pip install --python .venv-benchmark/bin/python -r benchmarks/requirements.txt
.venv-benchmark/bin/python benchmarks/prepare.py --output "$DATA_ROOT"
.venv-benchmark/bin/python benchmarks/run.py --manifest "$DATA_ROOT/manifest.json" -o "$RESULT_DIR/results.json"
.venv-benchmark/bin/python -m unittest discover -s benchmarks/tests -v
node --test benchmarks/tests/cancellation.test.mjs
```

Agent 集成入口：

```bash
python3 packages/tool/assets/limix.py benchmark --manifest "$DATA_ROOT/manifest.json" --python /path/to/.venv-benchmark/bin/python -o "$RESULT_DIR/results.json"
```

基础 CLI 仍只依赖标准库。benchmark 在调用时才加载科学计算依赖。
凭据复用 LimiX CLI 的配置。运行产物不保存 API Key。
仅跑本地验证可传 `--models XGBoost,BASELINE`。
选择案例可传 `--datasets concrete,wine_quality`。
`--output` 必须使用小写 `.json` 后缀。CSV、HTML、无后缀路径在计算和上传前被拒绝。
汇总、CSV、HTML 和回执目录从这个唯一 JSON 路径派生。
计算、写锁和上传前校验完整输出计划；结果不得覆盖 manifest、训练、预测、真值或声明的辅助输入。
保护范围包括 JSON/CSV/HTML、临时文件、锁文件和全部回执目录。
输入位于回执目录内也会被拒绝；软链接、硬链接及大小写目录别名均按真实文件身份校验。
产品 manifest 可替换为自有数据，字段如下；文件路径相对 manifest 解析。

```json
{"datasets":[{"id":"example","name":"业务名称","task_type":"regression","target":"y","train":"train.csv","predict":"predict.csv","truth":"truth.csv","split":"预先固定的拆分说明"}]}
```

可选 `source_name`、`source_url`、`citation`、`license`、`license_url` 描述来源与许可。
来源链接只接受 HTTP(S)。未提供许可时，报告不会声明开放许可。
四个公开案例由准备脚本显式写入 UCI 署名与 CC BY 4.0；自有数据不继承这些字段。

## 评估口径

1. 所有模型共享训练集、预测集和独立真值。
2. 表格数据按完全相同输入特征分组，防止重复行跨越训练和测试。
3. 回归用 seed=42 的 GroupShuffleSplit；分类用 StratifiedGroupKFold 第一折。
4. 不根据成绩更换拆分，不在测试集调参。
5. predict.csv 不含目标。truth.csv 不上传。
6. XGBoost 使用固定 200 棵树、深度 4、学习率 0.05；类别编码只拟合训练集。
7. LimiX 不微调，保留默认分类阈值；API 未暴露推理随机种子。
8. 回归计算 MAE、RMSE、R²；分类计算准确率、平衡准确率、宏平均 F1。
9. 预测数量不符、缺失预测或顺序校验失败时，不报告部分指标。
10. 远端记录排队、轮询和下载；本地记录训练和预测。耗时不是同硬件推理速度比较。

远端续跑从首次提交计时，包含中途退出程序的间隔。

公开 manifest 固定本次原件 SHA256。下载或再次准备时哈希不符会停止。
该哈希用于重现本次原件，不宣称是 UCI 官方签名。
来源数据中的主体、实验批次或建筑家族划分信息不完整；完全相同输入分组不能排除所有潜在相似性。
这些公开数据集也可能进入预训练语料；本评测不能排除预训练数据重叠。

## 回执与续跑

默认最多 2 个远端任务并发。同一输出文件有进程锁。
macOS/Linux 使用 flock；Windows 使用 msvcrt 字节锁。
再次执行同一命令复用上传回执、服务 task_id 和成功结果。
输入文件或模型配置发生变化时必须使用新输出路径。
服务端已失败的任务保留失败，不自动创建新任务。
提交响应丢失时，保存 submission_unknown；续跑不会盲目重提。
需要先核对服务任务记录，再由人工恢复已确认的 task_id。

单个案例上传失败时，汇总保留已完成的本地模型，并把该案例远端模型标为 failed。
其他案例继续运行。未知上传回执仍禁止自动重传。
业务失败输出合法汇总 JSON 并以 0 退出，供宿主登记结果下载；用顶层和逐模型 status 判断结果。
参数错误或无法生成汇总时才非零退出。

取消或宿主超时会停止本次独立 Python 进程树，防止后台继续提交任务。
POSIX 通过独立进程组转发 TERM，再清理剩余子孙进程；Windows 宿主使用 taskkill /T /F。
服务已接受的远端任务保留 task_id；取消本地轮询不等于撤销已接受的服务任务。
macOS 已通过真实子进程、忽略 TERM 的孙进程及宿主 AbortSignal 离线验证。
Windows 锁和取消分支已通过模拟接口验证，尚未在 Windows 实机运行。

汇总 JSON 的 kind 为 benchmark；包含 datasets、runs、artifacts。
工具 stdout 只输出案例信息、模型状态、指标、耗时、错误与下载路径，避免逐样本数据触发消息裁剪。
直接运行与 `--python` 委派使用同一摘要；保存的 JSON、CSV、HTML 不受精简影响。
完整 JSON 保留每条预测和服务回执；需要逐样本复核时读取 `saved_to` 指向的文件。
runs 的 status 保留 succeeded、failed、pending。失败没有零分占位。
同目录的 CSV 便于复核，HTML 可离线筛选案例、指标和模型，并悬停查看预测误差。
HTML 只嵌入公开案例信息和计算结果；不包含本机绝对路径、服务回执或任务 ID。
服务端返回的详细结果保存在本地逐模型回执中，便于审计。

## 解释演示

先用各案例 README 中的普通中文问题触发预测，再请求解释。
表格案例可先看固定前 10 个测试样本，再查看全部测试样本的贡献热力图。
预测与解释共用同一参考集、目标和模型；解释不重新选择测试集。
单车案例解释已完成预测的全部 14 个时间点，沿用 context=90 和日历协变量。
这些是预测归因案例；因果关系发现继续使用有干预背景的光学随机试验。
