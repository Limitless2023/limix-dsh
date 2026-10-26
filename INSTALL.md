# 给同事的安装说明（可以直接发给他的 agent）

把下面整段粘给你的 DSH agent 即可。它会装两个包（品牌包可选），装完让你重启或刷新。

---

请在这个 DSH profile 里安装 LimiX 插件，用 `plugin_manager` 工具的 `install_bundle`：

1. `target` = `https://github.com/Limitless2023/limix-dsh/releases/download/v0.1.0/dsh-limix-agent-0.1.0.tgz`
2. `target` = `https://github.com/Limitless2023/limix-dsh/releases/download/v0.1.0/dsh-limix-cover-0.2.0.tgz`
3. （可选，要连自家库时才装）`target` = `https://github.com/Limitless2023/limix-dsh/releases/download/v0.1.0/dsh-limix-data-0.1.0.tgz`
4. 以上动作都授权后，读返回里的 `application` 字段：`applied` 才算生效；`restart-required` 就提示我重启 DSH。

装完请检查并告诉我：

- 插件页里是否有 `LimiX Agent` 与 `LimiX 品牌封面` 两项、开关是否打开
- 新会话里说一句「用 limix 做一次健康检查」，是否出现一张 limix 工具卡（这验证 `limix` 工具 + CLI 都通了）
- 会话视图栏是否有「分析过程」标签

如果工具卡报“limix CLI 未找到”，说明包内 `assets/limix.py` 没跟上，用 `LIMIX_CLI_PATH` 指一个 `scripts/limix.py` 覆盖。

还需要我先确认的两件事：

- `python3` 可用（`limix.py` 只用标准库，不需要 pip 装东西）
- LimiX 凭据在 `~/.limix/config.json`（没有的话先跑一次 `python3 <包>/assets/limix.py config`，或设 `LIMIX_API_KEY`）

数据源那个包（`dsh-limix-data`）只有在你需要连自己的数据库时再装，它会额外拉 `pg` / `mysql2`。

---

## 为什么用 tarball 而不是 npm / github:

- 三个包各自零构建、零私有 registry，内网也能装
- `github:owner/repo` 只能装仓库根的那个包，而且要在装机时构建
