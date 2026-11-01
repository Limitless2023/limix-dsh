# Benchmark 与五插件封装独立审查

审查日期：2026-11-01。
审查者：thermal_mechanics；独立于本轮实现者。
范围：benchmark 编排、公开案例制备、离线报告、宿主命令和五插件分发。
本审查不改源码，不运行 UI，不提交生产请求，不执行构建或 release.sh。

复现脚本：`reviews/benchmark-release-repro.py`、`reviews/benchmark-cancel-repro.mjs`、`reviews/benchmark-path-repro.py`。
在仓库根目录执行：

```sh
/Users/limitless/Desktop/Projects/Coffee/materials-datasets/.venv/bin/python reviews/benchmark-release-repro.py
node reviews/benchmark-cancel-repro.mjs
/Users/limitless/Desktop/Projects/Coffee/materials-datasets/.venv/bin/python reviews/benchmark-path-repro.py
```

Python 可替换为已安装 benchmark 依赖的独立解释器。
脚本只在临时目录生成样本，假服务会主动失败；不存在生产网络请求。

## 结论

R1–R7 均已修复并通过独立离线复审；URL 协议限制也已生效。
本审查范围内没有未关闭的 P1/P2，可进入最终构建与发布验收。
此结论不替代最终 tarball、安装、UI 或 Windows 实机验收。
五包首轮 dry-run 文件清单完整，未发现当时入口或 Python 模块漏包。
以下 R1–R6 的行号与现象保留首轮快照；修复验证见后续章节。

## 首轮发现与修复记录

### R1 · P1：取消宿主工具没有停止独立 Python 子进程

- 位置：`packages/tool/assets/limix_benchmark.py:445`；`packages/tool/src/host/tool.js:50`。
- 触发：比较通过 `--python` 切换到独立环境，随后用户取消工具或宿主超时。
- 外层由 Node 接收 AbortSignal；内层由 `subprocess.run` 启动。
- 外层没有转发终止信号，Node 也没有终止整个进程组。
- 结果：工具已取消，内层仍能继续上传、提交、下载并占用输出锁。
- 离线复现：注册真实 `registerLimixTool`，用临时外层脚本调用真实 `benchmark.run`。
- 模拟独立解释器先写 started 标记、休眠，再写完成标记。
- 确认 started 后执行 Abort：工具返回 `AbortError`，完成标记随后仍出现。
- 复现不包含网络调用；临时进程自行结束，临时文件已清理。
- 建议：让取消覆盖整个进程树，或由外层显式转发信号并等待内层退出。
- 回归要求：独立解释器启动后取消；证明后续提交和文件写入均停止。

### R2 · P2：非 .json 输出名覆盖汇总或使运行失败

- 位置：`packages/tool/assets/limix_benchmark.py:360`、`:367`、`:386`。
- `--output` 未验证扩展名，衍生 CSV/HTML 只通过 `with_suffix` 生成。
- `-o r.csv`：先写 JSON，随后 CSV 写到同一个路径，最终仍返回 `succeeded`。
- `-o r.html`：HTML 同样覆盖汇总 JSON，`saved_to` 不再指向可解析的 JSON。
- `-o bare`：`root` 与 `output` 相同；创建模型子目录后，JSON 替换目录报 `IsADirectoryError`。
- 离线 BASELINE 复现三种情况；标准 `r.json` 正常。
- 不同扩展名还会共用模型回执目录，却使用不同锁文件。
- 建议：提交任何任务前要求 `.json`，或将汇总、衍生文件和回执目录设计为互不冲突的路径。

### R3 · P2：一次上传失败丢失整批的汇总与部分完成状态

- 位置：`packages/tool/assets/limix_benchmark.py:409–416`。
- 本地模型先完成，全部数据集上传随后串行执行。
- 汇总文件直到所有上传成功后才首次写入。
- `upload_once` 抛出 `SystemExit` 或网络错误时，没有逐数据集隔离失败。
- 结果：已完成的基线只有深层回执，主汇总和 HTML 不存在；其他数据集也无法继续比较。
- 离线复现：BASELINE 成功后，假上传器抛出 `SystemExit(4)`。
- 证据：`local_receipt_exists=True`，`summary_exists=False`，执行退出 4。
- 建议：预先保存所有模型行；上传失败记入所属数据集，保留其他成功和待续查项。
- `submission_unknown` 的防重提策略应保留，不应通过盲目重传修复此问题。

