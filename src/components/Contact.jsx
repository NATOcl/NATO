import { contact, profile, socials } from "../data/content";
import ContactForm from "./ContactForm";

export default function Contact() {
  return (
    <footer id="contacto" className="contact">
      <div className="container contact__inner">
        <p className="contact__tag">08 — contacto</p>
        <h2 className="contact__title">¿Hablamos de una oportunidad?</h2>

        <div className="row g-4 contact__grid">
          <div className="col-12 col-lg-5">
            <dl className="contact__details">
              <div>
                <dt className="contact__term">correo</dt>
                <dd>
                  <a href={contact.emailHref} className="contact__link">
                    {contact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="contact__term">disponibilidad</dt>
                <dd>{contact.availability}</dd>
              </div>
              <div>
                <dt className="contact__term">ubicación</dt>
                <dd>{contact.location}</dd>
              </div>
              <div>
                <dt className="contact__term">redes</dt>
                <dd className="contact__socials">
                  {socials.map((social) => (
                    <a
                      key={social.href}
                      href={social.href}
                      className="contact__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {social.label}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="col-12 col-lg-7">
            <ContactForm recipient={contact.email} />
          </div>
        </div>

        <p className="contact__copyright">© 2026 {profile.name}</p>
      </div>
    </footer>
  );
}
