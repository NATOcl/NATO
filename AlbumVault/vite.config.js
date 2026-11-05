import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* El proxy de /api se queda en server.js (node server.js, puerto 3000): es el
   único camino hacia MusicBrainz, iTunes y el proxy de imágenes, con su cola
   de peticiones y su lista de hosts permitidos. En desarrollo Vite corre en
   5173 y reenvía /api al 3000, así que las dos URLs dicen exactamente lo
   mismo. En producción `npm run build` deja dist/ y server.js lo sirve en
   :3000. */
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