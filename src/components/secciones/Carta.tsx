import { ArrowUpRight } from "lucide-react";
import type { ComponentType } from "react";
import {
  IconoCubiertos,
  IconoPan,
  IconoReloj,
  IconoTaza,
  type IconoTizaProps,
} from "@/components/marca/IconosTiza";
import { INSTAGRAM_URL } from "@/config/sucursales";

/*
 * Pizarrón de bodegón con las categorías como las historias destacadas de Instagram.
 * La carta digital llega "oportunamente": no se inventan platos ni precios.
 */
const CATEGORIAS: readonly { nombre: string; Icono: ComponentType<IconoTizaProps> }[] = [
  { nombre: "Desayunos y meriendas", Icono: IconoTaza },
  { nombre: "Almuerzos y cenas", Icono: IconoCubiertos },
  { nombre: "Entre panes", Icono: IconoPan },
];

const CARTA_URL = process.env.NEXT_PUBLIC_CARTA_URL?.trim() ?? "";

function esExterna(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function Carta() {
  const destino = CARTA_URL || INSTAGRAM_URL;
  const textoBoton = CARTA_URL ? "Ver la carta" : "Mirala en Instagram";
  const externa = esExterna(destino);

  return (
    <section
      id="carta"
      aria-labelledby="carta-titulo"
      className="pizarra overflow-hidden pt-20 md:pt-28"
    >
      {/* Reloj de tiza en la esquina: la hora del recreo */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-6 right-4 flex flex-col items-center text-tiza/70 md:top-12 md:right-[8%]"
      >
        <IconoReloj className="size-16 md:size-24" />
        <span className="a-mano -mt-1 rotate-[-6deg] text-lg md:text-xl">hora del recreo</span>
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="font-display text-lg tracking-[0.18em] text-celeste-claro uppercase">
            Bodegón del día
          </p>
          <h2
            id="carta-titulo"
            className="a-mano mt-2 pr-28 text-5xl text-tiza sm:text-6xl lg:pr-0 md:text-7xl"
          >
            La carta, en el pizarrón
          </h2>
          {/* Subrayado a tiza */}
          <svg
            aria-hidden
            viewBox="0 0 300 14"
            className="mt-1 h-3 w-60 text-sol/80 md:w-80"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M3 9C60 4 140 3 220 6c26 1 50 3 76 1" filter="url(#tiza)" />
          </svg>
        </header>

        <ul className="mt-12 grid gap-6 sm:grid-cols-3 sm:gap-8 md:mt-16">
          {CATEGORIAS.map(({ nombre, Icono }) => (
            <li
              key={nombre}
              className="flex items-center gap-5 sm:flex-col sm:gap-4 sm:text-center"
            >
              {/* Círculo de historia destacada */}
              <span className="grid size-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-tiza/45 bg-pizarra-oscura/40 md:size-32">
                <Icono className="size-14 text-tiza md:size-[4.5rem]" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-2xl leading-tight tracking-wide uppercase md:text-[1.7rem]">
                  {nombre}
                </span>
                <span className="a-mano mt-1 block text-2xl text-sol">Próximamente</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-col items-start gap-6 border-t-2 border-dashed border-tiza/25 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-lg text-tiza/90">
            Muy pronto vas a poder ver la carta de cada sucursal acá. Mientras tanto, la tenés en
            nuestras historias destacadas.
          </p>
          <a
            href={destino}
            {...(externa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="boton boton-tiza shrink-0"
          >
            {textoBoton}
            <ArrowUpRight className="size-5" aria-hidden />
            {externa ? <span className="sr-only"> (se abre en otra pestaña)</span> : null}
          </a>
        </div>
      </div>

      {/* Bandeja del pizarrón con tizas apoyadas */}
      <div aria-hidden className="relative mt-16 md:mt-20">
        <div className="mx-auto flex h-5 max-w-5xl items-end gap-3 px-8 sm:px-10">
          <span className="h-2.5 w-12 -rotate-2 rounded-[3px] bg-tiza shadow-[0_1px_0_rgb(0_0_0/0.25)]" />
          <span className="h-2.5 w-7 rotate-3 rounded-[3px] bg-celeste-claro shadow-[0_1px_0_rgb(0_0_0/0.25)]" />
          <span className="ml-auto h-4 w-16 rounded-sm bg-cafe-oscuro shadow-[inset_0_-5px_0_var(--color-papel-oscuro)]" />
        </div>
        <div className="h-4 bg-cafe shadow-[inset_0_2px_0_rgb(255_255_255/0.15),inset_0_-3px_0_var(--color-cafe-oscuro)]" />
      </div>
    </section>
  );
}
