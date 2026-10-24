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
        <Reveal as="p" className="hero__eyebrow">
          {hero.eyebrow}
        </Reveal>

        <Reveal as="h1" className="hero__title" delay={80}>
          {hero.title}
        </Reveal>

        <Reveal as="p" className="hero__lead" delay={160}>
          {hero.lead}
        </Reveal>

        <Reveal className="hero__socials" delay={220}>
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

        <Reveal as="dl" className="hero__stats" delay={280}>
          {stats.map((stat) => (
            <div key={stat.label} className="hero__stat">
              <dt className="hero__stat-label">{stat.label}</dt>
              <dd className="hero__stat-value">{stat.value}</dd>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
