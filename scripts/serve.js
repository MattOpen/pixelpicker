/**
 * Kleiner Server fuer die Beispielseite.
 *
 *   node --run demo    baut und startet
 *
 * Kein Fremdpaket: Der Server liefert nur statische Dateien aus dem
 * Projektverzeichnis und laeuft auf dem eingebauten http-Modul.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/docs/index.html';

  // Ausbrechen aus dem Projektverzeichnis verhindern.
  const target = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      response.writeHead(302, { Location: `${pathname}/index.html` }).end();
      return;
    }

    response.writeHead(200, {
      'Content-Type': TYPES[extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Not found: ${pathname}`);
  }
});

server.listen(port, () => {
  console.log(`pixelpicker demo -> http://localhost:${port}/`);
  console.log('Stop with Ctrl+C');
});
