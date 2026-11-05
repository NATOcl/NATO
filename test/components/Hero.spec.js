import Hero from "../../src/components/Hero";
import { render } from "../test-utils";

describe("Hero", () => {
  it("presenta el nombre, la biografía, el retrato y los llamados a la acción", () => {
    const { container } = render(<Hero />);

    expect(container.querySelector("h1").textContent).toBe("NATOcl");
    expect(container.querySelector(".hero__lead").textContent).toContain(
      "Ingeniería en Informática",
    );

    const portrait = container.querySelector(".hero__portrait-image");
    expect(portrait.getAttribute("alt")).toContain("Nicolás Troncoso");
    expect(portrait.getAttribute("width")).toBe("480");
    expect(portrait.getAttribute("height")).toBe("560");

    const ctas = container.querySelectorAll(".hero__cta");
    expect(ctas.length).toBe(2);
    expect(ctas[0].getAttribute("href")).toBe("#portafolio");
    expect(ctas[1].getAttribute("href")).toBe("#contacto");

    expect(container.querySelectorAll(".hero__social").length).toBe(3);
    expect(container.querySelectorAll(".hero__stat").length).toBe(3);
  });
});
