import { projects } from "../data/content";
import Reveal from "./Reveal";
import Section from "./Section";

export default function Portfolio() {
  return (
    <Section id="portafolio" index="04" title="Portafolio">
      <div className="project-list">
        {projects.map((project, index) => (
          <Reveal
            as="article"
            key={project.title}
            className="project-plate"
            delay={index * 80}
          >
            <a
              href={project.href}
              className="project-plate__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <p className="project-plate__tech">{project.technology}</p>
              <h3 className="project-plate__title">{project.title}</h3>
            </a>

            <p className="project-plate__desc">{project.description}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
