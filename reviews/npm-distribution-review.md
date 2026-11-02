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
