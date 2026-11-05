import { act } from "react";
import { createRoot } from "react-dom/client";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted = [];

export { act };

export function render(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });

  const instance = {
    container,
    root,
    unmount() {
      act(() => root.unmount());
      container.remove();
      const index = mounted.indexOf(instance);
      if (index >= 0) mounted.splice(index, 1);
    },
  };

  mounted.push(instance);
  return instance;
}

/** Espera a que se resuelvan las promesas de fetch y los efectos de React. */
export async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

/** Asigna un valor a un input controlado y notifica a React. */
export function setFieldValue(element, value) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

export function mockFetch(payload, { ok = true, status = 200 } = {}) {
  return spyOn(window, "fetch").and.callFake(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(payload),
    }),
  );
}

if (typeof afterEach === "function") {
  afterEach(() => {
    while (mounted.length > 0) {
      mounted.pop().unmount();
    }
    document.body.innerHTML = "";
    try {
      localStorage.clear();
    } catch {
      // localStorage puede no estar disponible en algunos entornos.
    }
  });
}
