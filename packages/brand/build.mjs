/**
 * Build `lib/client.js` and `lib/index.js` from `src/` plus `assets/`.
 *
 * The browser bundle is a single file served from `/plugins/dsh-limix-cover`,
 * so the mark travels inline as a data URI instead of a sibling asset request.
 *
 * Usage: node build.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const mark = await readFile(new URL('assets/limix-mark.png', root));
const markDataUri = `data:image/png;base64,${mark.toString('base64')}`;

const source = await read('src/client.js');
if (!source.includes('__LIMIX_MARK_DATA_URI__')) {
	throw new Error('build: src/client.js no longer contains the __LIMIX_MARK_DATA_URI__ placeholder');
}
const bundle = source.replace('__LIMIX_MARK_DATA_URI__', markDataUri);

await mkdir(new URL('lib/', root), { recursive: true });
await writeFile(new URL('lib/client.js', root), bundle);
await writeFile(new URL('lib/index.js', root), await read('src/index.js'));

console.log(`build: lib/client.js ${bundle.length} bytes (mark ${mark.length} bytes inlined)`);
console.log(`build: wrote ${fileURLToPath(new URL('lib/', root))}`);
