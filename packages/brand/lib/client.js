/**
 * LimiX cover — browser half.
 *
 * One brand on two shipped surfaces:
 *  - the blank-session hero line (mark · headline · preview pill);
 *  - the sidebar brand row and its collapsed rail (mark · name).
 *
 * Hero: `conversation.hero.brand.mark` is an official slot, so this plugin
 * occupies it. The shipped headline and pill have no slot of their own, so the
 * injected stylesheet hides the shipped `.titleGroup` and the occupant draws
 * the whole line itself.
 *
 * Sidebar: `sidebar.brand.mark` and `sidebar.brand.name` are replacement
 * slots. A single slot renders the first live entry, entries sort by ascending
 * `priority`, and ties keep registration order — so a negative priority is what
 * puts this occupant ahead of the shipped one.
 *
 * Copy comes from the `limix-cover` locale namespace; edit the dictionaries
 * below, then run `node build.mjs` to regenerate `lib/client.js`.
 */

const MARK = {
  /** Hero mark height in px; the source PNG is 144x132. */
  heroHeight: 32,
  /** Edge used when the sidebar slot passes no size. */
  sidebarSize: 24,
  /** Filled in by build.mjs from assets/limix-mark.png. */
  dataUri: 'data:image/png;base64,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',
};

/** Own namespace: no shipped namespace is overwritten, and both locales ship. */
const NAMESPACE = 'limix-cover';

const MESSAGES = {
  zh: {
    'hero.title': 'LimiX 智能预测Agent',
    'hero.badge': '预览版',
    'sidebar.name': 'LimiX',
  },
  en: {
    'hero.title': 'LimiX Prediction Agent',
    'hero.badge': 'Preview',
    'sidebar.name': 'LimiX',
  },
};

/**
 * `[class*="fishHitbox"] + [class*="titleGroup"]` targets the shipped headline
 * and pill without depending on the build's CSS-module hash prefix.
 */
const STYLES = `
[class*="fishHitbox"] + [class*="titleGroup"] { display: none !important; }
.limix-cover {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 4px 10px;
	min-width: 0;
}
.limix-cover-mark {
	display: block;
	flex: none;
	height: ${MARK.heroHeight}px;
	width: auto;
}
.limix-cover-title {
	color: var(--dsw-alias-label-primary);
	font-size: 26px;
	font-weight: 500;
	line-height: 32px;
}
.limix-cover-badge {
	border: .5px solid var(--dsw-alias-interactive-bg-hover);
	background: var(--dsw-alias-state-business-tertiary);
	color: var(--dsw-alias-label-primary-bluish);
	font-family: var(--ds-font-family-code);
	white-space: nowrap;
	border-radius: 999px;
	align-self: flex-start;
	margin-top: 2px;
	padding: 1px 7px 0;
	font-size: 12px;
	font-weight: 500;
	line-height: 18px;
}
.limix-sidebar-name {
	color: inherit;
	white-space: nowrap;
}
`;

window.__ModuleLoader__.load({
	id: 'dsh-limix-cover',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		/** Bound by `apply`; reading it per render keeps locale switches live. */
		let t = (key) => key;

		function markImage(className, size) {
			return h('img', {
				className,
				src: MARK.dataUri,
				alt: '',
				height: size,
				draggable: false,
				style: { height: size, width: 'auto', display: 'block', flex: 'none' },
			});
		}

		/** The hero cover: mark, translated headline, and the preview pill. */
		function LimixHeroCover() {
			const badge = t('hero.badge');
			const parts = [
				React.cloneElement(markImage('limix-cover-mark', MARK.heroHeight), { key: 'mark' }),
				h('span', { className: 'limix-cover-title', key: 'title' }, t('hero.title')),
			];
			if (badge !== '') {
				parts.push(h('span', { className: 'limix-cover-badge', key: 'badge' }, badge));
			}
			return h('span', { className: 'limix-cover' }, parts);
		}

		/** Sidebar mark; rendered in the brand row and in the collapsed rail. */
		function LimixSidebarMark(props) {
			const size = typeof props?.size === 'number' ? props.size : MARK.sidebarSize;
			return markImage('limix-sidebar-mark', size);
		}

		/** Sidebar name, beside the mark in the expanded brand row. */
		function LimixSidebarName() {
			return h('span', { className: 'limix-sidebar-name' }, t('sidebar.name'));
		}

		return {
			/** Services: the slot registry and the dictionary registry. */
			inject: ['slots', 'locale'],
			apply(ctx) {
				t = ctx.locale.bind(NAMESPACE);
				ctx.effect(() => ctx.locale.register(NAMESPACE, MESSAGES), 'limix-cover: dictionaries');
				ctx.effect(() => {
					const style = document.createElement('style');
					style.setAttribute('data-limix-cover', '');
					style.textContent = STYLES;
					document.head.appendChild(style);
					return () => style.remove();
				}, 'limix-cover: styles');
				// Ascending priority, first entry wins a single slot: -1 shadows the shipped occupants.
				ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register(
					{ name: 'conversation.hero.brand.mark', priority: -1 }, LimixHeroCover));
				ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register(
					{ name: 'sidebar.brand.mark', priority: -1 }, LimixSidebarMark));
				ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register(
					{ name: 'sidebar.brand.name', priority: -1 }, LimixSidebarName));
			},
		};
	},
});
