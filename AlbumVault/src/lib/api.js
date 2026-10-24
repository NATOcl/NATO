/* El puente con el servidor. Todo pasa por rutas /api absolutas, así que la app
   solo funciona servida por server.js (o por Vite, que le reenvía /api). */

export async function appApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers || {}) }
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload;
}

export async function fetchCoverBlob(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Portada no disponible (${response.status})`);
  return response.blob();
}

export function artistCreditName(credit) {
  if (!Array.isArray(credit)) return "";
  return credit.map((item) => `${item?.artist?.name || ""}${item?.joinphrase || ""}`).join("").trim();
}

/* "Artista — Título": el servidor acepta guion, en dash y em dash, y el cliente
   solo el guion ASCII. Se mantiene la asimetría a knowingly, pero esta función
   sí acepta los tres porque decide qué parte es el artista al ordenar. */
export function parsePairQuery(query) {
  const parts = String(query || "").split(/\s+[—–-]\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? { artist: parts[0], title: parts.slice(1).join(" — ") } : null;
}