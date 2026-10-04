/**
 * La taza con su platito, dibujada con tiza blanca (como el ícono de las
 * historias destacadas de @laviejaescuelatuc), y la flecha de la anotación.
 *
 * Es solo markup: la timeline del Hero la "dibuja" con DrawSVG buscando
 * [data-trazo] en orden (plato → cuerpo → asa → borde → café).
 * Sin JS o con reduced-motion se ve completa.
 */

import { FILTRO_TIZA } from "@/components/marca/FiltrosTiza";
import {
  ARTE_VIEWBOX,
  ASA,
  BORDE,
  CAFE,
  CUERPO,
  FLECHA,
  GUARDA_ROMBOS,
  PLATO,
  SOMBRA_PLATO,
} from "./trazos";

const TIZA = "#f5f2ea";

/** Rayado de tiza sobre el café (se recorta con la elipse de la superficie). */
const RAYADO = Array.from({ length: 15 }, (_, i) => {
  const x = 284 + i * 13;
  return `M${x} 314L${x - 18} 358`;
}).join("");

export default function TazaTiza({ className }: { className?: string }) {
  return (
    <svg
      viewBox={ARTE_VIEWBOX}
      className={className}
      fill="none"
      stroke={TIZA}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="lve-taza-cafe">
          <path d={CAFE.superficie} />
        </clipPath>
      </defs>

      <g data-entra="taza" filter={`url(#${FILTRO_TIZA})`}>
        {/* Plato */}
        <g strokeWidth={4.2}>
          <path data-trazo="plato" d={PLATO.atrasIzq} />
          <path data-trazo="plato" d={PLATO.frente} />
          <path data-trazo="plato" d={PLATO.atrasDer} />
          <path data-trazo="plato" d={PLATO.base} strokeWidth={3.4} opacity={0.85} />
          <path data-trazo="plato" d={PLATO.hueco} strokeWidth={2.6} opacity={0.6} />
          <path data-trazo="plato" d={SOMBRA_PLATO} strokeWidth={2.4} opacity={0.5} />
        </g>

        {/* Cuerpo */}
        <g strokeWidth={4.6}>
          <path data-trazo="cuerpo" d={CUERPO.silueta} />
          <path data-trazo="cuerpo" d={CUERPO.repaso} strokeWidth={2.4} opacity={0.45} />
          <path data-trazo="cuerpo" d={CUERPO.pie} strokeWidth={3.6} />
          <path data-trazo="cuerpo" d={CUERPO.guardaArriba} strokeWidth={2.8} opacity={0.85} />
          <path data-trazo="cuerpo" d={CUERPO.guardaAbajo} strokeWidth={2.8} opacity={0.85} />
          <path data-trazo="cuerpo" d={GUARDA_ROMBOS} strokeWidth={2} opacity={0.75} />
        </g>

        {/* Asa */}
        <g strokeWidth={4.4}>
          <path data-trazo="asa" d={ASA.afuera} />
          <path data-trazo="asa" d={ASA.adentro} strokeWidth={3.4} />
        </g>

        {/* Boca de la taza */}
        <path data-trazo="borde" d={BORDE} strokeWidth={4.4} />

        {/* Café: relleno tenue + rayado de tiza + brillo de la crema */}
        <path
          data-relleno="cafe"
          d={CAFE.superficie}
          fill="#6b4428"
          fillOpacity={0.55}
          stroke="none"
        />
        <g clipPath="url(#lve-taza-cafe)">
          <path data-trazo="cafe" d={RAYADO} strokeWidth={1.8} opacity={0.32} />
        </g>
        <path data-trazo="cafe" d={CAFE.superficie} strokeWidth={2.8} opacity={0.9} />
        <path data-trazo="cafe" d={CAFE.brillo} strokeWidth={2.4} opacity={0.7} />
        <path data-trazo="cafe" d={CAFE.remolino} strokeWidth={2} opacity={0.6} />
      </g>

      {/* Flecha de la anotación: de "tarea para el hogar" a la taza */}
      <g data-entra="flecha" filter={`url(#${FILTRO_TIZA})`} strokeWidth={3.6} opacity={0.92}>
        <path data-trazo="flecha" d={FLECHA.cuerpo} />
        <path data-trazo="flecha" d={FLECHA.punta} />
      </g>
    </svg>
  );
}
