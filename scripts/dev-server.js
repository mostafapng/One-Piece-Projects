import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname } from 'node:path';
import { createHandler, jsonResponse, SECURITY_HEADERS } from '../lib/http.js';

const root = fileURLToPath(new URL('../web/', import.meta.url));
const routes = new Map(['status', 'movies', 'episode', 'chat', 'movie', 'movie-chat'].map(route => [`/api/${route}`, createHandler(route)]));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535.');

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (routes.has(path)) return await routes.get(path)(req, res);
    if (path.startsWith('/api/')) return jsonResponse(res, { error: 'Not found.' }, 404);
    if (!['GET', 'HEAD'].includes(req.method)) return jsonResponse(res, { error: 'Method not allowed.' }, 405);
    const mapping = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
    let file = mapping[path];
    if (!file && /^\/assets\/(art|fonts)\//.test(path)) file = path.slice('/assets/'.length);
    if (!file) return jsonResponse(res, { error: 'Not found.' }, 404);
    const target = resolve(root, file);
    if (relative(root, target).startsWith('..')) return jsonResponse(res, { error: 'Not found.' }, 404);
    const content = await readFile(target);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    res.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
    res.statusCode = 200;
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    jsonResponse(res, { error: 'Not found.' }, 404);
  }
});
server.requestTimeout = 30_000;
server.listen(port, '127.0.0.1', () => console.log(`Log Pose running on loopback port ${port}. Node.js / Vercel-compatible handlers.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
