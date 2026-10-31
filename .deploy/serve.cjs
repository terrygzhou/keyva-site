// Keyva site local deploy server
// Serves the static Astro build (dist/) on 0.0.0.0:8765
//   /           -> en (default)
//   /zh/...    -> zh
// Clean URLs: /about/ -> en/about/index.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist');
const PORT = process.env.KEYVA_PORT ? Number(process.env.KEYVA_PORT) : 8765;
const HOST = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let p = decodeURIComponent(url.pathname);

  if (p === '/') p = '/index.html';

  // /zh/... -> zh; /en/... -> en; asset paths stay at root; bare pages -> en
  const m = p.match(/^\/(zh|en)(\/.*)?$/);
  const isAsset = /\.(css|js|map|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|eot|txt|json|pdf|mp4|webm)$/i.test(p);
  if (m && !isAsset) {
    p = '/' + m[1] + (m[2] || '/index.html');
  } else if (m) {
    p = m[2] || '/index.html';
  } else if (isAsset) {
    // keep root-level asset path as-is (resolved against dist/)
  } else {
    p = '/en' + p;
  }

  let filePath = path.normalize(path.join(ROOT, p));
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, st) => {
    let target = filePath;
    if (!err && st.isDirectory()) {
      target = path.join(filePath, 'index.html');
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        const nf = path.join(ROOT, '404.html');
        return fs.readFile(nf, (e2, d2) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(e2 ? 'Not Found' : d2);
        });
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': data.length,
      });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`keyva-site serving ${ROOT} on http://${HOST}:${PORT}`);
});
