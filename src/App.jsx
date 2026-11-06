import About from "./components/About";
import Budy from "./components/Budy";
import Certificates from "./components/Certificates";
import Contact from "./components/Contact";
import Courses from "./components/Courses";
import Education from "./components/Education";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Portfolio from "./components/Portfolio";
import Skills from "./components/Skills";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        saltar al contenido
      </a>
      <Header />
      <main id="contenido" tabIndex={-1}>
        <Hero />
        <About />
        <Education />
        <Skills />
        <Portfolio />
        <Certificates />
        <Courses />
      </main>
      <Contact />
      <Budy />
    </>
  );
}
