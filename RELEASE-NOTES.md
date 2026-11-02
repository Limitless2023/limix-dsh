# LimiX Agent v0.3.10

本版为五个 Harness 插件增加 npm 分发，并保留 GitHub Release tgz。五包统一0.3.10；业务代码沿用已验证的v0.3.9 UI修复。

## 安装与授权

- 五包名：dsh-limix-data、dsh-limix-tool、dsh-limix-agent、dsh-limix-preset、dsh-limix-cover。
- 最低支持 Harness 0.2.1-rc.5；安装、升级和tgz迁移指令见 NPM-DISTRIBUTION.md。
- 自有代码采用 PolyForm Noncommercial 1.0.0。商业用途请联系 Limitless 取得单独书面授权，见 LICENSING.md。
- 保留第三方许可证与品牌权利。cover旧版MIT授予的权利不撤回，不宣称新版限制覆盖历史代码。
- npm与Release上传同一批tgz，随包附许可证、商业授权入口和第三方声明。

## 验证与保留边界

发布前完成独立DSH的五包首装、npm版本升级、0.3.8/0.3.9 tgz迁移、配置保留和宿主版本检查。公共registry验收另记于 reviews/npm-distribution-review.md。五包并非原子发布，请确认五包都可用再安装。

报告仍需人工审阅；Windows、第二台电脑、本隔离环境的真实预测和数据库查询未验收。光学20变量无向解释上游 EXPLANATION_FAILED 保留；3变量对照成功但0条关系。本轮未重测，不宣称修复。
