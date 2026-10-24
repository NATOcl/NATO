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
  title: "De la imagen médica al desarrollo de software.",
  lead: "Actualmente estudio Ingeniería en Informática en Duoc UC, después de formarme como Técnico en Radiodiagnóstico y Radioterapia. Me interesa el desarrollo de software y las bases de datos.",
};

export const stats = [
  { value: "+4", label: "repositorios" },
  { value: "1", label: "certificación" },
  { value: "2025", label: "desde" },
];

export const about = {
  lead: "NATOCL",
  paragraphs: [
    "Soy Nicolás Troncoso Olivares. Estudié Técnico en Radiodiagnóstico y Radioterapia en Duoc UC y desde 2025 curso Ingeniería en Informática en la misma casa de estudios."
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
    description:
      "SPA para registrar álbumes, valorarlos en medios pasos y buscarlos en MusicBrainz e iTunes.",
    href: "/albumvault/",
  },
  {
    technology: "python",
    title: "Menú de venta de entradas a prueba de errores",
    description:
      "Programa de consola que valida los datos del comprador y controla el stock de entradas.",
    href: "https://github.com/NATOcl/repositoriopruebaNicolasTroncosoFormaC",
  },
  {
    technology: "java",
    title: "SteamVerde — tienda ficticia a baja escala",
    description: "Base de datos de una tienda ficticia inspirada en Steam.",
    href: "https://github.com/NATOcl/steamverde-examen",
  },
  {
    technology: "html · css",
    title: "Tienda de mascotas en HTML puro",
    description: "Sitio de catálogo construido sin frameworks.",
    href: "https://natocl.github.io/pets",
  },
  {
    technology: "kotlin · android studio",
    title: "Shiva — app móvil de agricultura",
    description:
      "Aplicación móvil en Kotlin para DSY1105.",
    href: "https://github.com/NATOcl/DSY1105-Shiva",
  },
  {
    technology: "react · vite",
    title: "PetCare — sitio web de veterinaria",
    description:
      "SPA de una veterinaria con rutas.",
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
