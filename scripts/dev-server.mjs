// Local preview: serves ./public with clean URLs and mounts /api/enquiries on an IN-MEMORY store.
// DEV ONLY. Nothing is persisted and no email is sent. Refuses to run in production.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../lib/enquiry-handler.js';
import { createMemoryStore } from '../lib/memory-store.js';

if (process.env.NODE_ENV === 'production') throw new Error('dev-server must not run in production');

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT ?? 8765);
const store = createMemoryStore();
const sent = [];
const notifier = { enabled: true, async sendStaffNotification(payload) { sent.push(payload.reference); } };
const api = createHandler(() => ({ store, notifier, ipSecret: 'dev-only-secret', allowedOrigins: [`http://127.0.0.1:${port}`, `http://localhost:${port}`] }));

const TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };

async function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const candidates = [clean || 'index.html', `${clean}.html`, join(clean, 'index.html')];
  for (const candidate of candidates) {
    const full = join(root, candidate);
    if (!full.startsWith(root)) continue;
    try { if ((await stat(full)).isFile()) return full; } catch { /* try next */ }
  }
  return null;
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/enquiries') return api(req, res);
  if (pathname === '/__dev/leads') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ count: store.rows.length, references: store.rows.map((r) => r.reference), notified: sent })); }
  const file = await resolveFile(pathname);
  if (!file) { res.writeHead(404, { 'content-type': TYPES['.html'] }); return res.end(await readFile(join(root, '404.html'))); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(port, '127.0.0.1', () => process.stdout.write(`Milestone Renovate dev server (in-memory leads): http://127.0.0.1:${port}\n`));
