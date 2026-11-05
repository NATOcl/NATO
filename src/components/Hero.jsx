import portrait from "../assets/portrait.svg";
import { hero, socials, stats } from "../data/content";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section id="top" className="hero">
      <span className="hero__mark hero__mark--tl" aria-hidden="true" />
      <span className="hero__mark hero__mark--tr" aria-hidden="true" />
      <span className="hero__mark hero__mark--bl" aria-hidden="true" />
      <span className="hero__mark hero__mark--br" aria-hidden="true" />
      <span className="hero__scan" aria-hidden="true" />

      <div className="container hero__inner">
        <div className="row g-4 align-items-center hero__grid">
          <div className="col-12 col-lg-7">
            <Reveal as="p" className="hero__eyebrow">
              {hero.eyebrow}
            </Reveal>

            <Reveal as="h1" className="hero__title" delay={80}>
              {hero.title}
            </Reveal>

            <Reveal as="p" className="hero__lead" delay={160}>
              {hero.lead}
            </Reveal>

            <Reveal className="hero__actions" delay={200}>
              <a className="btn btn-signal hero__cta" href={hero.cta.href}>
                {hero.cta.label}
                <span aria-hidden="true"> →</span>
              </a>
              <a
                className="btn btn-outline-signal hero__cta"
                href={hero.secondaryCta.href}
              >
                {hero.secondaryCta.label}
              </a>
            </Reveal>

            <Reveal className="hero__socials" delay={240}>
              {socials.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  className="hero__social"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social.label}
                </a>
              ))}
            </Reveal>

            <Reveal as="dl" className="hero__stats" delay={300}>
              {stats.map((stat) => (
                <div key={stat.label} className="hero__stat">
                  <dt className="hero__stat-label">{stat.label}</dt>
                  <dd className="hero__stat-value">{stat.value}</dd>
                </div>
              ))}
            </Reveal>
          </div>

          <div className="col-12 col-lg-5">
            <Reveal as="figure" className="hero__portrait" delay={220}>
              <img
                className="hero__portrait-image"
                src={portrait}
                alt={hero.portraitAlt}
                width="480"
                height="560"
                fetchPriority="high"
                decoding="async"
              />
              <figcaption className="hero__portrait-caption">
                Nicolás Troncoso · Ingeniería en Informática
              </figcaption>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
