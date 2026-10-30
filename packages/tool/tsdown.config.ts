/**
 * [POS]: dsh-limix-tool 的构建入口——只有宿主半（limix 工具 + csv 只读路由）。
 *        界面半在 dsh-limix-agent 包里，由 profile 加载。
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
  },
])
