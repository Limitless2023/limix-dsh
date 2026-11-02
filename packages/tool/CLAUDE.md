# packages/tool/

> L2 | 父级: ../../CLAUDE.md

src/index.ts - 注入 limixDatasource；在 preset 内注册两个工具、预测/解释/比较命令及受控结果下载。
src/host/tool.js - 调用包内 CLI 或本地报告生成器，返回 stdout 与 stderr。
src/report/ - 核验程序事实并生成 HTML、Markdown 历史副本和图表预览。
src/host/predict-command.js - 原生命令与自然语言预测；核对预测时点可用特征。
src/host/explain-command.js - /limix-explain 入口与解释口径。
src/host/benchmark-command.js - /limix-compare 入口与固定拆分比较流程；明确分类/回归范围。
src/host/csv-access.js - 持久登记成功结果；CSV/JSON 扩展名、真实路径与大小校验。
assets/ - Python CLI、指标计算、批量对齐、解释编排与图标。
lib/index.js - 宿主构建产物；包含报告所需的图表与 React 服务端渲染。
tests/ - 指标、命令入口、附件与 CSV 读取边界验证。
LICENSE / LICENSING.md / THIRD-PARTY-NOTICES.md - 非商业许可、商业授权入口及历史/第三方权利。
package.json - npm 公开分发元数据、最低 Harness rc.5 声明；宿主入口与分发文件清单。
cordis.patch.yml - 空补丁；宿主仅由 LimiX preset 挂载。
tsdown.config.ts - 构建宿主 ESM。
locale/ - 插件名称与说明。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
