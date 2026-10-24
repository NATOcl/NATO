/* Un panel anclado a su toggle. Un panel así se sale de la pantalla siempre que el
   toggle se envuelve cerca del borde, que en un móvil es casi siempre, así que
   se mide y se corrige en vez de adivinar con una media query.

   Dos ejes. En horizontal se corrige con un margen, que es todo lo que necesita
   un panel del mismo ancho. En vertical se *limita*, no se corrige: el toggle
   está en una barra pegajosa arriba, así que arriba nunca hay sitio y subir el
   panel solo taparía la cabecera. El límite sale del hueco real que queda bajo
   el toggle, que es también lo que se adapta a que la barra se envuelva. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export function clampDropdown(element) {
  if (!element) return;
  element.style.marginLeft = "";
  element.style.maxHeight = "";
  const rect = element.getBoundingClientRect();
  const margin = 8;

  element.style.maxHeight = `${Math.round(Math.max(160, window.innerHeight - rect.top - margin))}px`;

  let shift = 0;
  if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;
  if (rect.left + shift < margin) shift = margin - rect.left;
  if (shift) element.style.marginLeft = `${Math.round(shift)}px`;
}

export function useDropdown({ role }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const openedByKeyboard = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  /* Un menú mueve el foco dentro de sí; el panel de filtros no, porque es un
     diálogo en el que se trabaja con Tab. */
  const focusFirstOption = useCallback(() => {
    if (role !== "menu") return;
    const panel = panelRef.current;
    const checked = panel?.querySelector('[aria-checked="true"]');
    const first = panel?.querySelector('[role="menuitemradio"], [role="menuitem"]');
    // Aterrizar en la opción ya marcada y no en la primera: reabrir el menú no
    // cambia de sitio.
    (checked || first)?.focus();
  }, [role]);

  const toggle = useCallback((event) => {
    // detail === 0 significa Enter o Espacio: el teclado está conduciendo y el
    // foco tiene que entrar en el panel. El ratón ya está donde quiere estar.
    openedByKeyboard.current = event?.detail === 0;
    setOpen((current) => !current);
  }, []);

  // Al abrir hay que medir DESPUÉS de que el panel exista y sea visible: la
  // corrección depende de su rectángulo real.
  useLayoutEffect(() => {
    if (!open) return;
    clampDropdown(panelRef.current);
    if (openedByKeyboard.current) {
      openedByKeyboard.current = false;
      focusFirstOption();
    }
  }, [open, focusFirstOption]);

  // Un panel abierto tiene que seguir a la ventana: el toggle se mueve cuando la
  // barra se envuelve, y el límite calculado para el ancho anterior ya no vale.
  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => clampDropdown(panelRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  // Escape cierra y devuelve el foco al toggle, o cae en <body> y Tab rehace la
  // página desde arriba. Un clic fuera también cierra, como en cualquier menú.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };

    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  return { panelRef, triggerRef, open, toggle, close };
}