import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = await realpath('out');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
http
  .createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method ?? '')) {
        res.writeHead(405);
        res.end();
        return;
      }
      const url = new URL(req.url ?? '/', 'http://localhost');
      let path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      path = await realpath(path);
      if (!path.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(path);
      res.writeHead(200, {
        'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': path.endsWith('sw.js') ? 'no-cache' : 'no-cache',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.open-meteo.com; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  })
  .listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () =>
    console.log(
      'Migraine Terminal listening on port ' + (process.env.PORT ?? 3000),
    ),
  );
