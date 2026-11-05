import Reveal from "./Reveal";

export default function NewsCard({ item, delay = 0 }) {
  return (
    <Reveal as="article" className="card news-card h-100" delay={delay}>
      <div className="card-body news-card__body">
        <p className="news-card__date">
          <time dateTime={item.dateTime}>{item.date}</time>
        </p>
        <h4 className="card-title news-card__title">{item.title}</h4>
        <p className="card-text news-card__content">{item.content}</p>
      </div>
    </Reveal>
  );
}
