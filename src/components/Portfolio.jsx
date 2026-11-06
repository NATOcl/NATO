import { projectsApiUrl } from "../config";
import useRemoteData from "../hooks/useRemoteData";
import DataStatus from "./DataStatus";
import ProjectCard from "./ProjectCard";
import Section from "./Section";

export default function Portfolio() {
  const { data, loading, error, source, reload } = useRemoteData(
    projectsApiUrl,
    "data/projects.json",
  );
  const projects = Array.isArray(data) ? data : data?.projects || [];

  return (
    <Section id="portafolio" index="04" title="Portafolio" wide>
      <p className="section-note">
        Proyectos de curso y ejercicios personales. Cada tarjeta enlaza a una
        demo o al repositorio con el código.
      </p>

      <DataStatus
        loading={loading}
        error={error}
        empty={!loading && !error && projects.length === 0}
        onRetry={reload}
        label="proyectos"
      />

      {!loading && !error && projects.length > 0 && (
        <>
          <p className="data-source" aria-live="polite">
            {source === "api"
              ? `datos desde la API REST · ${projects.length} proyectos`
              : `respaldo JSON local · la API no respondió · ${projects.length} proyectos`}
          </p>

          <div className="row g-4 project-grid">
            {projects.map((project, index) => (
              <div
                className="col-12 col-md-6 col-xl-4"
                key={project.id || project.title}
              >
                <ProjectCard project={project} delay={index * 70} />
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
