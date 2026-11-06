import Header from "../../src/components/Header";
import { act, render } from "../test-utils";

describe("Header", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "light";
    localStorage.clear();
  });

  it("renderiza la marca y todos los enlaces de navegación", () => {
    const { container } = render(<Header />);

    expect(container.querySelector(".brand__name").textContent).toBe(
      "Nicolas Troncoso",
    );

    const navLinks = container.querySelectorAll(".nav .nav-link");
    expect(navLinks.length).toBe(7);
    const labels = Array.from(navLinks).map((link) => link.textContent);
    expect(labels).toContain("Certificados");
    expect(labels).not.toContain("Noticias");
  });

  it("abre y cierra el menú móvil actualizando aria-expanded", () => {
    const { container } = render(<Header />);

    const toggle = container.querySelector(".menu-toggle");
    const panel = container.querySelector("#menu-movil");

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);

    act(() => toggle.click());

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hidden).toBe(false);

    const firstLink = panel.querySelector(".menu-panel__link");
    act(() => firstLink.click());

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
  });

  it("alterna el tema, actualiza el DOM y persiste en localStorage", () => {
    const { container } = render(<Header />);

    const toggle = container.querySelector(".theme-toggle");

    act(() => toggle.click());

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(toggle.getAttribute("aria-label")).toContain("modo claro");

    act(() => toggle.click());

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
