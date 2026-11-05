import { useRef, useState } from "react";

const INITIAL_VALUES = { name: "", email: "", message: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values) {
  const errors = {};

  if (values.name.trim().length < 2) {
    errors.name = "Escribe tu nombre (mínimo 2 caracteres).";
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Escribe un correo válido, por ejemplo nombre@dominio.cl.";
  }

  if (values.message.trim().length < 10) {
    errors.message = "Cuéntame un poco más (mínimo 10 caracteres).";
  }

  return errors;
}

export default function ContactForm({ recipient }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [mailtoHref, setMailtoHref] = useState("");
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const messageRef = useRef(null);
  const fieldRefs = { name: nameRef, email: emailRef, message: messageRef };

  const updateField = (event) => {
    const { name, value } = event.target;

    setValues((current) => ({ ...current, [name]: value }));
    setMailtoHref("");

    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validateContact(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMailtoHref("");
      const firstInvalid = ["name", "email", "message"].find(
        (field) => nextErrors[field],
      );
      fieldRefs[firstInvalid]?.current?.focus();
      return;
    }

    const subject = `Contacto desde el portafolio — ${values.name.trim()}`;
    const body = [
      values.message.trim(),
      "",
      `— ${values.name.trim()}`,
      values.email.trim(),
    ].join("\n");

    setMailtoHref(
      `mailto:${recipient}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`,
    );
  };

  const fieldProps = (name) => ({
    id: `contacto-${name}`,
    name,
    value: values[name],
    onChange: updateField,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `contacto-${name}-error` : undefined,
    ref: fieldRefs[name],
  });

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <h3 className="contact-form__title">Escríbeme</h3>
      <p className="contact-form__lead">
        Completa el formulario y prepararé un correo con tu mensaje. No se envía
        nada hasta que lo abras en tu cliente de correo.
      </p>

      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label className="form-label contact-form__label" htmlFor="contacto-name">
            Nombre
          </label>
          <input
            className={`form-control contact-form__control${
              errors.name ? " is-invalid" : ""
            }`}
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            {...fieldProps("name")}
          />
          {errors.name && (
            <p className="contact-form__error" id="contacto-name-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="col-12 col-sm-6">
          <label className="form-label contact-form__label" htmlFor="contacto-email">
            Correo
          </label>
          <input
            className={`form-control contact-form__control${
              errors.email ? " is-invalid" : ""
            }`}
            type="email"
            autoComplete="email"
            placeholder="nombre@dominio.cl"
            {...fieldProps("email")}
          />
          {errors.email && (
            <p className="contact-form__error" id="contacto-email-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="col-12">
          <label
            className="form-label contact-form__label"
            htmlFor="contacto-message"
          >
            Mensaje
          </label>
          <textarea
            className={`form-control contact-form__control contact-form__textarea${
              errors.message ? " is-invalid" : ""
            }`}
            rows="4"
            placeholder="Cuéntame qué tienes en mente"
            {...fieldProps("message")}
          />
          {errors.message && (
            <p
              className="contact-form__error"
              id="contacto-message-error"
              role="alert"
            >
              {errors.message}
            </p>
          )}
        </div>
      </div>

      <button className="btn btn-signal contact-form__submit" type="submit">
        Preparar correo
      </button>

      <div className="contact-form__status" aria-live="polite">
        {mailtoHref && (
          <div className="contact-form__success">
            <p>Tu mensaje está listo. Ábrelo en tu cliente de correo para enviarlo.</p>
            <a className="btn btn-sm btn-outline-signal" href={mailtoHref}>
              Abrir correo
            </a>
          </div>
        )}
      </div>
    </form>
  );
}
