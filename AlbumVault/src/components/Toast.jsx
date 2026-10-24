/* Un único toast. Se cambia la clase del tipo en vez de reescribir className: la
   versión anterior reasignaba la lista entera para quitar el tipo anterior, lo
   que dejaba el posicionamiento, la capa y el padding en dos sitios y hacía que
   cambiar uno no hiciera nada. */

import { useEffect } from "react";

const LIFETIME = 3200;

export default function Toast({ toast, onExpire }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onExpire, LIFETIME);
    return () => clearTimeout(timer);
  }, [toast, onExpire]);

  return (
    <div
      id="toast"
      className={`av-toast layer-toast x-fixed x-bottom-5 x-right-5 x-max-w-sm x-px-4 x-py-3 x-shadow-2xl ${toast?.type === "error" ? "toast-error" : "toast-success"}${toast ? " show" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="x-flex x-items-start x-gap-3">
        <span id="toastIcon" className="toast-icon x-mt-0-5 x-t-16" aria-hidden="true">
          {toast?.type === "error" ? "!" : "✓"}
        </span>
        <div>
          <div id="toastTitle" className="x-t-14 x-font-semibold">{toast?.title}</div>
          <div id="toastText" className="x-mt-0-5 x-t-12 text-soft">{toast?.text}</div>
        </div>
      </div>
    </div>
  );
}