/* La miga de pan. Sustituye a los dos "Volver al catálogo" idénticos que había
   antes: un solo componente, y los pasos que no son la página actual son
   botones. El separador y la etiqueta van en un fragment, no en un <span>: la
   miga es flex y un envoltorio de más se llevaría un hueco de separador. */

import { Fragment } from "react";

export default function Breadcrumb({ steps, className = "crumb", id }) {
  return (
    <nav id={id} className={className} aria-label="Ruta de navegación">
      {steps.map((step, index) => (
        <Fragment key={`${step.label}-${index}`}>
          {index > 0 ? <span className="crumb-sep" aria-hidden="true">/</span> : null}
          {step.current ? (
            <span className="crumb-current" aria-current="page">{step.label}</span>
          ) : (
            <button className="crumb-step" onClick={() => step.onClick?.()}>
              {step.label}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}