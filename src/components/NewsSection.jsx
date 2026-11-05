import NewsCard from "./NewsCard";
import Reveal from "./Reveal";

export default function NewsSection({ section, index = 0 }) {
  const headingId = `noticias-${section.id}`;

  return (
    <section className="news-board" aria-labelledby={headingId}>
      <Reveal className="news-board__header">
        <p className="news-board__index" aria-hidden="true">
          0{index + 1}
        </p>
        <div>
          <h3 className="news-board__title" id={headingId}>
            {section.title}
          </h3>
          {section.description && (
            <p className="news-board__desc">{section.description}</p>
          )}
        </div>
      </Reveal>

      <div className="row g-3">
        {section.items.map((item, itemIndex) => (
          <div className="col-12 col-md-6" key={item.id || item.title}>
            <NewsCard item={item} delay={itemIndex * 70} />
          </div>
        ))}
      </div>
    </section>
  );
}
