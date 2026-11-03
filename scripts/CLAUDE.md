# scripts/

> L2 | 父级: ../CLAUDE.md

npm-preflight.mjs - 核验五包元数据；新版本核对 npm dry-run 回执，已发布版本核对 registry 完整性。
npm-publish.mjs - 核验五包哈希；仅在指定 Actions 发布现有 tgz，等待 registry 可见后核验。
package-contract.mjs - 两个入口共用的分发文件检查；每包创建仓库外全新解包目录。
tests/ - 分发漏入口、敏感文件和旧解包污染的回归检查。
validate.mjs - 构建、契约与取消测试、隔离解包载入和五包校验；界面与新机器验收单独记录。
release.mjs - 构建五个插件，核验 tarball 入口与 Python 模块，生成版本清单和 SHA256。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
