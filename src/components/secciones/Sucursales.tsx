import clsx from "clsx";
import { MapPin, Navigation } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { SUCURSALES, type SucursalId } from "@/config/sucursales";
import BotonPedirAca from "./BotonPedirAca";

/* ---------- Pared de azulejos blancos con juntas grises ---------- */

const AZULEJOS: CSSProperties = {
  backgroundColor: "#f7f6f1",
  backgroundImage: [
    // juntas
    "linear-gradient(to right, rgb(140 136 128 / 0.42) 1.5px, transparent 1.5px)",
    "linear-gradient(to bottom, rgb(140 136 128 / 0.42) 1.5px, transparent 1.5px)",
    // brillo esmaltado de cada azulejo
    "linear-gradient(135deg, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0) 42%, rgb(30 26 21 / 0.035))",
  ].join(", "),
  backgroundSize: "64px 64px",
  backgroundPosition: "center top",
};

/*
 * Cada afiche como los de la marca: papel crema, tipografía condensada verde y roja,
 * pegado con cinta y un poquito torcido. La dirección se muestra tal cual figura en
 * los afiches (campo `direccion` de SUCURSALES), sin recortarla ni reescribirla.
 */
const AFICHE: Record<
  SucursalId,
  { giro: string; encabezado: string; colorEncabezado: string; colorDireccion: string }
> = {
  "santa-fe": {
    giro: "-rotate-1 md:-rotate-2",
    encabezado: "Desde siempre en",
    colorEncabezado: "text-rojo-oscuro",
    colorDireccion: "text-verde",
  },
  "24-de-septiembre": {
    giro: "rotate-1 md:mt-12 md:rotate-[1.75deg]",
    encabezado: "Guardate esta dirección",
    colorEncabezado: "text-verde",
    colorDireccion: "text-rojo",
  },
};

function Cinta({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "absolute h-7 w-24 border border-white/40 bg-papel-oscuro/75 shadow-[0_1px_2px_rgb(30_26_21/0.15)] backdrop-blur-[1px]",
        className,
      )}
    />
  );
}

/** Grafitis tenues en la pared: decoración pura. */
function Grafitis() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* x + y = café, con tiza de pizarrón escolar hecha marcador */}
      <svg
        viewBox="0 0 220 70"
        className="absolute top-10 -left-6 w-56 -rotate-6 text-tinta/15 md:top-16 md:left-6 md:w-72"
      >
        <text x="8" y="48" className="font-tiza" fontSize="44" fontWeight="700" fill="currentColor">
          x + y = café
        </text>
        <path
          d="M10 60c50 6 120 4 200-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Corazón con flecha */}
      <svg
        viewBox="0 0 120 100"
        className="absolute right-3 bottom-40 w-24 rotate-12 text-rojo/25 md:right-[8%] md:bottom-24 md:w-32"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 86C30 66 14 50 16 32 18 18 32 12 44 18c8 4 13 11 16 18 3-8 9-15 18-18 12-4 25 3 26 17 1 18-17 36-44 51Z" />
        <path d="M6 70 110 20M98 14l12 6-6 12" />
      </svg>

      {/* ¡Presente! */}
      <svg
        viewBox="0 0 220 80"
        className="absolute top-[46%] -right-10 hidden w-64 rotate-[-8deg] text-verde/15 md:block"
      >
        <text
          x="10"
          y="56"
          className="font-display"
          fontSize="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          ¡PRESENTE!
        </text>
      </svg>

      {/* Estrellitas y un solcito */}
      <svg
        viewBox="0 0 80 80"
        className="absolute bottom-10 left-4 w-14 text-celeste/45 md:bottom-16 md:left-[10%] md:w-20"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m40 8 8 22 24 1-19 15 7 24-20-14-20 14 7-24L8 31l24-1Z" />
      </svg>
      <svg
        viewBox="0 0 80 80"
        className="absolute top-6 right-8 w-14 text-sol/40 md:top-14 md:right-[16%] md:w-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <circle cx="40" cy="40" r="14" />
        <path d="M40 8v10M40 62v10M8 40h10M62 40h10M17 17l7 7M56 56l7 7M63 17l-7 7M24 56l-7 7" />
      </svg>
    </div>
  );
}

export default function Sucursales() {
  return (
    <section
      id="sucursales"
      aria-labelledby="sucursales-titulo"
      className="relative isolate overflow-hidden py-20 md:py-28"
      style={AZULEJOS}
    >
      <Grafitis />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <p className="a-mano text-2xl text-rojo-oscuro md:text-3xl">¡Presente en dos lugares!</p>
          <h2
            id="sucursales-titulo"
            className="titulo-afiche mt-2 text-5xl text-verde sm:text-6xl md:text-7xl"
          >
            Dos aulas, una misma escuela
          </h2>
          <p className="mt-4 text-lg text-tinta-suave">
            Pasá por la que te quede más cerca: en las dos te esperan el mismo café y las mismas
            buenas costumbres.
          </p>
        </header>

        <ul className="mt-14 grid gap-14 md:mt-20 md:grid-cols-2 md:gap-10 lg:gap-16">
          {SUCURSALES.map((s) => {
            const estilo = AFICHE[s.id];
            const idTitulo = `afiche-${s.id}`;
            return (
              <li key={s.id} className="flex justify-center">
                <article
                  aria-labelledby={idTitulo}
                  className={clsx(
                    "papel relative w-full max-w-[26rem] px-6 pt-10 pb-8 text-center sm:px-9",
                    "shadow-[0_22px_34px_-18px_rgb(30_26_21/0.45),0_2px_4px_rgb(30_26_21/0.08)]",
                    "transition-[rotate] duration-500 ease-tiza",
                    "hover:rotate-0 focus-within:rotate-0",
                    estilo.giro,
                  )}
                >
                  <Cinta className="-top-3.5 left-1/2 -translate-x-1/2 rotate-[-3deg]" />
                  <Cinta className="-bottom-3 -right-5 w-20 rotate-[-38deg] max-sm:hidden" />

                  {/* Filete de imprenta */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-3 border-2 border-verde/15"
                  />

                  <Image
                    src="/marca/logo-verde.png"
                    alt=""
                    width={88}
                    height={60}
                    className="mx-auto h-[60px] w-auto"
                  />

                  <p className="a-mano mt-3 text-2xl text-tinta-suave">{s.apodo}</p>

                  <p
                    className={clsx(
                      "mt-3 font-display text-2xl tracking-wide uppercase",
                      estilo.colorEncabezado,
                    )}
                  >
                    {estilo.encabezado}
                  </p>

                  <h3
                    id={idTitulo}
                    className={clsx(
                      "titulo-afiche mt-1 text-[clamp(2.75rem,13vw,4.25rem)] break-words text-balance",
                      estilo.colorDireccion,
                    )}
                  >
                    {s.direccion}
                  </h3>

                  <p className="mt-3 inline-flex items-center gap-1.5 font-semibold text-tinta">
                    <MapPin className="size-5 shrink-0 text-rojo" aria-hidden />
                    {s.ciudad}
                  </p>

                  <p className="mx-auto mt-4 max-w-xs text-tinta-suave">{s.descripcion}</p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <a
                      href={s.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="boton boton-tinta"
                    >
                      <Navigation className="size-4" aria-hidden />
                      Cómo llegar
                      <span className="sr-only">
                        {" "}
                        a {s.direccion} (abre Google Maps en otra pestaña)
                      </span>
                    </a>
                    <BotonPedirAca id={s.id}>
                      Pedí tu 1/4 acá
                      <span className="sr-only"> en {s.direccion}</span>
                    </BotonPedirAca>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
