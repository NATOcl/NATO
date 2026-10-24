/* Bootstrap entra por aquí y ANTES que app.css: es la capa base (Reboot) y el
   diseño de la app está escrito contra las variables de :root. Sin el JS de
   Bootstrap, y a propósito: el modal, los desplegables, la gestión de foco y los
   selectores de estrellas son hechos a mano y los de Bootstrap pelearían con
   ellos. */
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";

import { createRoot } from "react-dom/client";
import App from "./App.jsx";

/* Sin StrictMode a propósito: en desarrollo monta dos veces cada efecto, y aquí
   eso significa dos lecturas de IndexedDB y dos escrituras del hash en cada
   tecla. El comportamiento que se quiere probar es el de producción. */
createRoot(document.getElementById("root")).render(<App />);