### R4 · P2：分类的非有限预测被计为正常完成

- 位置：`packages/tool/assets/limix_benchmark.py:175–188`。
- 回归明确拒绝无穷值；分类仅检查缺失值，然后把值转成字符串标签。
- 离线调用：`score('classification', [0,1], [0,float('inf')], deps)`。
- 实际返回 accuracy=0.5、balanced_accuracy=0.5、f1_macro=1/3；没有抛错。
- 该路径随后可由 `finish_predictions` 保存为 `succeeded`。
- 建议：数值分类输出先拒绝 NaN/Infinity，并校验输出属于训练标签集合。
- 不要仅把服务产生的无效类别当作普通错误预测计分。

### R5 · P2：自有数据报告被标注为 UCI 和 CC BY 4.0

- 位置：`packages/tool/assets/limix_benchmark_report.py:44`。
- 支持自有 manifest 的入口见 `benchmarks/README.md`；报告却硬编码来源名称与许可。
- 离线使用自有数据、内部署名与任意来源 URL，报告仍显示“UCI 数据来源 · CC BY 4.0”。
- 这会把自有或其他许可的数据误标为开放许可。
- 建议：来源名称和许可从 manifest 传入，缺省不声明许可；公开案例由 catalog 显式提供。

### R6 · P2：Windows 的比较功能无条件导入 POSIX 文件锁

- 位置：`packages/tool/assets/limix_benchmark.py:73`。
- `output_lock` 无条件 `import fcntl`；该标准模块不在 Windows 提供。
- preset 明确提供 Windows 的 PowerShell 分支，安装说明未限制 benchmark 仅支持 POSIX。
- Windows 执行任一比较模型都会在进入运行阶段时报 `ModuleNotFoundError`。
- 这是静态平台兼容性证据；本机为 macOS，未声称 Windows 实机验证。
- 建议：采用跨平台文件锁，或在 CLI 和安装文档明确限制支持平台并提前给出可操作错误。

## R7 · P1（已修复并复审）：衍生报告覆盖输入数据

- 复审位置：`packages/tool/assets/limix_benchmark.py:400`、`:409`、`:418–420`。
- 后缀检查已修复，但只检查输出 JSON 是否等于 manifest。
- 输入为 `train.csv`，合法参数 `-o train.json` 会把比较指标 CSV 写入同一个 `train.csv`。
- 离线 BASELINE 复现：返回 `succeeded`，`input_train_unchanged=False`。
- 训练文件首行从 `x,y` 变成 `dataset_id,model,status,mae,...`。
- 远端流程在首次写汇总后才上传，因此还会把被覆盖后的文件当作训练输入。
- 建议：在计算、写入和上传前校验全部衍生产物和回执目录。
- 输出 JSON、CSV、HTML、锁、临时文件或模型回执均不得覆盖 manifest/train/predict/truth。
- 必须解析 canonical 路径，避免软链接绕过。
- 复现使用临时目录，真实演示数据没有改动。

### R7 最终修复验证

- 当前实现：`limix_benchmark.py:78` 的 `overlapping_paths`、`:95` 的 `validate_output_plan`。
- `execute:505` 在加载计算依赖和任何写入之前调用只读路径预检。
- 预检保护 manifest、训练、预测、真值及显式可选输入文件。
- 检查汇总 JSON/CSV/HTML、锁、临时文件、上传回执、模型回执和预测文件。
- 真实路径检查覆盖祖先/后代关系，`samefile` 覆盖硬链接、大小写别名及目录祖先。
- 审查者独立构造 15 组对抗样本，全部通过；证据保存为 `benchmark-path-repro.py`。
- 四组直撞：train、predict、truth、manifest。
- 三组衍生碰撞：HTML、JSON 临时文件、锁文件。
- 两组父子关系：输入在回执树内、输出路径穿过输入文件。
- 三组软链接：衍生文件、输出父目录、回执根目录。
- 另外核验硬链接、macOS 文件大小写别名和目录祖先大小写别名。
- 本机实际构造 `RESULTS/test/train.csv` 与 `results.json`，旧检查放行，新检查拒绝。
- 独立脚本也核验交换路径参数后的祖先判断，两个方向均拒绝。
- 每组均证明：计算依赖未加载、上传/预测调用为零、没有新增文件或锁。
- 全部原有文件 SHA256 不变，包括输入与 manifest。
- 正常独立输出的 BASELINE 正向用例通过，输入摘要不变。
- 当前 Python benchmark 测试共 26 项，实现者报告全套 26/26 通过。
- 审查者上轮独立运行 25/25；最终修改后只复跑 8 项路径测试，全部通过。
- 本轮独立脚本 15/15，未扩大到取消、宿主或生产服务复测。

