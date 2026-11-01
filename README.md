# LimiX for DeepSeek Harness

把 LimiX 的表格预测、时序预测与解释结果接入 DeepSeek Harness。用户描述业务问题并提供数据，Agent 完成上传、预测、解释与下载；卡片展示结果。

## 插件组成

套件由五个包组成，当前版本为 0.3.8。`data`、`tool`、`agent`、`preset` 共同提供 LimiX Agent；`cover` 负责品牌外观，可选。

| 包 | 职责 |
| --- | --- |
| `dsh-limix-data` | LimiX 数据源：数据库连接配置、库表查看、只读查询与 CSV 导出 |
| `dsh-limix-tool` | LimiX 预测工具：数据上传、预测、解释、模型比较和结果保存 |
| `dsh-limix-agent` | LimiX 分析界面：结果卡片、图表、分析过程和报告预览 |
| `dsh-limix-preset` | 将通用工具与 LimiX 工具组成独立 Agent，并设为新任务默认；保留用户已保存的默认选择 |
| `dsh-limix-cover` | 官方 LimiX 标识与首页品牌；原图来源见包内 `assets/SOURCES.md` |

安装步骤见 [INSTALL.md](INSTALL.md)。下载预构建 tarball 后无需在用户机器编译。

v0.3.8 延续“分析过程”页面，新增数据库日期和演示标识修复、时序输入预检及报告指引。

v0.3.7 包含新版“分析过程”页面，按实际执行顺序展示数据准备、预测、解释、模型比较和报告。步骤详情与结果图表按需展开，报告可在侧栏预览。

## 使用

新会话选择 **LimiX Agent**，提供训练数据、待预测数据及业务目标。可直接发自然语言，也可使用：

- `/limix-predict`：分类、回归或时序预测，下载结果并在有真值时展示指标。
- `/limix-explain`：单行/多行/全部样本贡献，有向/无向关系探索，或已有时序预测的解释。
- `/limix-compare`：在固定训练/测试拆分上比较 LimiX 7M、16M、XGBoost 与简单基线。

例如：“根据这份配合比预测混凝土抗压强度，和真实强度比较误差，再解释全部测试样本。”

执行后默认交付业务分析报告，说明背景、数据、方法、效果、关键发现与使用边界，并保存 Markdown 和带图 HTML。简单追问保持短答；报告只使用已核对的信息，不补造业务背景或收益。

v0.3.7：LimiX Agent 默认交付 Markdown 和带图 HTML。`limix report` 从已保存结果生成可离线阅读的单文件报告，支持回归散点、分类混淆矩阵、时序曲线、贡献热力图、关系网络和模型比较图，不重复调用预测接口。图表可穿插正文；密集热力图可切换概览与清晰细看，点击读取完整字段名。报告保留独立历史副本，支持聊天图表预览。生成前可用 `report --inspect` 核验指标、日期和样本范围。

解释卡支持全量热力图、逐样本、筛选与全样本对照、原始数据搜索、全屏、SVG/PNG 导出。右侧“各影响因子影响分数对比”使用带正负的平均贡献，按平均值的绝对大小排序；未知方向不补零。

结果可视化绑定 `limix` 工具的规范化输出。直接调用原始 API 或外部 MCP 不会自动生成同一张 DSH 卡片。失败、部分成功、未知样本对应关系须按返回状态展示，不能当作完整成功。

## 运行依赖

- DeepSeek Harness 桌面端；本次兼容验证针对 DSH 0.2.1 的插件接口。
- Python 3.8+；预测、解释仅用标准库。
- LimiX API 凭据：环境变量 `LIMIX_API_KEY`，或已有 `~/.limix/config.json`。不要将密钥粘贴到聊天或提交仓库。
- 自动分析环境需要 Python 3.12+，默认安装固定依赖；不代装 Python 本体或系统原生库。已有环境可通过比较命令的 `--python` 指定。
- 数据源包依赖 `pg`、`mysql2`，由插件安装器安装。

真值 CSV 只参与本地评估，不上传、不作为待预测特征。无真值时仍可预测，但不能报告准确率或误差。

## 数据与模型比较

[benchmarks](benchmarks/README.md) 提供公开数据来源、许可、固定拆分、普通用户提示词及可恢复比较脚本。每个模型使用相同输入和测试集；失败结果不补零。远端任务保存回执，等待超时后续查原任务。

预测解释描述模型输出的依据。关系图的边权是关系分数；局部贡献不是实际干预收益。分类的贡献方向未被官方定义为某一类别概率的增减。干预效果、反事实和约束优化不在本版范围内。

当前验证边界：

- 时序解释返回值的业务尺度尚未获得可核验契约，界面标为“解释模型输出”，不附业务单位、不与原预测作差。
- 光学有向关系已跑通。无向接口在同源 3 变量对照中成功返回空边；完整 20 变量在本轮复测仍返回服务执行错误，仍需上游日志定位。
- 本轮钢材 7M 局部解释请求返回 4103，16M 同源请求成功；尚未定位文档与服务差异，不能据此认定所有 7M 解释都不支持。
- macOS 已做真实界面和进程取消验证；Windows 锁与取消仅有模拟测试，尚未实机验收。
- 五个 DSH 插件不包含独立 MCP 服务。MCP 工具更新后，已有客户端连接须刷新工具清单。

## 构建与验证

各包先安装开发依赖，再构建：

```sh
npm install --prefix packages/tool
npm install --prefix packages/agent
npm install --prefix packages/data
./release.sh
```

`release.sh` 构建五个插件，核验 tarball 入口与全部 CLI 模块，写入 `dist/v<版本>/`，同时生成 `manifest.json` 和 `SHA256SUMS`。不自动上传或发布。

已按 [HANDOVER.md](HANDOVER.md) §5 软链工具链的机器跳过 `npm install`；它会把软链换成真实目录。

离线验证：

```sh
python3 -m unittest discover -s packages/tool/tests -v
node --test packages/tool/tests/*.test.mjs
node --test packages/agent/tests/*.test.cjs
npm test --prefix packages/data
node --test benchmarks/tests/*.test.mjs
.venv-benchmark/bin/python -m unittest discover -s benchmarks/tests -v
```

代码边界见 [CLAUDE.md](CLAUDE.md)；本轮验收与真实界面证据见 [GOAL-PLAN.md](GOAL-PLAN.md)。

## 自动环境与验证

LimiX Agent 激活后默认准备独立 Python 环境，路径为 `~/.limix/python/<环境指纹>`。
依赖版本固定，首次联网安装，后续复用；不会修改系统 Python。
包含 numpy、pandas、scikit-learn、xgboost、openpyxl、xlrd。
机器须已有 Python 3.12+；解释器和操作系统原生库不属于 pip 自动安装范围。
`runtime status` 查看状态，`runtime prepare` 等待或重试，返回可直接执行的 Python 路径。
普通预测注册不等待安装；模型比较自动等待准备完成。
本地数据脚本也应使用返回的解释器，不假设系统 `python3` 已可用。

运行 `node scripts/validate.mjs --output <新验证目录>`，构建五包、执行契约测试、隔离解包载入并记录 SHA256。
这只完成自动检查。界面、新机器与录像分别记录，未完成项见 [本轮审查记录](reviews/coffee-release-review.md)。
本轮原生 DSH 与浏览器 HTML 已实测；纯浏览器 DSH 完整流程、第二台电脑和连续录像仍未验收。
首轮钢材、单车和咖啡报告曾有过强推断，经界面追问修订；程序核验不能替代业务推断复核。
