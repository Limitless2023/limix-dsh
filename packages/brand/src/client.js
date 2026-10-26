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
  dataUri: '__LIMIX_MARK_DATA_URI__',
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
