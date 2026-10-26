#!/bin/sh
# 打包三个包的 tarball 到 dist/，用于 GitHub Release。
# 用法: ./release.sh
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
for pkg in agent data brand; do
  [ -d "packages/$pkg" ] || continue
  (cd "packages/$pkg" && pnpm pack --pack-destination "$OLDPWD/dist" >/dev/null)
  echo "packed packages/$pkg"
done
ls -la dist
