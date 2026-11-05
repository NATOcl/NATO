import News from "../../src/components/News";
import { flush, mockFetch, render } from "../test-utils";

const news = {
  sections: [
    {
      id: "portafolio",
      title: "Novedades del portafolio",
      description: "Cambios recientes.",
      items: [
        {
          id: "uno",
          title: "Noticia del portafolio",
          date: "05 nov 2026",
          dateTime: "2026-11-05",
          content: "Contenido de la primera noticia.",
        },
      ],
    },
    {
      id: "aprendizaje",
      title: "En aprendizaje",
      description: "Temas en curso.",
      items: [
        {
          id: "dos",
          title: "Noticia de aprendizaje",
          date: "2026",
          dateTime: "2026",
          content: "Contenido de la segunda noticia.",
        },
      ],
    },
  ],
};

describe("News", () => {
  it("renderiza dos secciones de noticias cargadas desde JSON", async () => {
    mockFetch(news);
    const { container } = render(<News />);

    expect(container.querySelector('[role="status"]').textContent).toContain(
      "cargando noticias",
    );

    await flush();

    const sections = container.querySelectorAll(".news-board");
    expect(sections.length).toBe(2);
    expect(sections[0].querySelector(".news-board__title").textContent).toBe(
      "Novedades del portafolio",
    );
    expect(sections[1].querySelector(".news-board__title").textContent).toBe(
      "En aprendizaje",
    );

    expect(container.querySelectorAll(".news-card").length).toBe(2);
    expect(container.querySelector("time").getAttribute("datetime")).toBe(
      "2026-11-05",
    );
    expect(container.textContent).toContain("Contenido de la primera noticia.");
  });

  it("muestra el error de carga con opción de reintentar", async () => {
    spyOn(window, "fetch").and.returnValue(Promise.reject(new Error("sin red")));
    const { container } = render(<News />);
    await flush();

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector("button").textContent).toContain("Reintentar");
  });

  it("informa cuando no hay secciones en el JSON", async () => {
    mockFetch({ sections: [] });
    const { container } = render(<News />);
    await flush();

    expect(container.textContent).toContain("Todavía no hay noticias");
  });
});
