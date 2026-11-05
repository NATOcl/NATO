import Section from "../../src/components/Section";
import { render } from "../test-utils";

describe("Section", () => {
  it("renderiza el índice, el título y el contenido recibido por props", () => {
    const { container } = render(
      <Section id="demo" index="01" title="Sección de prueba">
        <p>Contenido hijo</p>
      </Section>,
    );

    const section = container.querySelector("#demo");
    expect(section).not.toBeNull();
    expect(container.querySelector(".section-tag").textContent).toContain(
      "01 - Sección de prueba",
    );
    expect(section.querySelector(".section__body p").textContent).toBe(
      "Contenido hijo",
    );
  });

  it("aplica la variante ancha cuando wide es verdadero", () => {
    const { container } = render(
      <Section id="ancha" index="02" title="Ancha" wide>
        <p>Texto</p>
      </Section>,
    );

    expect(container.querySelector(".section__body--wide")).not.toBeNull();
  });

  it("omite el divisor cuando divider es falso", () => {
    const { container } = render(
      <Section id="sin-divisor" index="03" title="Sin divisor" divider={false}>
        <p>Texto</p>
      </Section>,
    );

    expect(container.querySelector(".rule")).toBeNull();
  });
});
