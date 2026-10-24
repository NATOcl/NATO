import { about } from "../data/content";
import Reveal from "./Reveal";
import Section from "./Section";

export default function About() {
  return (
    <Section id="sobre-mi" index="01" title="Sobre mí">
      <Reveal className="prose prose--pending">
        <p className="prose__lead">{about.lead}</p>
        {about.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Reveal>
    </Section>
  );
}
