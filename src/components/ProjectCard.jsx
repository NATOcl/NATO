import { albumVaultUrl } from "../config";
import Reveal from "./Reveal";

const isExternal = (href) => /^https?:\/\//i.test(href);
const resolveHref = (href) => (href === "/albumvault/" ? albumVaultUrl : href);

function ProjectLink({ href, label, variant = "outline" }) {
  if (!href) return null;

  const external = isExternal(href);

  return (
    <a
      className={`btn btn-sm project-card__action project-card__action--${variant}`}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {label}
      <span aria-hidden="true">{external ? " ↗" : " →"}</span>
    </a>
  );
}

export default function ProjectCard({ project, delay = 0 }) {
  const technologies = Array.isArray(project.technologies)
    ? project.technologies
    : [project.technologies].filter(Boolean);

  return (
    <Reveal as="article" className="card project-card h-100" delay={delay}>
      <img
        className="card-img-top project-card__image"
        src={project.image}
        alt={project.imageAlt || `Portada del proyecto ${project.title}`}
        width="800"
        height="450"
        loading="lazy"
        decoding="async"
      />

      <div className="card-body project-card__body">
        <ul className="project-card__tags" aria-label="Tecnologías utilizadas">
          {technologies.map((technology) => (
            <li className="badge project-card__tag" key={technology}>
              {technology}
            </li>
          ))}
        </ul>

        <h3 className="card-title project-card__title">{project.title}</h3>
        <p className="card-text project-card__desc">{project.description}</p>

        <div className="project-card__actions">
          <ProjectLink
            href={resolveHref(project.demo)}
            label="Ver demo"
            variant="solid"
          />
          <ProjectLink href={resolveHref(project.repo)} label="Repositorio" />
        </div>
      </div>
    </Reveal>
  );
}
