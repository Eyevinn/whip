const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");
const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const PORT = process.env.PORT || 8080;

http
  .createServer((req, res) => {
    let url = req.url.split("?")[0];
    let filePath = path.join(DIST, url === "/" ? "index.html" : url);
    const ext = path.extname(filePath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, "index.html");
    }

    const mime = MIME[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(PORT, () => console.log(`Demo server listening on port ${PORT}`));
