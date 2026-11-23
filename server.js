import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_ROOT = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const ENTRY_FILE = fileURLToPath(import.meta.url);
const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
]);

function respond(res, status, body = '', headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

export function createAppServer() {
  return http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      respond(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
      return;
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    if (requestUrl.pathname === '/health') {
      respond(res, 200, JSON.stringify({ status: 'ok' }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      respond(res, 400, 'Bad request');
      return;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(PUBLIC_ROOT, relativePath);
    if (filePath !== PUBLIC_ROOT && !filePath.startsWith(`${PUBLIC_ROOT}${path.sep}`)) {
      respond(res, 403, 'Forbidden');
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        respond(res, 404, 'Not found');
        return;
      }
      const content = await readFile(filePath);
      const contentType = CONTENT_TYPES.get(path.extname(filePath)) ?? 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
        respond(res, 404, 'Not found');
        return;
      }
      console.error('Static file request failed:', error);
      respond(res, 500, 'Internal server error');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === ENTRY_FILE) {
  const port = Number.parseInt(process.env.PORT ?? '4173', 10);
  const server = createAppServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`物流运单协同系统已启动：http://127.0.0.1:${port}`);
    console.log('按 Ctrl+C 停止服务');
  });
}
