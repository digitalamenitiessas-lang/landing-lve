import { ArrowRight } from "lucide-react";

/** Pendiente de definir con el cliente: sin URL, la sección no se muestra. */
const MEMBRESIAS_URL = process.env.NEXT_PUBLIC_MEMBRESIAS_URL?.trim() ?? "";

export default function Membresias() {
  if (!MEMBRESIAS_URL) return null;
  const externa = /^https?:\/\//i.test(MEMBRESIAS_URL);

  return (
    <section aria-labelledby="membresias-titulo" className="papel border-y-2 border-tinta/10">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 id="membresias-titulo" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="titulo-afiche text-3xl text-verde">¿Sos de la escuela?</span>
          <span className="a-mano text-2xl text-tinta-suave">Ingresá a tu membresía</span>
        </h2>
        <a
          href={MEMBRESIAS_URL}
          {...(externa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="boton boton-verde shrink-0"
        >
          Ingresar
          <ArrowRight className="size-5" aria-hidden />
          {externa ? <span className="sr-only"> (se abre en otra pestaña)</span> : null}
        </a>
      </div>
    </section>
  );
}
