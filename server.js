import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  handleApi,
  SECURITY_HEADERS as ALBUMVAULT_HEADERS,
  sendJson,
} from "./AlbumVault/server.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const CV_DIST = path.join(ROOT, "dist");
const ALBUMVAULT_DIST = path.join(ROOT, "AlbumVault", "dist");
const ALBUMVAULT_PREFIX = "/albumvault";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

const ASSET_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".ico",
  ".gif",
  ".woff2",
  ".map",
  ".pdf",
]);

const CV_ROOT_FILES = new Set([
  "/icons/favicon.svg",
]);

const BASE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const CV_ASSET_HEADERS = {
  ...BASE_HEADERS,
  "X-Frame-Options": "SAMEORIGIN",
};

const CV_DOCUMENT_HEADERS = {
  ...CV_ASSET_HEADERS,
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function safeRelativePath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  return decoded.replace(/^\/+/, "");
}

function resolveAsset(base, requestPath) {
  const relative = safeRelativePath(requestPath);
  if (relative === null) return null;

  const full = path.normalize(path.join(base, relative));
  if (!full.startsWith(base + path.sep)) return null;
  if (!ASSET_EXTENSIONS.has(path.extname(full).toLowerCase())) return null;
  return full;
}

function sendFile(req, res, file, { headers, cacheControl }) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;

  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": cacheControl,
    ...headers,
  });

  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  const stream = fs.createReadStream(file);
  stream.on("error", () => {
    if (!res.headersSent) res.writeHead(500);
    res.destroy();
  });
  stream.pipe(res);
  return true;
}

function sendText(res, status, text, headers = BASE_HEADERS) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(text);
}

function serveCvIndex(req, res) {
  const file = path.join(CV_DIST, "index.html");
  if (!sendFile(req, res, file, {
    headers: CV_DOCUMENT_HEADERS,
    cacheControl: "no-cache",
  })) {
    sendText(
      res,
      503,
      "dist/ no existe. Ejecuta `npm run build` antes de `npm start`.",
      CV_DOCUMENT_HEADERS,
    );
  }
}

function serveAlbumVaultIndex(req, res) {
  const file = path.join(ALBUMVAULT_DIST, "index.html");
  if (!sendFile(req, res, file, {
    headers: ALBUMVAULT_HEADERS,
    cacheControl: "no-cache",
  })) {
    sendText(
      res,
      503,
      "AlbumVault/dist/ no existe. Ejecuta `npm run build` antes de `npm start`.",
      ALBUMVAULT_HEADERS,
    );
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) sendJson(res, 404, { error: "API route not found." });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }

    if (url.pathname === ALBUMVAULT_PREFIX) {
      res.writeHead(308, { Location: `${ALBUMVAULT_PREFIX}/` });
      res.end();
      return;
    }

    if (
      url.pathname === `${ALBUMVAULT_PREFIX}/` ||
      url.pathname === `${ALBUMVAULT_PREFIX}/index.html`
    ) {
      serveAlbumVaultIndex(req, res);
      return;
    }

    if (url.pathname.startsWith(`${ALBUMVAULT_PREFIX}/`)) {
      const assetPath = url.pathname.slice(ALBUMVAULT_PREFIX.length);
      if (!assetPath.startsWith("/assets/")) {
        sendText(res, 404, "Not found", ALBUMVAULT_HEADERS);
        return;
      }

      const file = resolveAsset(ALBUMVAULT_DIST, assetPath);
      if (sendFile(req, res, file, {
        headers: ALBUMVAULT_HEADERS,
        cacheControl: "public, max-age=31536000, immutable",
      })) {
        return;
      }

      sendText(res, 404, "Not found", ALBUMVAULT_HEADERS);
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      serveCvIndex(req, res);
      return;
    }

    if (url.pathname.startsWith("/assets/")) {
      const file = resolveAsset(CV_DIST, url.pathname);
      if (sendFile(req, res, file, {
        headers: CV_ASSET_HEADERS,
        cacheControl: "public, max-age=31536000, immutable",
      })) {
        return;
      }
    }

    if (CV_ROOT_FILES.has(url.pathname)) {
      const file = path.join(CV_DIST, url.pathname);
      if (sendFile(req, res, file, {
        headers: CV_ASSET_HEADERS,
        cacheControl: "public, max-age=86400",
      })) {
        return;
      }
    }

    sendText(res, 404, "Not found");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`CV + AlbumVault en http://localhost:${PORT}`);
  console.log(`AlbumVault en http://localhost:${PORT}${ALBUMVAULT_PREFIX}/`);

  if (!fs.existsSync(path.join(CV_DIST, "index.html"))) {
    console.log("Falta el build del CV: ejecuta `npm run build`.");
  }
  if (!fs.existsSync(path.join(ALBUMVAULT_DIST, "index.html"))) {
    console.log("Falta el build de AlbumVault: ejecuta `npm run build`.");
  }
});
