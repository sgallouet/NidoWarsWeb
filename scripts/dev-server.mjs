import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "4173", 10);
const root = resolve(process.cwd());

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const path = safeResolve(url.pathname);

  if (!path) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const filePath = resolveFile(path);

  if (!filePath) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Nido Wars dev server running at http://${host}:${port}`);
});

function safeResolve(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalizedPath = normalize(decoded).replace(/^([/\\])+/, "");
  const resolved = resolve(join(root, normalizedPath));

  return resolved === root || resolved.startsWith(`${root}${sep}`) ? resolved : null;
}

function resolveFile(path) {
  if (!existsSync(path)) {
    return null;
  }

  const stats = statSync(path);

  if (stats.isDirectory()) {
    const indexPath = join(path, "index.html");

    return existsSync(indexPath) ? indexPath : null;
  }

  return stats.isFile() ? path : null;
}
