/**
 * Build: ESM, CJS, IIFE und CSS -- jeweils roh und minifiziert.
 *
 *   node build.js            einmal bauen
 *   node build.js --watch    bauen und auf Aenderungen warten
 *
 * Das IIFE-Bundle ist der Weg fuer Seiten ohne Bundler: Es setzt
 * window.PixelPicker und laesst sich per <script> einbinden.
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const outdir = join(root, 'dist');
const watch = process.argv.includes('--watch');

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const banner = `/*!
 * pixelpicker v${pkg.version} -- ${pkg.homepage}
 * Copyright (c) 2026 pixelquadrat GmbH
 * Copyright (c) 2021 Mohammed Bassit -- derived from Coloris (MIT)
 * Licensed under the MIT License.
 */`;

/** Gemeinsame Einstellungen aller JavaScript-Ziele. */
const base = {
  entryPoints: [join(root, 'src/index.js')],
  bundle: true,
  target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
  banner: { js: banner },
  legalComments: 'none',
  logLevel: 'info'
};

/** Ein Ziel je Ausgabeform, minifiziert und roh. */
const targets = [
  { format: 'esm', outfile: 'pixelpicker.mjs' },
  { format: 'esm', outfile: 'pixelpicker.min.mjs', minify: true },
  { format: 'cjs', outfile: 'pixelpicker.cjs' },
  { format: 'iife', outfile: 'pixelpicker.js', globalName: 'PixelPicker' },
  {
    format: 'iife',
    outfile: 'pixelpicker.min.js',
    globalName: 'PixelPicker',
    minify: true
  }
];

const cssTargets = [
  { outfile: 'pixelpicker.css' },
  { outfile: 'pixelpicker.min.css', minify: true }
];

function jsConfig({ format, outfile, minify = false, globalName }) {
  return {
    ...base,
    format,
    minify,
    globalName,
    sourcemap: minify,
    outfile: join(outdir, outfile),
    // Beim IIFE-Bundle sollen die benannten Exporte direkt auf dem globalen
    // Objekt liegen, nicht unter .default.
    footer:
      format === 'iife'
        ? { js: 'PixelPicker = Object.assign(PixelPicker.default, PixelPicker);' }
        : undefined
  };
}

function cssConfig({ outfile, minify = false }) {
  return {
    entryPoints: [join(root, 'src/pixelpicker.css')],
    bundle: true,
    minify,
    sourcemap: minify,
    banner: { css: banner },
    legalComments: 'none',
    outfile: join(outdir, outfile),
    logLevel: 'info'
  };
}

/** Typdeklarationen mitliefern, damit TypeScript-Projekte das Paket kennen. */
async function copyTypes() {
  const types = await readFile(join(root, 'src/pixelpicker.d.ts'), 'utf8');
  await writeFile(join(outdir, 'pixelpicker.d.ts'), types);
}

/**
 * Die Beispielseite mit ihren eigenen Kopien versorgen.
 *
 * docs/ ist die Quelle von GitHub Pages und dort die Wurzel der Website --
 * ein ../dist/ aus der Seite heraus fuehrt ins Nichts. Die Dateien werden
 * deshalb gespiegelt statt verlinkt, und zwar beim Bauen: Eine Kopie, die
 * man von Hand pflegt, laeuft irgendwann auseinander.
 */
async function copyToDocs() {
  const docsAssets = join(root, 'docs/assets');
  await mkdir(docsAssets, { recursive: true });

  for (const file of ['pixelpicker.js', 'pixelpicker.css']) {
    await copyFile(join(outdir, file), join(docsAssets, file));
  }
}

async function run() {
  await mkdir(outdir, { recursive: true });

  const configs = [...targets.map(jsConfig), ...cssTargets.map(cssConfig)];

  if (watch) {
    const contexts = await Promise.all(configs.map((config) => esbuild.context(config)));
    await Promise.all(contexts.map((context) => context.watch()));
    await copyTypes();
    await copyToDocs();
    console.log('pixelpicker: watching for changes...');
    return;
  }

  await Promise.all(configs.map((config) => esbuild.build(config)));
  await copyTypes();
  await copyToDocs();
  console.log(`pixelpicker v${pkg.version}: build complete -> dist/, docs/assets/`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
