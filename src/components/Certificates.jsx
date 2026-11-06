import { certificate } from "../data/content";
import Reveal from "./Reveal";
import Section from "./Section";

export default function Certificates() {
  return (
    <Section id="certificados" index="05" title="Certificados">
      <Reveal
        as="a"
        href={certificate.href}
        className="certificate-row"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="certificate-row__body">
          <span className="certificate-row__name">{certificate.name}</span>
          <span className="certificate-row__issuer">{certificate.issuer}</span>
        </span>
        <span className="certificate-row__cta">
          ver credencial <span aria-hidden="true">→</span>
        </span>
      </Reveal>
    </Section>
  );
}
