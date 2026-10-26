/**
 * [INPUT]: tsdown（rolldown 系打包器）；契约复刻 DSH 官方 packages/client/tsdown.client.ts
 * [OUTPUT]: 两份产物 —— lib/index.js（Node 半，ESM）、lib/client.js（浏览器半，CJS 闭包工厂）
 * [POS]: dsh-limix-agent 的构建入口。树外插件够不到官方 monorepo 的共享预设，故手写等价配置
 */
import { defineConfig } from 'tsdown'

const ID = 'dsh-limix-agent'

// external 白名单 = 宿主平台模块表；require() 这些名字由宿主 ModuleLoader 的模块表回答
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
    // ── Node 半：工具注册 + CSV 只读路由 ──
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    dts: false,
    clean: false,
    fixedExtension: false,
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
