# npm 分发准备交叉审查

日期：2026-11-02。正式版 UI commit 为 19b3f77，GitHub v0.3.9 已发布，下载回验五包 SHA256 全部一致。候选 npm 版本为 0.3.10，尚未发布。

## 独立复审

分发 reviewer 核对五包元数据、包间依赖、最低宿主版本、安装命令与隔离测试证据。发现预检未拒绝 source_dirty=true。已将预检改为强制要求干净源码、当前提交与 manifest.source_commit 一致。五包 `publish --dry-run` 只核验发布准备，不等于发布成功。

UI reviewer 复核三项修复：按轮次展开业务步骤、同任务查询去重、限制当前会话导航。独立重跑29项测试全部通过，无发版阻塞项。未来 benchmark 若返回嵌套 task_id，需继续保持稳定任务身份，避免用子任务去重；当前输出契约不触发。

## 隔离环境验收

桌面自带 DSH CLI 0.2.1-rc.5；独立 DSH_HOME 位于 Coffee/_recon/npm-validation/home。测试使用本机只读 registry，不向 npm 上传。

- npm-fresh：五包0.3.10首次安装，实际启动Web，插件页显示五包，tool详情来源为npm名称而非本地路径。
- npm-upgrade：0.3.8→0.3.10，精确依赖、实际包版本与bundle数量全部核对。
- tgz-migration：0.3.8 tgz→npm0.3.10；重启Web后，数据源设置保留，新增会话为用户配置的Standard mode。
- tgz039-migration：补充最新0.3.9 tgz→npm0.3.10，版本/去重/配置保留检查通过。
- 测试环境API Key由安装后包内真实读取器解析，未发至API；日常 ~/.limix/config.json 前后哈希不变。
- 数据源和profile patch安装前后字节一致；设置页成功加载测试连接，路由返回200。测试数据库为虚拟连接，不冒充实际查询验收。
- 使用宿主 evaluatePluginCompatibility 验证：rc.5通过，rc.4与0.2.0不满足声明。

一次初始测试将standard写为不存在的default标识；发现后修正为standard并重新跑完整升级/迁移，最终结果与界面均按standard核对。旧的无效标识结果不计入验收。

证据：Coffee/_recon/npm-validation 的 migration-results-038.json、migration-results-039.json、fresh-five-plugins.png、npm-tool-version.png、migration-standard-preserved.png、migration-datasource-preserved.png。不复制登录token日志或凭据。

## 保留边界

公共npm实际发布、安装权限与下载待用户授权后验收。四包许可证、npm账号尚待确认。Windows/第二台电脑与本隔离环境的真实API预测、数据库查询未做。mysql2的@types/node类型peer警告保留；运行时加载与页面已通过。

既有报告仍需人工审阅；上游光学20变量无向解释仍报错，本轮没有改动或重试该接口。文案核对不把本地registry说成公共npm，不把配置保留说成数据库查询通过。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

## 2026-11-02 发布授权后

用户批准npm发布并要求非商业用途授权。五包加入PolyForm Noncommercial 1.0.0原文、商业授权联系入口与第三方许可全文；cover历史MIT权利保留。预检增加许可证字段与三份许可文件逐字节检查。当前等待npm账号登录，不把dry-run记为已发布。

## 公共 npm 验收完成

2026-11-02：账号limix2026发布五包0.3.10；源码提交b9e282c，GitHub标签v0.3.10。五包公共registry元数据与真实下载均核对通过，integrity/SHA256与Release一致。

全新DSH_HOME在Coffee/_recon/npm-public-validation/home：public-fresh首装通过；tgz039-migration从0.3.9 tgz迁移到公共npm0.3.10通过。五个实际安装版本与精确依赖一致，无重复bundle；profile标准模式选择、数据源文件和凭据读取检查通过，用户真实API配置哈希不变。

