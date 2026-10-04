/**
 * Subrayado de tiza garabateado bajo una palabra del título.
 * Va dentro de un <span className="relative inline-block">: se escala con la
 * palabra (em), así que acompaña al clamp() del h1 sin deformarse.
 * El Hero lo dibuja con DrawSVG buscando [data-trazo="subrayado"].
 */

import { FILTRO_TIZA } from "@/components/marca/FiltrosTiza";
import { SUBRAYADO } from "./trazos";

export default function SubrayadoTiza() {
  return (
    <svg
      data-entra="subrayado"
      viewBox={SUBRAYADO.viewBox}
      className="pointer-events-none absolute top-[86%] left-[-4%] h-auto w-[106%] overflow-visible"
      fill="none"
      stroke="#f0b429"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g filter={`url(#${FILTRO_TIZA})`}>
        <path data-trazo="subrayado" d={SUBRAYADO.ida} strokeWidth={6.5} />
        <path data-trazo="subrayado" d={SUBRAYADO.vuelta} strokeWidth={5} opacity={0.85} />
      </g>
    </svg>
  );
}
