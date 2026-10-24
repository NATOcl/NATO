
# Nicolas Troncoso — CV + AlbumVault

Portafolio personal de Nicolas Troncoso Olivares, estudiante de Ingeniería en Informática. Incluye el CV y **AlbumVault**, una aplicación independiente para organizar y valorar un catálogo musical personal.

## Demo

- **CV:** https://nato-cv.onrender.com/
- **AlbumVault:** https://nato-cv.onrender.com/albumvault/
- **Repositorio:** https://github.com/NATOcl/NATO

## Stack

- **CV:** React 19, Vite 8, CSS puro y Google Fonts.
- **AlbumVault:** React 18, Vite 5, Bootstrap Reboot e IndexedDB.
- **Servidor:** Node.js; sirve ambas apps y hace de proxy para MusicBrainz, iTunes y las portadas.
- **Deploy:** Render, definido en [`render.yaml`](./render.yaml).

## Estructura

```text
src/                  CV: componentes, datos, estilos y assets
AlbumVault/           SPA musical independiente
server.js             servidor de producción para CV, AlbumVault y API
scripts/dev.mjs       arranque conjunto en desarrollo
render.yaml           configuración del servicio en Render
legacy/               referencia visual histórica, fuera del build
```

## Desarrollo local

Requiere Node.js 20.19 o superior.

```bash
npm install
npm --prefix AlbumVault install
npm run dev
```

Servicios:

- CV: http://localhost:5173
- AlbumVault: http://localhost:5174/albumvault/
- API: http://localhost:3000

## Build y producción

```bash
npm run build
npm start
```

`npm run build` compila el CV en `dist/` y AlbumVault en `AlbumVault/dist/` con base `/albumvault/`. `npm start` sirve todo desde `server.js` en el puerto definido por `PORT`.

## Deploy

El despliegue usa un **Render Blueprint**:

1. Crear un **New Blueprint** en Render.
2. Conectar el repositorio `NATOcl/NATO`.
3. Render detecta `render.yaml` y ejecuta el build y el start automáticamente.

La app completa necesita un servidor Node. GitHub Pages solo podría servir el CV estático; no ejecutaría AlbumVault ni `/api`.
