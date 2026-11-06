import App from "../src/App";
import { act, flush, render } from "./test-utils";

const projects = [
  {
    id: "albumvault",
    title: "AlbumVault",
    description: "Catálogo musical.",
    technologies: ["React", "IndexedDB"],
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
    imageAlt: "Portada de AlbumVault",
    demo: "/albumvault/",
    repo: "https://github.com/NATOcl/NATO",
  },
];

describe("App", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "light";
    localStorage.clear();
  });

  it("integra todas las secciones y carga proyectos desde la API", async () => {
    spyOn(window, "fetch").and.returnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(projects),
      }),
    );

    const { container } = render(<App />);
    await flush();

    ["top", "sobre-mi", "educacion", "conocimientos", "portafolio", "certificados", "cursos", "contacto"].forEach(
      (id) => {
        expect(container.querySelector(`#${id}`)).not.toBeNull();
      },
    );

    expect(container.querySelectorAll(".project-card").length).toBe(1);
    expect(container.querySelector("#noticias")).toBeNull();
    expect(container.querySelector("#contacto form")).not.toBeNull();
    expect(container.querySelector('.nav-link[href="#certificados"]')).not.toBeNull();
  });

  it("permite cerrar a Budy y quita su nodo del DOM", async () => {
    spyOn(window, "fetch").and.returnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }),
    );

    const { container } = render(<App />);
    await flush();

    const close = container.querySelector(".budy__close");
    expect(close).not.toBeNull();

    act(() => close.click());

    expect(container.querySelector(".budy")).toBeNull();
  });
});
