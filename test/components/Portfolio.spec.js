import Portfolio from "../../src/components/Portfolio";
import { act, flush, mockFetch, render } from "../test-utils";

const projects = [
  {
    id: "uno",
    title: "Proyecto uno",
    description: "Descripción uno",
    technologies: ["React"],
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
    imageAlt: "Portada uno",
    demo: "https://example.com/uno",
  },
  {
    id: "dos",
    title: "Proyecto dos",
    description: "Descripción dos",
    technologies: ["Python"],
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
    imageAlt: "Portada dos",
    repo: "https://github.com/example/dos",
  },
];

describe("Portfolio", () => {
  it("carga los proyectos desde JSON y los renderiza en tarjetas", async () => {
    const fetchSpy = mockFetch(projects);
    const { container } = render(<Portfolio />);

    expect(container.querySelector('[role="status"]').textContent).toContain(
      "cargando proyectos",
    );

    await flush();

    expect(fetchSpy).toHaveBeenCalled();
    expect(container.querySelectorAll(".project-card").length).toBe(2);
    expect(container.textContent).toContain("Proyecto uno");
    expect(container.textContent).toContain("Proyecto dos");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("muestra un error y permite reintentar la carga", async () => {
    let calls = 0;

    spyOn(window, "fetch").and.callFake(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error("falló"));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(projects),
      });
    });

    const { container } = render(<Portfolio />);
    await flush();

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain("No se pudieron cargar proyectos");

    const retry = alert.querySelector("button");
    expect(retry.textContent).toContain("Reintentar");

    act(() => retry.click());
    await flush();

    expect(calls).toBe(2);
    expect(container.querySelectorAll(".project-card").length).toBe(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("muestra un mensaje cuando el JSON está vacío", async () => {
    mockFetch([]);
    const { container } = render(<Portfolio />);
    await flush();

    expect(container.textContent).toContain("Todavía no hay proyectos");
  });
});
