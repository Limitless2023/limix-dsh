#!/bin/sh
# [INPUT]: Node.js、npm 与已安装的构建依赖。
# [OUTPUT]: 五个插件 tarball、版本清单和 SHA256 校验值。
# [POS]: 发布入口；scripts/release.mjs 负责构建与完整性检查，不上传。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
# 用法: ./release.sh
set -eu
cd "$(dirname "$0")"
exec node scripts/release.mjs