最终核验的源码 SHA256：

| 文件 | SHA256 |
| --- | --- |
| packages/tool/assets/limix_benchmark.py | ab4a11d7d6a88993617f95ea9f37519a9aca6cc53acdf886322561cb0a4df8bc |
| packages/tool/assets/limix_benchmark_report.py | 210273b11262fa05371e0e459a5d9dcc126db941ed3ccb2cca312d65e4725b14 |
| packages/tool/src/host/tool.js | 83eafa60edb9a8807db3c6155957ddfd6ff4c7100fc9216988e257f40979e348 |

## 2026-11-01 独立复审证据

- 原 `benchmark-release-repro.py`：CSV/HTML/无后缀输出提前拒绝。
- 上传假失败后 `summary_exists=True`，本地基线回执仍存在。
- `classification_inf_rejected=ValueError`；训练集外的类别也由新增测试拒绝。
- 自有数据报告 `hardcoded_UCI_CC_BY=False`，`unsafe_url_retained=False`。
- 原 `benchmark-cancel-repro.mjs`：`child_survived_cancel=False`。
- 新取消集成测试在 macOS 实际启动子进程和忽略 TERM 的孙进程。
- 取消后两个进程均不存在，且没有写出完成标记。
- Windows 字节锁、taskkill 树终止和超时分支通过模拟接口测试。
- Windows 仍未实机运行；不把 mock 结果当成平台实机验收。
- 用真实 `registerLimixTool` 和仅输出 partial JSON 的临时 CLI 验证附件登记。
- 返回 `exitCode=0/status=partial`，JSON/CSV 均进入普通和受控产物登记。
- Python benchmark 边界测试 18/18；Node 取消与原宿主测试合计 11/11。
- 原未知提交不重提、缓存签名和成功续跑测试继续通过。
- 本轮未构建、未打包、未操作 UI、未提交生产请求。

## 首轮已验证通过

- `python -m unittest discover -s benchmarks/tests -v`：12/12。
- `node --test packages/tool/tests/workflow.test.mjs`：8/8。
- 五个插件使用 `npm pack --dry-run --json --ignore-scripts` 检查。
- data、tool、agent、preset、brand 均为 0.3.0。
- 当前所有显式 exports 入口、package.json 和 cordis.patch.yml 均在包内。
- tool 包包含全部 7 个 `limix*.py` 模块，包括 benchmark 和报告模块。
- 未执行 npm build，未重载插件，未改变正在验收的界面产物。
- 固定案例排除了酒质量原分数、建筑冷却负荷和未来真实天气等泄漏字段。
- 完全重复输入成组拆分，真值仅本地读取；输入变更会使回执签名失效。
- 已知 task_id 续查、成功缓存复用、未知提交不重提均有通过的离线测试。
- 报告 JSON 转义 `<`、`>`、`&`，丢弃本机路径、请求回执和任务 ID 的字段。

## 验证边界与非阻断观察

- 分类服务只返回预测标签且不含样本标识时，目前只按数量与行序契约对齐。
  回归仅核验服务实际保留的输入列；全部输入列缺失时也会评估。
  现有假服务测试刻意只返回 pred_label。未证明服务实际乱序，故不列实证缺陷。
- `source_url` 首轮只有 HTML 属性转义；复审已限制为完整 HTTP(S) 地址。
  javascript/data/file、协议相对地址、带用户名密码地址均被过滤。
  该观察项已关闭；首轮未声称已复现浏览器脚本执行。
- 未创建新 tarball，没有做新安装或 Windows 实机验证。
- 本报告只记录发现；修复由主 Agent 或实现者负责。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
