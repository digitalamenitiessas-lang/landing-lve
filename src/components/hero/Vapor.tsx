"use client";

/**
 * Tres volutas de vapor de tiza saliendo del café.
 *
 * Movimiento (solo con prefers-reduced-motion: no-preference):
 * - el patrón de trazos corre hacia arriba (dash-offset) → el vapor "sube";
 * - cada voluta morfa entre dos formas (MorphSVG) → ondula;
 * - vaivén horizontal leve con desfase entre volutas.
 * Arriba se desvanecen con una máscara de gradiente. El Hero inclina el grupo
 * [data-vapor-inclina] alejándolo del puntero.
 * Con reduced-motion queda el vapor estático, dibujado.
 */

import { useRef } from "react";
import { CONDICIONES, gsap, useGSAP } from "./gsap";
import { ARTE_VIEWBOX, BOCA_TAZA, VOLUTAS } from "./trazos";

const ID_MASCARA = "lve-vapor-mascara";
const ID_DEGRADE = "lve-vapor-degrade";

const largoPatron = (dash: string) =>
  dash.split(/\s+/).reduce((total, n) => total + Number(n), 0);

export default function Vapor({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        const volutas = gsap.utils.toArray<SVGPathElement>("[data-voluta]", ref.current);
        volutas.forEach((el, i) => {
          const v = VOLUTAS[i];
          if (!v) return;
          const patron = largoPatron(v.dash);
          const ritmo = 1 + i * 0.17;

          gsap.fromTo(
            el,
            { strokeDashoffset: 0 },
            { strokeDashoffset: -patron * 3, duration: 4.2 * ritmo, ease: "none", repeat: -1 },
          );
          gsap.to(el, {
            morphSVG: v.b,
            duration: 2.4 * ritmo,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: -i * 0.9,
          });
          gsap.fromTo(
            el,
            { x: i % 2 === 0 ? -4 : 4 },
            {
              x: i % 2 === 0 ? 5 : -5,
              duration: 3.1 * ritmo,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            },
          );
          gsap.fromTo(
            el,
            { opacity: 0.6 },
            { opacity: 0.95, duration: 1.7 * ritmo, ease: "sine.inOut", yoyo: true, repeat: -1 },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <svg
      ref={ref}
      viewBox={ARTE_VIEWBOX}
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={ID_DEGRADE}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={BOCA_TAZA.y + 6}
          x2="0"
          y2="66"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.12" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={ID_MASCARA} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="560">
          <rect x="0" y="0" width="600" height="560" fill={`url(#${ID_DEGRADE})`} />
        </mask>
      </defs>
      <g data-entra="vapor">
        <g data-vapor-inclina="" mask={`url(#${ID_MASCARA})`}>
          {VOLUTAS.map((v, i) => (
            <path
              key={i}
              data-voluta=""
              d={v.a}
              stroke="#f5f2ea"
              strokeWidth={v.ancho}
              strokeLinecap="round"
              strokeDasharray={v.dash}
              opacity={0.85}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
