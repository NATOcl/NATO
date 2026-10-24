import { skills, skillsIntro } from "../data/content";
import Reveal from "./Reveal";
import Section from "./Section";

export default function Skills() {
  return (
    <Section id="conocimientos" index="03" title="Conocimientos">
      <Reveal className="prose prose--pending">
        <p>{skillsIntro}</p>
      </Reveal>

      <Reveal as="ul" className="skill-list" delay={80}>
        {skills.map((skill) => (
          <li
            key={skill.name}
            className="skill-chip"
            title={skill.description}
          >
            <span className="skill-chip__symbol" aria-hidden="true">
              {skill.symbol}
            </span>
            {skill.name}
          </li>
        ))}
      </Reveal>
    </Section>
  );
}
