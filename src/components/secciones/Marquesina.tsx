import Banderines from "@/components/marca/Banderines";

const FRASE = ["Buenas costumbres", "Rico café", "Neobodegón norteño", "Tucumán"] as const;

/** Veces que se repite la frase en cada mitad: alcanza para cubrir pantallas de 2560px. */
const REPETICIONES = 4;

/*
 * La pista tiene dos mitades idénticas y se corre exactamente -50%: el loop no salta.
 * Los keyframes van en un <style> que React 19 sube al <head> (y deduplica por href).
 */
const CSS = `
@keyframes lve-marquesina {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
.lve-marquesina-pista {
  animation: lve-marquesina 38s linear infinite;
}
.lve-marquesina:hover .lve-marquesina-pista {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .lve-marquesina-pista { animation: none; }
}
`;

function Mitad() {
  return (
    <div className="flex shrink-0 items-center">
      {Array.from({ length: REPETICIONES }).flatMap((_, i) =>
        FRASE.map((texto) => (
          <span key={`${i}-${texto}`} className="flex items-center">
            <span className="px-4 whitespace-nowrap">{texto}</span>
            <span className="text-sol">✦</span>
          </span>
        )),
      )}
    </div>
  );
}

export default function Marquesina() {
  return (
    <div className="lve-marquesina relative z-10 bg-rojo text-papel-claro">
      <style href="lve-marquesina" precedence="medium">
        {CSS}
      </style>

      {/* Lo que lee un lector de pantalla: la frase una sola vez */}
      <p className="sr-only">{FRASE.join(" · ")}</p>

      <div
        aria-hidden
        className="overflow-hidden border-y-2 border-rojo-oscuro py-2.5 md:py-3"
      >
        <div className="lve-marquesina-pista flex w-max font-display text-2xl tracking-wide uppercase md:text-3xl">
          <Mitad />
          <Mitad />
        </div>
      </div>

      {/*
        Banderines celestes y blancos colgando de la marquesina. Van en tramos de ancho fijo
        (proporción 12:1 del dibujo) repetidos a lo ancho: así no se recortan ni se agrandan
        en pantallas anchas, y no tapan el encabezado de la sección siguiente.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full flex justify-center overflow-hidden text-tinta"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="w-[720px] shrink-0">
            <Banderines className="h-auto" filas={1} />
          </div>
        ))}
      </div>
    </div>
  );
}
