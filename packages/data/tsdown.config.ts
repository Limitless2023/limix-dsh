/**
 * [INPUT]: 依赖 tsdown；构建契约照抄 packages/limix-ui/tsdown.config.ts（本仓开发法则第 3 条）
 * [OUTPUT]: lib/index.js（Node 半 ESM；pg/mysql2 external 留给运行时动态 import）
 *           + lib/client.js（浏览器半 CJS 闭包工厂）
 * [POS]: limix-datasource 的构建入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from 'tsdown'

const ID = 'dsh-limix-data'

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

export default defineConfig([
  {
    // ── Node 半：工具 + 路由；数据库驱动运行时动态 import，不打包 ──
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    dts: false,
    clean: false,
    fixedExtension: false,
    external: ['pg', 'mysql2', 'mysql2/promise'],
  },
  {
    // ── 浏览器半：CJS 闭包工厂（宿主 ModuleLoader 契约）──
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    dts: false,
    clean: false,
    sourcemap: false,
    fixedExtension: false,
    external: CLIENT_EXTERNALS,
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.MODE': JSON.stringify('production'),
      'import.meta.env': JSON.stringify({ MODE: 'production' }),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
