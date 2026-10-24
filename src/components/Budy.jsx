import { useState } from "react";
import budy from "../assets/budy.gif";

export default function Budy() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="budy">
      <button
        type="button"
        className="budy__close"
        aria-label="Cerrar a Budy"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
      <a
        className="budy__link"
        href="/albumvault/"
        aria-label="Abrir AlbumVault"
      >
        <img
          className="budy__image"
          src={budy}
          alt="Budy, mascota del portafolio"
          width="360"
          height="450"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </a>
    </div>
  );
}
