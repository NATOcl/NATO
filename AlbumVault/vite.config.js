import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* El proxy de /api se queda en server.js (node server.js, puerto 3000): es el
   unico camino hacia MusicBrainz, iTunes y el proxy de imagenes, con su cola de
   peticiones y su allow-list de hosts. En desarrollo Vite corre en 5173 y le
   reenvia /api al 3000, de modo que las dos_urls dicen exactamente lo mismo.
   En produccion `npm run build` deja dist/ y server.js lo sirve en :3000. */
const API_TARGET = process.env.API_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Los nombres con hash son lo que permite seguir sirviendo por allow-list
    // sin tener que permitir "cualquier .js del proyecto".
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: false }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: false }
    }
  }
});