# Plan de pruebas — Portafolio DSY1104

Este documento describe el entorno, los casos de prueba y los resultados esperados de la suite de Jasmine + Karma del portafolio.

## Entorno

| Elemento | Configuración |
| --- | --- |
| Runner | Karma 6.4.4 |
| Framework | Jasmine 5.13 |
| Bundler | esbuild 0.28 vía `karma-esbuild` |
| Navegador | Chrome o Edge en modo headless (`ChromeHeadlessNoSandbox`) |
| Cobertura | `karma-coverage` + `istanbul-lib-instrument` |
| Informe | `coverage/html/index.html`, `coverage/lcov.info` y resumen en consola |

Archivos relevantes:

- `karma.conf.cjs`: configuración del runner y detección del navegador.
- `test/istanbul-plugin.cjs`: instrumentación de `src/**` antes del bundle.
- `test/test-utils.jsx`: render con React 19, limpieza, espera de promesas y mocks.
- `test/**/*.spec.js`: casos de prueba.

Los specs se llaman `.spec.js` porque `karma-esbuild` normaliza las entradas a `.js`; dentro se usa JSX y el loader `.js → jsx` de esbuild lo transforma.

## Casos de prueba

### 1. Renderizado de componentes

| ID | Componente | Caso | Resultado esperado |
| --- | --- | --- | --- |
| R1 | `Section` | Renderiza índice, título y children | El `id`, el texto `01 - …` y el contenido aparecen en el DOM |
| R2 | `Section` | Variante `wide` y `divider={false}` | Se aplica `section__body--wide` y no se renderiza `.rule` |
| R3 | `ProjectCard` | Proyecto con demo y repositorio externos | Imagen con `alt`, título, descripción, badges y dos enlaces con `target="_blank"` |
| R4 | `ProjectCard` | Demo interna (`/albumvault/`) | El enlace no abre pestaña nueva y no se renderiza repo ausente |
| R5 | `Hero` | Presentación inicial | Nombre, biografía, retrato con `alt`, dos CTA, tres redes y tres estadísticas |
| R6 | `App` | Integración completa | Existen las nueve secciones y sus ids; se ven tarjetas y tableros de noticias |

### 2. Estado, props y eventos

| ID | Componente | Caso | Resultado esperado |
| --- | --- | --- | --- |
| S1 | `Header` | Abrir menú móvil y pulsar un enlace | `aria-expanded` pasa a `true`, el panel se muestra y vuelve a cerrarse |
| S2 | `Header` | Alternar tema dos veces | `data-theme` cambia a `dark`/`light`, el `aria-label` se actualiza y `localStorage` persiste |
| S3 | `ContactForm` | Enviar formulario vacío | Tres errores visibles, `aria-invalid="true"` y foco en el campo nombre |
| S4 | `ContactForm` | Completar campos y enviar | Se genera un enlace `mailto:` con asunto, mensaje y correo codificados |
| S5 | `ContactForm` | Editar el mensaje después de preparar el correo | El bloque de éxito se oculta para evitar un enlace obsoleto |
| S6 | `ContactForm` | Validación pura | `validateContact` devuelve errores para nombre, correo y mensaje; `{}` para datos válidos |
| S7 | `Courses` | Abrir curso y pulsar Escape | Se abre el diálogo, se enfoca el cierre, Escape lo cierra y devuelve el foco al botón |
| S8 | `Portfolio` | Fallo de la API y del JSON, clic en Reintentar | Aparece `role="alert"`, el reintento vuelve a pedir la API, carga las tarjetas y desaparece el error |
| S9 | `Budy` | Cerrar la mascota | El nodo `.budy` se elimina del DOM |
| S10 | `useRemoteData` | La API responde con datos | Una sola llamada a `/api/projects`, `source: "api"` y los datos disponibles |
| S11 | `useRemoteData` | La API falla y el respaldo responde | Segunda llamada a `data/projects.json`, `source: "json"` y los datos disponibles |
| S12 | `useRemoteData` | La API responde con error HTTP | Se ignora la respuesta 503 y se usa el JSON local |
| S13 | `useRemoteData` | Fallan la API y el respaldo | Estado de error con `data: null` |
| S14 | `useRemoteData` | Reintento tras el error | La tercera llamada recupera los datos desde la API |

### 3. Carga de datos y DOM

| ID | Componente | Caso | Resultado esperado |
| --- | --- | --- | --- |
| D1 | `Portfolio` | La API responde con `{ projects }` | Primero aparece «cargando proyectos…»; luego dos `.project-card`, el aviso «datos desde la API REST» y desaparece el estado |
| D2 | `Portfolio` | JSON vacío | Se muestra «Todavía no hay proyectos para mostrar» |
| D3 | `News` | JSON con dos secciones | Se renderizan dos `.news-board`, dos `.news-card` y `<time datetime="…">` |
| D4 | `News` | Error de red | Se muestra el mensaje de error y el botón Reintentar |
| D5 | `News` | JSON sin secciones | Se muestra el estado vacío |
| D6 | `Portfolio` | La API falla y se usa el respaldo | Se ven las tarjetas y el aviso «respaldo JSON local» |

### 4. Mocks y aislamiento

- `spyOn(window, "fetch")` simula respuestas de la API, respuestas de error HTTP, caídas de red y el respaldo JSON.
- `useRemoteData` se prueba con un componente sonda que expone `loading`, `source`, `error` y la acción `reload`.
- esbuild reemplaza el PDF por un módulo vacío y convierte imágenes en `dataurl` para no depender de archivos externos.
- `localStorage` se limpia y `data-theme` se restablece antes de cada prueba de cabecera.
- React 19 se monta con `createRoot` y `act`; cada spec desmonta su árbol en `afterEach`.

## Criterios de aceptación

- Todas las pruebas deben terminar en estado `SUCCESS`.
- La suite debe cubrir renderizado, props, estado, eventos, foco y manipulación del DOM.
- El informe de cobertura debe generarse sin errores y cubrir las funcionalidades críticas del portafolio.
- La consola del navegador no debe mostrar errores de red ni advertencias de React durante la suite.

## Resultados de la última ejecución

```text
Executed 29 of 29 SUCCESS

Statements   : 88.95 % ( 298/335 )
Branches     : 70.43 % ( 162/230 )
Functions    : 93.33 % ( 84/90 )
Lines        : 90.87 % ( 269/296 )
```

## Reproducir

```bash
npm install
npm install --prefix AlbumVault
npm test
```

Abrir `coverage/html/index.html` para revisar el detalle por archivo y por línea. Si Karma no encuentra el navegador, definir `CHROME_BIN` con la ruta de Chrome o Edge (ver README).
