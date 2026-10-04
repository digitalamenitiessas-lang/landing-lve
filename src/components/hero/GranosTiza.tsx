"use client";

/**
 * Granos de café dibujados en tiza alrededor de la taza.
 * Cada grano es un SVG chico propio (así el filtro de tiza se rasteriza una
 * vez y el movimiento va por transform de HTML, compuesto por la GPU).
 *
 * Capas por grano: [data-parallax] (lo mueve el Hero según el puntero) →
 * [data-flota] (flotación lenta, acá) → [data-entra="grano"] (entrada).
 */

import { useRef } from "react";
import { FILTRO_TIZA } from "@/components/marca/FiltrosTiza";
import { CONDICIONES, gsap, useGSAP } from "./gsap";
import { GRANO } from "./trazos";

type Grano = {
  /** Centro en % del cuadro del arte */
  x: number;
  y: number;
  /** Ancho en % del cuadro del arte */
  tam: number;
  giro: number;
  /** Profundidad para el parallax (px de recorrido) */
  prof: number;
  /** Solo en pantallas grandes (en mobile el arte es chico) */
  soloGrande?: boolean;
};

const GRANOS: Grano[] = [
  { x: 44, y: 35, tam: 8, giro: -24, prof: 14 },
  { x: 88, y: 22, tam: 7, giro: 36, prof: 22 },
  { x: 95, y: 56, tam: 8.2, giro: 72, prof: 18 },
  { x: 9, y: 84, tam: 8.4, giro: -40, prof: 26 },
  { x: 26, y: 96, tam: 6.4, giro: 14, prof: 12, soloGrande: true },
  { x: 6, y: 36, tam: 6.2, giro: 8, prof: 20, soloGrande: true },
  { x: 47, y: 12, tam: 6, giro: -58, prof: 28 },
];

export default function GranosTiza() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        gsap.utils.toArray<HTMLElement>("[data-flota]", ref.current).forEach((el, i) => {
          gsap.fromTo(
            el,
            { y: -5, rotation: -6 },
            {
              y: 6,
              rotation: 7,
              duration: 3 + (i % 3) * 0.7,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              delay: -i * 0.8,
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true">
      {GRANOS.map((g, i) => (
        <div
          key={i}
          data-parallax={g.prof}
          className={g.soloGrande ? "absolute hidden lg:block" : "absolute"}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${g.tam}%`,
            marginLeft: `-${g.tam / 2}%`,
            marginTop: `-${g.tam * 0.55}%`,
          }}
        >
          <div data-flota="">
            <svg
              data-entra="grano"
              viewBox="-20 -22 40 44"
              className="block h-auto w-full overflow-visible"
              style={{ rotate: `${g.giro}deg` }}
              fill="none"
              stroke="#f5f2ea"
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
            >
              <g filter={`url(#${FILTRO_TIZA})`}>
                <path d={GRANO.contorno} fill="#6b4428" fillOpacity={0.35} strokeWidth={2.8} />
                <path d={GRANO.surco} strokeWidth={2.4} opacity={0.9} />
              </g>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
