// WAYANG CLASH — a small static server for local play-testing.
// Serves game/ at http://localhost:8080 with no build step and no network.
// Run with: node serve.ts

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, 'game');
const port = 8080;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = resolve(join(gameDir, normalize(path)));
    if (!filePath.startsWith(gameDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch (err) {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`WAYANG CLASH at http://localhost:${port}`);
});
