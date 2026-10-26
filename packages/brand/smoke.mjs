/**
 * Smoke test for the browser half: run the bundle outside a browser with a
 * stubbed module loader and slot/locale services, then render each registered
 * occupant to static markup.
 *
 * Usage: node smoke.mjs
 */
import { readFile } from 'node:fs/promises';

const REACT_DIR = '/Users/limitless/Desktop/Projects/limix-web/node_modules';
const React = (await import(`${REACT_DIR}/react/index.js`)).default;
const { renderToStaticMarkup } = await import(`${REACT_DIR}/react-dom/server.js`);

const code = await readFile(new URL('./lib/client.js', import.meta.url), 'utf8');

let loaded;
const window = { __ModuleLoader__: { load: (row) => { loaded = row; } } };
const require = (id) => {
	if (id === 'react') return React;
	throw new Error(`unexpected require(${id})`);
};
new Function('window', 'require', code)(window, require);

const failures = [];
const check = (label, ok, detail = '') => {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
	if (!ok) failures.push(label);
};

check('bundle registers a row', Boolean(loaded));
check('row id is the package name', loaded?.id === 'dsh-limix-cover', String(loaded?.id));

globalThis.document = {
	head: { appendChild: () => {} },
	createElement: () => ({ textContent: '', setAttribute: () => {}, remove: () => {} }),
};

const DICT = {};
const registered = [];
const injected = [];
const dictionaries = [];
const styles = [];
const ctx = {
	effect(fn, label) {
		const dispose = fn();
		if (label?.includes('styles')) styles.push({ label, dispose });
		else dictionaries.push({ label, dispose });
	},
	locale: {
		bind: (ns) => (key) => DICT[ns]?.[key] ?? key,
		register: (ns, messages) => {
			DICT[ns] = { ...messages.zh };
			return () => {};
		},
	},
	slots: {
		inject(key, callback) {
			injected.push(key);
			return callback();
		},
		register(declaration, component) {
			registered.push({ declaration, component });
			return () => {};
		},
	},
};

const exported = loaded.factory(require);
check('injects slots + locale', JSON.stringify(exported.inject) === '["slots","locale"]', JSON.stringify(exported.inject));

exported.apply(ctx);

check('registers the limix-cover namespace', Object.keys(DICT).includes('limix-cover'));
check('injects three slots', injected.length === 3, injected.join(', '));
check('all occupants use priority -1', registered.every((r) => r.declaration.priority === -1));
check('occupant slots', registered.map((r) => r.declaration.name).join(',') ===
	'conversation.hero.brand.mark,sidebar.brand.mark,sidebar.brand.name');
check('stylesheet installs once', styles.length === 1, styles[0]?.label);
check('dictionary effect labelled', dictionaries.some((d) => d.label === 'limix-cover: dictionaries'));

const byName = Object.fromEntries(registered.map((r) => [r.declaration.name, r.component]));
const heroHtml = renderToStaticMarkup(React.createElement(byName['conversation.hero.brand.mark']));
console.log(`\nhero: ${heroHtml.slice(0, 150)}...`);
check('hero renders the mark data URI', heroHtml.includes('src="data:image/png;base64,'));
check('hero renders the headline', heroHtml.includes('LimiX 智能预测Agent'));
check('hero renders the preview pill', heroHtml.includes('预览版'));

const markHtml = renderToStaticMarkup(React.createElement(byName['sidebar.brand.mark'], { size: 24 }));
console.log(`sidebar mark: ${markHtml.slice(0, 130)}...`);
check('sidebar mark honours the slot size', /height:24px/.test(markHtml));

const nameHtml = renderToStaticMarkup(React.createElement(byName['sidebar.brand.name'], {}));
console.log(`sidebar name: ${nameHtml}`);
check('sidebar name renders', nameHtml.includes('LimiX') && nameHtml.includes('limix-sidebar-name'));

for (const { dispose } of [...styles, ...dictionaries]) {
	check('disposer is a function', typeof dispose === 'function');
}

if (failures.length > 0) {
	console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
	process.exit(1);
}
console.log('\nall checks passed');
