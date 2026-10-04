/**
 * Sol de Mayo dibujado en línea, estilo grabado / tiza.
 * Cara simple dentro de un círculo apenas irregular y 32 rayos que alternan
 * rectos (aguzados) y ondulados (flamígeros). Todo trazo, sin relleno.
 *
 * La geometría se calcula una vez a nivel módulo con números redondeados,
 * así el SSR y el cliente generan exactamente el mismo markup.
 */

import clsx from "clsx";

type Props = {
  className?: string;
  /** Color del trazo. Por defecto hereda el color de texto. */
  trazo?: string;
  /** Rotación lentísima (≈120 s por vuelta) solo de los rayos. */
  girar?: boolean;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Punto en coordenadas polares (0° = arriba, sentido horario). */
function polar(radio: number, grados: number, lateral = 0): [number, number] {
  const a = ((grados - 90) * Math.PI) / 180;
  const perp = a + Math.PI / 2;
  return [
    r1(Math.cos(a) * radio + Math.cos(perp) * lateral),
    r1(Math.sin(a) * radio + Math.sin(perp) * lateral),
  ];
}

const RADIO_CARA = 33;
const RAYO_DESDE = 41;

function rayoRecto(grados: number, largo: number): string {
  const [ax, ay] = polar(RAYO_DESDE, grados, -3.4);
  const [px, py] = polar(RAYO_DESDE + largo, grados, 0);
  const [bx, by] = polar(RAYO_DESDE, grados, 3.4);
  // Arista central del rayo, como en los grabados
  const [cx, cy] = polar(RAYO_DESDE + 3, grados, 0);
  const [dx, dy] = polar(RAYO_DESDE + largo * 0.72, grados, 0);
  return `M${ax} ${ay}L${px} ${py}L${bx} ${by}M${cx} ${cy}L${dx} ${dy}`;
}

function rayoOndulado(grados: number, largo: number): string {
  // Llama: una línea que serpentea con dos ondas y termina en punta
  const pasos = 4;
  const amp = 4.2;
  let d = "";
  const [x0, y0] = polar(RAYO_DESDE, grados, 0);
  d += `M${x0} ${y0}`;
  for (let i = 0; i < pasos; i++) {
    const t0 = i / pasos;
    const t1 = (i + 1) / pasos;
    const lado = i % 2 === 0 ? 1 : -1;
    const atenuar = 1 - t1 * 0.55;
    const [c1x, c1y] = polar(RAYO_DESDE + largo * (t0 + 0.08), grados, amp * lado * atenuar);
    const [c2x, c2y] = polar(RAYO_DESDE + largo * (t1 - 0.08), grados, amp * lado * atenuar);
    const [ex, ey] = polar(RAYO_DESDE + largo * t1, grados, 0);
    d += `C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
  }
  return d;
}

const RAYOS: string = Array.from({ length: 32 }, (_, i) => {
  const grados = i * (360 / 32);
  // Pequeña irregularidad determinística en el largo: hecho a mano
  const variacion = [0, 2.5, -1.5, 1, -2, 1.8, -0.8, 2.2][i % 8];
  return i % 2 === 0
    ? rayoRecto(grados, 50 + variacion)
    : rayoOndulado(grados, 40 + variacion);
}).join("");

/** Círculo de la cara: dos vueltas apenas desfasadas, como un trazo repasado. */
const CARA =
  `M0 -${RADIO_CARA}` +
  "C18.6 -33.4 33.6 -18.2 33.2 0.4" +
  "C32.8 18.9 18.1 33.5 -0.6 33.1" +
  "C-19.2 32.7 -33.4 17.6 -33 -0.8" +
  "C-32.6 -19.4 -17.4 -33.6 1.8 -32.6" +
  "M-5 -34.6C14 -36.4 34.8 -21 34.7 1.2";

const CEJAS = "M-17 -11.5C-13.5 -15.2 -7.8 -15.6 -4.4 -12.6M4.2 -12.8C7.6 -15.8 13.6 -15.4 17.2 -11.4";
const OJOS =
  "M-16.2 -5.4C-13.2 -8.4 -8.2 -8.4 -5.4 -5.2C-8.4 -3.2 -13 -3.1 -16.2 -5.4Z" +
  "M5.4 -5.2C8.2 -8.4 13.2 -8.4 16.2 -5.4C13 -3.1 8.4 -3.2 5.4 -5.2Z" +
  "M-10.6 -5.6l0.1 0.1M10.8 -5.6l0.1 0.1";
const NARIZ = "M0.6 -9.6C-0.4 -3.6 -2.2 2.4 -4.4 5.4C-2.8 7.4 0.8 7.6 3 6.2";
const BOCA = "M-10.4 14.2C-6 18.6 6 18.8 10.6 13.8M-6.6 17.8C-3 20.6 3.4 20.6 6.8 17.6";

// Sin @layer a propósito: declarar una capa acá podría alterar el orden de
// capas de Tailwind si este <style> se inserta antes que globals.css.
const ESTILOS = `
.lve-sol-rayos{transform-origin:0 0}
.lve-sol-girar .lve-sol-rayos{animation:lve-sol-girar 120s linear infinite}
@keyframes lve-sol-girar{to{transform:rotate(360deg)}}
`;

export default function SolDeMayo({ className, trazo = "currentColor", girar = false }: Props) {
  return (
    <>
      <style href="lve-sol-de-mayo" precedence="default">
        {ESTILOS}
      </style>
      <svg
        viewBox="-100 -100 200 200"
        className={clsx(girar && "lve-sol-girar", className)}
        fill="none"
        stroke={trazo}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <g className="lve-sol-rayos" strokeWidth={1.6}>
          <path d={RAYOS} />
        </g>
        <g strokeWidth={1.8}>
          <path d={CARA} />
          <path d={CEJAS} strokeWidth={1.4} />
          <path d={OJOS} strokeWidth={1.4} />
          <path d={NARIZ} strokeWidth={1.4} />
          <path d={BOCA} strokeWidth={1.5} />
        </g>
      </svg>
    </>
  );
}
