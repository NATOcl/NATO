import ProjectCard from "../../src/components/ProjectCard";
import { render } from "../test-utils";

const project = {
  id: "demo",
  title: "Proyecto de prueba",
  description: "Una descripción breve del proyecto.",
  technologies: ["React", "Vite"],
  image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
  imageAlt: "Portada del proyecto de prueba",
  demo: "https://example.com/demo",
  repo: "https://github.com/example/repo",
};

describe("ProjectCard", () => {
  it("muestra imagen, título, descripción, tecnologías y enlaces", () => {
    const { container } = render(<ProjectCard project={project} />);

    const image = container.querySelector(".project-card__image");
    expect(image.getAttribute("src")).toBe(project.image);
    expect(image.getAttribute("alt")).toBe(project.imageAlt);
    expect(image.getAttribute("loading")).toBe("lazy");

    expect(container.querySelector(".project-card__title").textContent).toBe(
      project.title,
    );
    expect(container.querySelector(".project-card__desc").textContent).toBe(
      project.description,
    );

    const tags = Array.from(container.querySelectorAll(".project-card__tag"));
    expect(tags.map((tag) => tag.textContent)).toEqual(project.technologies);

    const links = Array.from(container.querySelectorAll("a"));
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe(project.demo);
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[1].getAttribute("href")).toBe(project.repo);
  });

  it("no abre una pestaña nueva para una demo interna", () => {
    const { container } = render(
      <ProjectCard
        project={{ ...project, demo: "/albumvault/", repo: undefined }}
      />,
    );

    const link = container.querySelector("a");
    expect(link.getAttribute("href")).toBe("/albumvault/");
    expect(link.getAttribute("target")).toBeNull();
    expect(container.querySelectorAll("a").length).toBe(1);
  });
});
