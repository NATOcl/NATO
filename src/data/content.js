import coursePdf from "../assets/certificados/Certificado-Nicolas-Troncoso-Olivares-dvlzb7lo.pdf";

export const profile = {
  name: "Nicolás Troncoso Olivares",
  shortName: "Nicolas Troncoso",
};

export const navLinks = [
  { href: "#sobre-mi", label: "Sobre mí" },
  { href: "#educacion", label: "Educación" },
  { href: "#conocimientos", label: "Conocimientos" },
  { href: "#portafolio", label: "Portafolio" },
  { href: "#certificados", label: "Certificados" },
  { href: "#cursos", label: "Cursos" },
  { href: "#contacto", label: "Contacto" },
];

export const socials = [
  {
    label: "GitHub",
    href: "https://github.com/NATOcl",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/nicolas-troncoso-olivares-1257143b6/",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@bbippboop",
  },
];

export const hero = {
  eyebrow: "nicolas troncoso olivares",
  title: "NATOcl",
  lead: "Actualmente estudio Ingeniería en Informática en Duoc UC, después de formarme como Técnico en Radiodiagnóstico y Radioterapia. Me apasiona el desarrollo de software y la inteligencia artificial.",
};

export const stats = [
  { value: "+4", label: "repositorios" },
  { value: "1", label: "certificación" },
  { value: "2025", label: "desde" },
];

export const about = {
  lead: "NATOCL",
  paragraphs: [
    "Soy Nicolás Troncoso Olivares. Estudié Técnico en Radiodiagnóstico y Radioterapia en Duoc UC y desde 2025 curso Ingeniería en Informática en la misma casa de estudios.",
    "Me apasiona el desarrollo de software y la inteligencia artificial. Me gusta construir proyectos que resuelvan problemas concretos y aprender herramientas nuevas en el proceso.",
  ],
};

export const education = [
  {
    period: "2025 — presente",
    title: "Ingeniería en Informática",
    place: "Duoc UC — Sede San Joaquín",
    status: "En curso",
    current: true,
  },
  {
    period: "2020 — 2024",
    title: "Técnico en Radiodiagnóstico y Radioterapia",
    place: "Duoc UC — Sede San Joaquín",
    status: "Titulado",
    current: false,
  },
];

export const skillsIntro =
  "Herramientas con las que he trabajado en proyectos de curso y ejercicios personales. La base sigue creciendo con cada proyecto.";

export const skills = [
  {
    symbol: "</>",
    name: "HTML",
    description:
      "Estructura semántica, formularios y buenas prácticas de accesibilidad.",
  },
  {
    symbol: "{ }",
    name: "CSS",
    description:
      "Layouts responsive, sistemas de diseño y detalles de interfaz.",
  },
  {
    symbol: "λ",
    name: "Java",
    description:
      "Programación orientada a objetos y resolución de ejercicios de lógica.",
  },
  {
    symbol: "K",
    name: "Kotlin",
    description:
      "Desarrollo de aplicaciones móviles Android y programación orientada a objetos.",
  },
  {
    symbol: "λ",
    name: "Python",
    description:
      "Validación de datos, scripts de consola y control de flujos.",
  },
];

export const projects = [
  {
    technology: "react · vite · indexeddb",
    title: "AlbumVault — catálogo musical personal",
    description: "Registro y valoración de álbumes.",
    href: "/albumvault/",
  },
  {
    technology: "python",
    title: "Menú de venta de entradas a prueba de errores",
    description: "Venta de entradas con control de stock.",
    href: "https://github.com/NATOcl/repositoriopruebaNicolasTroncosoFormaC",
  },
  {
    technology: "java",
    title: "SteamVerde — tienda ficticia a baja escala",
    description: "Base de datos de una tienda de videojuegos.",
    href: "https://github.com/NATOcl/steamverde-examen",
  },
  {
    technology: "html · css",
    title: "Tienda de mascotas en HTML puro",
    description: "Catálogo de mascotas sin frameworks.",
    href: "https://natocl.github.io/pets",
  },
  {
    technology: "kotlin · android studio",
    title: "Shiva — app móvil de agricultura",
    description: "Proyecto de curso para Android.",
    href: "https://github.com/NATOcl/DSY1105-Shiva",
  },
  {
    technology: "react · vite",
    title: "PetCare — sitio web de veterinaria",
    description: "Sitio de veterinaria con rutas.",
    href: "https://github.com/NATOcl/NATOcl.github.io",
  },
];

export const certificate = {
  name: "Python Essentials 1",
  issuer: "Credly",
  href: "https://www.credly.com/badges/51d581eb-3856-434b-9fce-45ea2e62666a",
};

export const courses = [
  {
    name: "Desarrollo con IA",
    issuer: "Certificado de asistencia · Big School",
    pdf: coursePdf,
  },
];

export const contact = {
  email: "ni.troncoso@duocuc.cl",
  emailHref:
    "mailto:ni.troncoso@duocuc.cl?subject=Contacto%20desde%20tu%20web",
  location: "Puente Alto, Región Metropolitana, Chile",
  availability: "Abierto a prácticas",
};
