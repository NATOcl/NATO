import { education } from "../data/content";
import Reveal from "./Reveal";
import Section from "./Section";

export default function Education() {
  return (
    <Section id="educacion" index="02" title="Educación">
      <Reveal as="ol" className="timeline">
        {education.map((item) => (
          <li key={item.title} className="timeline__item">
            <p className="timeline__period">{item.period}</p>
            <h3 className="timeline__title">{item.title}</h3>
            <p className="timeline__place">{item.place}</p>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}
