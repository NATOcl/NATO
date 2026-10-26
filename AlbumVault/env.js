/* Carga el `.env` local sin dependencias ni flags de Node.

   `server.js` lee SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET al evaluarse, así que
   este módulo va como PRIMER import: los imports se evalúan antes del cuerpo y
   en el orden en que se escriben. En Render no hay `.env`; allí las variables
   llegan por el dashboard y este archivo no cambia nada. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Vale el `.env` de AlbumVault o el de la raíz del repo; el más cercano gana.
const candidates = [path.join(here, ".env"), path.join(here, "..", ".env")];

for (const file of candidates) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue; // Sin archivo: el entorno real manda.
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    }

    // Lo que ya está en el entorno no se pisa: en producción las variables
    // vienen del panel y un `.env` olvidado en la máquina no debe ganarles.
    if (!(key in process.env)) process.env[key] = value;
  }
}
