import useJsonData from "../hooks/useJsonData";
import DataStatus from "./DataStatus";
import NewsSection from "./NewsSection";
import Section from "./Section";

export default function News() {
  const { data, loading, error, reload } = useJsonData("data/news.json");
  const sections = Array.isArray(data?.sections) ? data.sections : [];

  return (
    <Section id="noticias" index="05" title="Noticias" wide>
      <p className="section-note">
        Dos tableros de novedades cargados desde <code>news.json</code>: lo
        último del portafolio y lo que estoy aprendiendo.
      </p>

      <DataStatus
        loading={loading}
        error={error}
        empty={!loading && !error && sections.length === 0}
        onRetry={reload}
        label="noticias"
      />

      {!loading && !error && sections.length > 0 && (
        <div className="news-boards">
          {sections.map((section, index) => (
            <NewsSection
              key={section.id || section.title}
              section={section}
              index={index}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
