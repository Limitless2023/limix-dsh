# packages/tool/

> L2 | 父级: ../../CLAUDE.md

src/index.ts - 注入 limixDatasource；在 preset 内注册两个工具、预测/解释/比较命令及受控结果下载。
src/host/tool.js - 调用包内 CLI，返回 stdout 与 stderr。
src/host/predict-command.js - 原生命令与预测流程指引。
src/host/explain-command.js - /limix-explain 入口与解释口径。
src/host/benchmark-command.js - /limix-compare 入口与固定拆分比较流程。
src/host/csv-access.js - 持久登记成功结果；CSV/JSON 扩展名、真实路径与大小校验。
assets/ - Python CLI、指标计算、批量对齐、解释编排与图标。
lib/index.js - 宿主构建产物。
tests/ - 指标、命令入口、附件与 CSV 读取边界验证。
package.json - 宿主入口与分发文件清单。
cordis.patch.yml - 空补丁；宿主仅由 LimiX preset 挂载。
tsdown.config.ts - 构建宿主 ESM。
locale/ - 插件名称与说明。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
