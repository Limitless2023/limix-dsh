# dsh-limix-cover

一个 DSH 客户端插件：把「空白会话」封面和左侧边栏品牌都换成 LimiX。

```
封面：  [ 小鱼图标 ] 探索未至之境 [预览版]   →   [ LimiX 三角标 ] LimiX 智能预测Agent [预览版]
侧边栏：[ 小鱼 ] deepseek HARNESS           →   [ LimiX 三角标 ] LimiX
```

## 它怎么做到的

### 封面（hero）

由 `@deepseek-ai/dsh-client-ui-conversation` 渲染，结构是：

```jsx
<span className="…fishHitbox">
  {renderSlot('conversation.hero.brand.mark', { size: 34, className },
              { fallback: <HeroFish /> })}           // ← 图标：官方 slot（replaceRisk: none）
</span>
<span className="…titleGroup">
  <span>{t('hero.headline')}</span>                  // ← 「探索未至之境」
  <span className="…previewBadge">{t('hero.preview')}</span>   // ← 「预览版」
</span>
```

- **图标**：占 `conversation.hero.brand.mark`，画自己的标 + 标题 + 徽标。
- **文字**：标题和徽标是语言词条、没有 slot，而 `ctx.locale.register()` 对同一个
  命名空间 + 语言重复注册会抛错，覆盖不了。所以插件注入一小段 CSS 把原
  `.titleGroup` 隐藏（`[class*="fishHitbox"] + [class*="titleGroup"]`，不依赖构建
  生成的 class 前缀 hash），文字由 occupant 自己画。

### 侧边栏

由 `@deepseek-ai/dsh-client-ui-sidebar` 渲染：

```jsx
<span className="…brandMark">{renderSlot('sidebar.brand.mark', { size: 24 }, {…})}</span>
<span className="…brandName">{renderSlot('sidebar.brand.name', {}, {…})}</span>
```

两个都是 `shadows-shipped-ui` 的替换位。**单槽位的规则是「按 priority 升序取第一个
entry」，priority 相同则保留注册顺序**，所以这里用 `priority: -1` 抢在官方 occupant
前面，实现覆盖（官方那个是 priority 0、先注册）。

同一个标还会出现在折叠护栏（`span.railMark`）里，复用同一个 occupant。

### 文案

文案走客户端 locale 服务：插件注册自己的命名空间 `limix-cover`（zh + en），
组件里用 `ctx.locale.bind('limix-cover')` 取词条，切换语言即时生效，且不碰任何
官方命名空间。

不改 `app.asar`，不碰签名和 `ElectronAsarIntegrity`，升级 DSH 不会被覆盖。

## 文件

| 路径 | 作用 |
| --- | --- |
| `src/client.js` | 浏览器半边源码（文案字典、样式、三个 slot 占用），要改就改这里 |
| `src/index.js` | 宿主半边（空的 `apply`，给 Loader 一个宿主行） |
| `locale/zh.json`、`locale/en.json` | 插件页显示用的标题/描述（不是运行时文案） |
| `assets/limix-mark.png` | 标志图，构建时内联成 data URI |
| `assets/limix-icon.png` | 插件页图标（256×256 透明底） |
| `build.mjs` | 把 `src/*` 和标志图合成 `lib/client.js` / `lib/index.js` |
| `lib/` | 构建产物，插件实际加载的就是这里 |
| `smoke.mjs` | 不装插件也能跑的自测（stub loader + 渲染成静态 HTML） |
| `cordis.patch.yml` | bundle patch：安装时把插件行插进 profile 树 |

## 改文案 / 换图

1. 文案在 `src/client.js` 的 `MESSAGES`：

   ```js
   const MESSAGES = {
     zh: { 'hero.title': 'LimiX 智能预测Agent', 'hero.badge': '预览版', 'sidebar.name': 'LimiX' },
     en: { 'hero.title': 'LimiX Prediction Agent', 'hero.badge': 'Preview', 'sidebar.name': 'LimiX' },
   };
   ```

   `hero.badge` 设成 `''` 就不显示徽标。插件页里显示的名字/描述在 `locale/*.json`。

2. 换图：替换 `assets/limix-mark.png`（透明底 PNG）；插件页图标换
   `assets/limix-icon.png`。
3. 重新构建并自测：

   ```bash
   node build.mjs && node smoke.mjs
   ```

4. 页面刷新一下（client 插件走 HMR 时会自己重载）。

## 安装 / 卸载

安装走 `plugin_manager`（`install_bundle`，target 为这个包的绝对路径），或 GUI
「插件」页的安装入口；卸载用 `remove_bundle`，或在插件页把它关掉。

修好这个包之后如果要重新装一次同样的路径，`install_bundle` 会返回
`already-installed`——先 `remove_bundle` 再装，或者直接改文件靠 HMR 生效。

## 已知边界

- 隐藏原标题用的是结构性选择器（`fishHitbox` + `titleGroup` 这对相邻关系）。
  DSH 若重构 hero 结构，这段 CSS 要跟着调；失效表现是标题重复出现，不会白屏。
- 侧边栏名字是纯文本、跟随主题色；标志本身是品牌蓝，亮/暗底都验过。
- 英文词条是按中文意译的（`LimiX Prediction Agent` / `Preview`），如需固定说法改
  `MESSAGES.en` 即可。
