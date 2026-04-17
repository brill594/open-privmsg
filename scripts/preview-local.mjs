import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4174);
const distRoot = join(process.cwd(), "dist");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

createServer(async (request, response) => {
  try {
    const targetPath = resolveRequestPath(request.url || "/");
    const absolutePath = normalize(join(distRoot, targetPath));

    if (!absolutePath.startsWith(distRoot)) {
      sendStatus(response, 403, "Forbidden");
      return;
    }

    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      sendStatus(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(absolutePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(absolutePath).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendStatus(response, 404, "Not found");
      return;
    }
    console.error(error);
    sendStatus(response, 500, "Internal server error");
  }
}).listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}`);
});

function resolveRequestPath(rawUrl) {
  const pathname = new URL(rawUrl, "http://localhost").pathname;

  if (pathname === "/" || pathname.startsWith("/m/")) {
    return "index.html";
  }

  if (pathname === "/policy" || pathname === "/policy/") {
    return "policy/index.html";
  }

  if (pathname.endsWith("/")) {
    return join(pathname.slice(1), "index.html");
  }

  return pathname.slice(1);
}

function sendStatus(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(message);
}
