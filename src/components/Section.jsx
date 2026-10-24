import Reveal from "./Reveal";

export default function Section({
  id,
  index,
  title,
  children,
  divider = true,
}) {
  return (
    <>
      <section id={id} className="section">
        <div className="container section__inner">
          <Reveal as="h2" className="section-tag">
            {index} - {title}
          </Reveal>
          <div className="section__body">{children}</div>
        </div>
      </section>
      {divider && <hr className="rule" />}
    </>
  );
}
