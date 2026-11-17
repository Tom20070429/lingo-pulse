import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 4173;
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
http.createServer(async (req, res) => { const pathname = new URL(req.url, `http://${req.headers.host}`).pathname; const requested = pathname === '/' ? '/index.html' : pathname; const file = path.resolve(root, `.${requested}`); if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); } try { const body = await fs.readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end('Not found'); } }).listen(port, () => console.log(`Lingo Pulse running at http://localhost:${port}`));
