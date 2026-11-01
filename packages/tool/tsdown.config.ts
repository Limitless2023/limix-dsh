/**
 * [INPUT]: 宿主入口与共用的 React/SVG 图表。
 * [OUTPUT]: 包含离线报告渲染器的宿主 ESM。
 * [POS]: React 服务端渲染随包构建，不依赖用户另装图表环境。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    dts: false,
    clean: false,
    fixedExtension: false,
    noExternal: [/^react(?:-dom)?(?:\/|$)/],
    define: { 'process.env.NODE_ENV': '"production"' },
  },
])
