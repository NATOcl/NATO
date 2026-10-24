import { useEffect, useState } from "react";
import { navLinks, profile } from "../data/content";

const getInitialTheme = () => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter(Boolean);

    if (sections.length === 0 || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current) setActiveSection(current.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const closeMenu = () => setMenuOpen(false);
  const nextTheme = theme === "dark" ? "claro" : "oscuro";
  const isCurrent = (href) => activeSection === href.slice(1);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="#top" className="brand" onClick={closeMenu}>
          <span className="brand__mark" aria-hidden="true">
            NT
          </span>
          <span className="brand__name">{profile.shortName}</span>
        </a>

        <nav className="nav" aria-label="Principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav__link"
              aria-current={isCurrent(link.href) ? "location" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            aria-label={`Cambiar a modo ${nextTheme}`}
            title={`Cambiar a modo ${nextTheme}`}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            <span className="theme-toggle__icon" aria-hidden="true" />
          </button>

          <div className="mobile-menu">
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              onClick={() => setMenuOpen((open) => !open)}
            >
              menú
            </button>
            <nav
              id="menu-movil"
              className="menu-panel"
              aria-label="Principal móvil"
              hidden={!menuOpen}
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="menu-panel__link"
                  aria-current={isCurrent(link.href) ? "location" : undefined}
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
