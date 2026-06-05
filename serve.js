const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const mime = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ico: 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(root, decodeURIComponent(urlPath.replace(/\//g, '/')));
  if (req.url === '/' || req.url === '') {
    filePath = path.join(root, 'index.html');
  }
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fs.stat(filePath, (e) => {
        if (e) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Not found');
        }
        streamFile();
      });
    } else {
      streamFile();
    }

    function streamFile() {
      const ext = path.extname(filePath).slice(1);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(8000, () => {
  console.log('Server running at http://localhost:8000');
});