独立DSH rc.5启动通过，浏览器插件页显示五包，tool详情显示dsh-limix-tool@0.3.10来源，数据源配置路由200且设置页显示保留的连接。证据：registry-verification.json、migration-results-039.json、public-five-plugins.png、public-tool-version.png、public-datasource-preserved.png，均位于Coffee/_recon/npm-public-validation。

npm提交后有数分钟的处理期，期间404如实记录；待全部可下载才标记公共验收通过。尚无旧公共npm版本，跨npm版本升级仍是本地registry验收。Windows、真实API/数据库业务调用和后端解释问题保持原有未验收状态。

## 0.3.11 发布与升级

2026-11-02：用户明确要求在保留提示词已知问题的情况下发布。五包从干净提交0bf1988构建，完整自动检查与发布预检通过；npm五包固定版本和latest均为0.3.11，registry integrity与发布清单一致。GitHub Release v0.3.11上传同一批五个tgz、manifest及SHA256SUMS。

独立DSH_HOME完成公共npm0.3.10→0.3.11升级，五包实际版本与精确依赖一致，无重复bundle。标准模式选择、数据源文件保持一致；假凭据通过实际读取器校验，用户真实API配置哈希不变。首次尝试时preset尚未完成npm处理而返回404；保留失败日志，待公共版本可用后重试通过。

本机desktop五包已升级0.3.11，并正常退出、重开DSH。升级前备份；443个原有配置、凭据、会话、附件及其他文件哈希不变。package.json、pnpm-lock.yaml更新版本；pnpm-workspace.yaml仅将五包的新版本加入安装器生成的minimumReleaseAgeExclude，其他设置未变。桌面profile禁止CLI dump-config，未绕过此限制；没有将安装验证表述为桌面新会话实际预测验证。

本轮没有重新做第二台电脑、Windows、完整业务API流程或截图验收；咨询推断、报告人工审阅与上游光学无向解释问题继续保留。独立升级证据位于Coffee/_recon/npm-0311-validation，构建测试位于Coffee/_recon/release-0.3.11-validation；不上传用户备份或凭据。


## 0.3.12 发布与升级

2026-11-02：五包从干净提交868aaf0构建并通过发布预检。公共npm五包固定版本与latest均为0.3.12；真实下载的integrity和SHA256与构建清单一致。GitHub Release v0.3.12已公开，五个tgz、manifest和SHA256SUMS回下载与本地逐字节一致。

独立DSH_HOME使用桌面自带CLI完成公共npm0.3.11→0.3.12升级。五包实际版本、精确依赖和bundle去重检查通过；标准模式选择、数据源文件、profile patch保持一致。假凭据通过安装包内实际读取器校验，用户真实API配置哈希不变。npm处理期间首次升级因版本暂不可用失败；保留失败日志，五包全部可下载后原环境重试通过。

验收证据位于Coffee/_recon/npm-0312-public：registry.json、migration-results.json、首次失败与重试日志、github-assets。不上传测试凭据或用户配置。本轮未更新日常desktop安装；未重新验证Windows、第二台电脑、tgz迁移或全部业务API。提示词推断、报告人工审阅和光学20变量无向解释上游问题继续保留。

## 0.3.13 发布与升级

2026-11-03：五包从干净提交8f13893构建。公共npm0.3.13五包真实下载的integrity、SHA256与清单一致；GitHub Release v0.3.13的五个tgz、manifest和SHA256SUMS回下载逐字节一致。

独立DSH_HOME完成公共npm0.3.12→0.3.13升级。五包实际版本与精确依赖一致，bundle无重复；标准模式选择、数据源文件和profile patch保留。安装包实际凭据读取器通过测试，用户真实API配置哈希不变。npm处理期间版本暂不可用，重试通过；一次下载TLS连接中断后重新核对五包通过。

证据位于Coffee/_recon/npm-0313-public。实际DSH因果界面验收和保留问题见[本轮审查](causal-ui-0313-review.md)。本轮未升级日常desktop，未重做首次安装、tgz迁移、Windows或第二台电脑验收。
