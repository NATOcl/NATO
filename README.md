# Nicolas Troncoso — CV + AlbumVault

Portafolio personal de Nicolas Troncoso Olivares, estudiante de Ingeniería en Informática en Duoc UC. Incluye el CV y **AlbumVault**, una aplicación independiente para organizar y valorar un catálogo musical personal.

## Demo

- **CV (GitHub Pages):** https://natocl.github.io/NATO/
- **App completa (Render):** https://nato-cv.onrender.com/
- **AlbumVault:** https://nato-cv.onrender.com/albumvault/
- **Repositorio:** https://github.com/NATOcl/NATO

## Stack

- **CV:** React 19, Vite 8, Bootstrap 5.3, CSS propio y Google Fonts.
- **AlbumVault:** React 18, Vite 8, Bootstrap Reboot e IndexedDB.
- **Servidor:** Node.js; sirve ambas apps y hace de proxy para MusicBrainz, iTunes y Spotify.
- **Tests:** Jasmine, Karma, esbuild e Istanbul.
- **Deploy:** CV estático en GitHub Pages con GitHub Actions; app completa en Render, definida en [`render.yaml`](./render.yaml).

## Estructura

```text
index.html                 entrada de Vite
src/App.jsx                orden de las secciones
src/components/            componentes del CV
src/config.js              URLs de AlbumVault y de la API (según el build)
src/hooks/useRemoteData.js carga desde la API REST con respaldo JSON
src/data/content.js        perfil, navegación, educación, skills y contacto
src/css/main.css           estilos propios y ajustes sobre Bootstrap
public/data/               projects.json
public/assets/projects/    portadas SVG de los proyectos
test/                      specs de Jasmine y utilidades
karma.conf.cjs             configuración de Karma + esbuild + cobertura
TESTING.md                 plan de pruebas
.github/workflows/         despliegue automático del CV en GitHub Pages
AlbumVault/                SPA musical independiente
server.js                  sirve CV, AlbumVault y la API REST
```

## Autor

Nicolas Troncoso Olivares — [GitHub](https://github.com/NATOcl) · [LinkedIn](https://www.linkedin.com/in/nicolas-troncoso-olivares-1257143b6/) · ni.troncoso@duocuc.cl
