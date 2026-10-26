import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const host = "127.0.0.1";
const port = Number(process.env.PORT || 8080);
const mime = {
  ".php": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    let pathname = decodeURIComponent(
      new URL(req.url, `http://${host}`).pathname,
    );
    if (pathname.split("/").some((part) => part.startsWith("."))) {
      res.writeHead(404).end();
      return;
    }
    if (pathname.endsWith("/"))
      pathname += pathname.startsWith("/old/") ? "index.html" : "index.php";
    const publicFile =
      /^\/(?:index\.php|styles\.css|fonts\.css|favicon\.svg|robots\.txt|sitemap\.xml)$/.test(
        pathname,
      );
    if (!publicFile && !/^\/(?:assets|fonts|old)\//.test(pathname)) {
      res.writeHead(404).end();
      return;
    }
    const filename = resolve(root, "." + pathname);
    if (
      !filename.startsWith(root.endsWith(sep) ? root : root + sep) ||
      !(await stat(filename)).isFile()
    ) {
      res.writeHead(404).end();
      return;
    }
    let data = await readFile(filename);
    // PHP is only used for the footer year; preview that without requiring PHP.
    if (extname(filename) === ".php") {
      data = Buffer.from(
        data
          .toString("utf8")
          .replace(
            /<\?php\s+echo date\('Y'\);\s*\?>/g,
            String(new Date().getFullYear()),
          ),
      );
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(filename)] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-JSON-Viewer-Dev": "1",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404).end();
  }
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, host, () =>
  console.log(`JSON Viewer: http://${host}:${port}`),
);
