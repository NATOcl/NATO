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

const news = {
  sections: [
    {
      id: "portafolio",
      title: "Novedades del portafolio",
      items: [
        {
          id: "pruebas",
          title: "Pruebas unitarias",
          date: "05 nov 2026",
          dateTime: "2026-11-05",
          content: "Se agregaron pruebas.",
        },
      ],
    },
    {
      id: "aprendizaje",
      title: "En aprendizaje",
      items: [
        {
          id: "curso",
          title: "Curso",
          date: "2026",
          dateTime: "2026",
          content: "Contenido del curso.",
        },
      ],
    },
  ],
};

describe("App", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "light";
    localStorage.clear();
  });

  it("integra todas las secciones y carga proyectos y noticias desde JSON", async () => {
    spyOn(window, "fetch").and.callFake((url) => {
      const payload = String(url).includes("news") ? news : projects;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
      });
    });

    const { container } = render(<App />);
    await flush();

    ["top", "sobre-mi", "educacion", "conocimientos", "portafolio", "noticias", "certificados", "cursos", "contacto"].forEach(
      (id) => {
        expect(container.querySelector(`#${id}`)).not.toBeNull();
      },
    );

    expect(container.querySelectorAll(".project-card").length).toBe(1);
    expect(container.querySelectorAll(".news-board").length).toBe(2);
    expect(container.querySelector("#contacto form")).not.toBeNull();
    expect(container.querySelector('.nav-link[href="#noticias"]')).not.toBeNull();
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
