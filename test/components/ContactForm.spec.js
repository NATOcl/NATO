import ContactForm, {
  validateContact,
} from "../../src/components/ContactForm";
import { act, render, setFieldValue } from "../test-utils";

const RECIPIENT = "destino@example.com";

const submit = (form) => {
  form.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
};

describe("ContactForm", () => {
  it("valida los campos obligatorios y enfoca el primero con error", () => {
    const { container } = render(<ContactForm recipient={RECIPIENT} />);

    const form = container.querySelector("form");
    const name = container.querySelector("#contacto-name");

    act(() => submit(form));

    const errors = container.querySelectorAll(".contact-form__error");
    expect(errors.length).toBe(3);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(name);
    expect(container.querySelector(".contact-form__success")).toBeNull();
  });

  it("actualiza el estado, valida y prepara un enlace mailto", () => {
    const { container } = render(<ContactForm recipient={RECIPIENT} />);

    const form = container.querySelector("form");
    const name = container.querySelector("#contacto-name");
    const email = container.querySelector("#contacto-email");
    const message = container.querySelector("#contacto-message");

    act(() => {
      setFieldValue(name, "Ana Pérez");
      setFieldValue(email, "ana@example.com");
      setFieldValue(message, "Me interesa conversar sobre una práctica.");
    });

    expect(name.value).toBe("Ana Pérez");
    expect(container.querySelectorAll(".contact-form__error").length).toBe(0);

    act(() => submit(form));

    const success = container.querySelector(".contact-form__success");
    expect(success).not.toBeNull();
    expect(success.textContent).toContain("Tu mensaje está listo");

    const link = success.querySelector("a");
    expect(link.getAttribute("href")).toContain(`mailto:${RECIPIENT}`);
    expect(decodeURIComponent(link.getAttribute("href"))).toContain(
      "Me interesa conversar sobre una práctica.",
    );
    expect(decodeURIComponent(link.getAttribute("href"))).toContain(
      "ana@example.com",
    );
  });

  it("vuelve a ocultar el enlace listo si se edita el mensaje", () => {
    const { container } = render(<ContactForm recipient={RECIPIENT} />);

    const form = container.querySelector("form");
    const message = container.querySelector("#contacto-message");

    act(() => {
      setFieldValue(container.querySelector("#contacto-name"), "Ana");
      setFieldValue(container.querySelector("#contacto-email"), "ana@example.com");
      setFieldValue(message, "Mensaje suficientemente largo.");
    });
    act(() => submit(form));

    expect(container.querySelector(".contact-form__success")).not.toBeNull();

    act(() => setFieldValue(message, "Otro mensaje suficientemente largo."));

    expect(container.querySelector(".contact-form__success")).toBeNull();
  });

  it("valida el correo y la longitud del mensaje desde la función pura", () => {
    const errors = validateContact({
      name: "A",
      email: "correo-invalido",
      message: "corto",
    });

    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.message).toBeDefined();
    expect(
      validateContact({
        name: "Ana",
        email: "ana@example.com",
        message: "Mensaje válido y suficientemente largo.",
      }),
    ).toEqual({});
  });
});
