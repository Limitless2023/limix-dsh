# LimiX Agent v0.3.14

五个 Harness 插件统一更新为 0.3.14。本轮功能修改集中在 agent；data、tool、preset、cover 同步版本。npm 与 GitHub Release 使用同一批 tgz。

## 本次变化

- 工具卡右上角支持折叠与展开，保留当前图表和样本选择；刷新会恢复默认展开。
- 预测与解释卡的“更多”菜单提供本次训练集、预测集、解释输入和已保存结果的本地文件入口。点击后交给 Harness 侧栏打开；全屏中打开文件会先退出全屏。
- 菜单使用顶层浮层，避免被会话滚动区域裁切。
- 修复贡献热力图误用关系矩阵固定高度的问题，减少普通卡片上下留白，保留全屏布局和底部操作入口。

## 安装与更新

最低支持 DeepSeek Harness 0.2.1-rc.5。正常退出桌面应用后，在原 profile 中执行：

```sh
dsh plugin --profile desktop add --save-exact --registry=https://registry.npmjs.org/ dsh-limix-data@0.3.14 dsh-limix-tool@0.3.14 dsh-limix-agent@0.3.14 dsh-limix-preset@0.3.14 dsh-limix-cover@0.3.14
```

完整步骤见 [NPM-DISTRIBUTION.md](NPM-DISTRIBUTION.md)。非商业许可与商业授权入口不变。

## 验证与边界

五包构建、自动测试、打包检查与树外载入通过。独立 DSH 实测折叠、全屏、输入与结果文件预览，以及热力图普通/全屏/侧栏窄布局；另执行真实回归验证结果文件入口。详见 [审查记录](reviews/card-files-0314-review.md)。

文件被移动或删除后，入口不能保证仍可打开；文件权限继续由 Harness 校验。仅使用远程版本 ID 的任务不补造本地文件入口。报告与业务判断仍需人工审阅。光学 20 变量无向解释的后端错误保留；未宣称修复。Windows、第二台电脑和全部预测 API 未在本轮重新验收。
