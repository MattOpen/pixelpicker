/**
 * Prueft, ob die Optionstabellen in README und Produktseite denselben
 * Wortlaut tragen.
 *
 *   node --run check
 *
 * Warum es beide Orte gibt: Die README liest, wer das Paket installiert --
 * auf npm, offline, in der IDE. Die Seite liest, wer es kennenlernt, mit
 * den Demos daneben. Keiner der beiden soll auf den anderen verwiesen
 * werden. Derselbe Wortlaut ist die Bedingung dafuer, und dieses Skript
 * stellt sie fest, statt sie zu hoffen.
 *
 * Endet mit Code 1, wenn etwas auseinanderlaeuft.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [readme, page] = await Promise.all([
  readFile(join(root, 'README.md'), 'utf8'),
  readFile(join(root, 'docs/index.html'), 'utf8')
]);

/** Auszeichnung entfernen, damit nur der Wortlaut bleibt. */
const plain = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/[`'"]/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/[.,]$/, '')
    .trim();

// README: | `option` | type | default | description |
const readmeRows = new Map();
for (const line of readme.split('\n')) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length !== 4) continue;
  const nameMatch = cells[0].match(/^`(\w+)`$/);
  if (!nameMatch) continue;
  readmeRows.set(nameMatch[1], {
    type: cells[1],
    def: plain(cells[2]),
    desc: plain(cells[3])
  });
}

// Seite: <td><code>option</code></td><td>type</td>…
const pageRows = new Map();
const rowRe =
  /<tr>\s*<td><code>(\w+)<\/code><\/td><td>(\w+)<\/td><td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gs;
for (const m of page.matchAll(rowRe)) {
  pageRows.set(m[1], { type: m[2], def: plain(m[3]), desc: plain(m[4]) });
}

console.log(`README: ${readmeRows.size} Optionen, Seite: ${pageRows.size} Optionen\n`);

const alle = new Set([...readmeRows.keys(), ...pageRows.keys()]);
let gleich = 0;
const abweichend = [];

/**
 * Die Beschreibung von `labels` verweist an beiden Orten auf denselben
 * Abschnitt, aber mit unterschiedlichem Ziel: die README auf ihren eigenen
 * Anker, die Seite auf die README. Derselbe Satz, anderer Link.
 */
const LINK_ONLY = new Set(['labels']);

for (const name of alle) {
  const r = readmeRows.get(name);
  const p = pageRows.get(name);
  if (!r) { abweichend.push(`${name}: fehlt in der README`); continue; }
  if (!p) { abweichend.push(`${name}: fehlt auf der Seite`); continue; }

  // Linkziele herausrechnen, wo nur sie sich unterscheiden duerfen.
  const strip = (s) => (LINK_ONLY.has(name) ? s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') : s);

  if (strip(r.desc) === strip(p.desc) && r.type === p.type && r.def === p.def) {
    gleich += 1;
  } else {
    abweichend.push(
      `${name}:\n    README: ${r.type} | ${r.def} | ${r.desc}\n    Seite:  ${p.type} | ${p.def} | ${p.desc}`
    );
  }
}

console.log(`Wortgleich: ${gleich} von ${alle.size}`);

if (abweichend.length) {
  console.log('\nAbweichungen:\n  ' + abweichend.join('\n  '));
  console.log('\nBeide Fassungen angleichen -- die Seite ist die ausfuehrlichere.');
  process.exit(1);
}

console.log('README und Seite stimmen ueberein.');
