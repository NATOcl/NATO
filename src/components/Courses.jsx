import { useEffect, useRef, useState } from "react";
import { courses } from "../data/content";
import Reveal from "./Reveal";
import Section from "./Section";

export default function Courses() {
  const [activeCourse, setActiveCourse] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!activeCourse) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveCourse(null);
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );

      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [activeCourse]);

  const openCourse = (course, trigger) => {
    triggerRef.current = trigger;
    setPdfLoading(true);
    setActiveCourse(course);
  };

  const closeCourse = () => setActiveCourse(null);

  return (
    <Section id="cursos" index="06" title="Cursos" divider={false}>
      <div className="course-list">
        {courses.map((course) => (
          <Reveal
            as="button"
            key={course.name}
            type="button"
            className="certificate-row course-row"
            aria-haspopup="dialog"
            onClick={(event) => openCourse(course, event.currentTarget)}
          >
            <span className="certificate-row__body">
              <span className="certificate-row__name">{course.name}</span>
              <span className="certificate-row__issuer">{course.issuer}</span>
            </span>
            <span className="certificate-row__cta">
              previsualizar PDF <span aria-hidden="true">↗</span>
            </span>
          </Reveal>
        ))}
      </div>

      {activeCourse && (
        <div
          className="pdf-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeCourse();
          }}
        >
          <div
            className="pdf-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-modal-title"
            ref={dialogRef}
          >
            <div className="pdf-modal__header">
              <div className="pdf-modal__heading">
                <p className="pdf-modal__title" id="pdf-modal-title">
                  {activeCourse.name}
                </p>
                <p className="pdf-modal__meta">{activeCourse.issuer}</p>
              </div>

              <div className="pdf-modal__actions">
                <a
                  className="pdf-modal__external"
                  href={activeCourse.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  abrir en pestaña nueva{" "}
                  <span aria-hidden="true">↗</span>
                </a>
                <button
                  ref={closeRef}
                  type="button"
                  className="pdf-modal__close"
                  onClick={closeCourse}
                  aria-label="Cerrar previsualización"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="pdf-modal__viewer">
              {pdfLoading && (
                <p className="pdf-modal__loading" role="status">
                  cargando certificado…
                </p>
              )}
              <iframe
                src={`${activeCourse.pdf}#view=FitH`}
                title={`Previsualización del certificado ${activeCourse.name}`}
                onLoad={() => setPdfLoading(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
