/**
 * Guirnalda de banderines celestes y blancos colgando de un hilo.
 * El hilo cae en guirnaldas (catenaria aproximada con una cuadrática) y cada
 * banderín se mece con su propio ritmo (CSS keyframes, pivote en el hilo).
 *
 * Tamaño: ocupa el ancho del contenedor. El alto lo elegís con una clase h-*
 * (p. ej. className="h-24 lg:h-32"); si no pasás ninguna usa
 * h-[clamp(56px,8vw,112px)]. El SVG recorta los costados (slice) y los
 * banderines conservan su tamaño: en mobile se ven menos banderines, no
 * banderines aplastados.
 *
 * El hilo usa currentColor: sobre pizarrón queda tiza, sobre papel queda tinta.
 * La geometría es determinística (PRNG con semilla fija): SSR == cliente.
 */

import clsx from "clsx";
import type { CSSProperties } from "react";

type Props = {
  className?: string;
  filas?: 1 | 2;
  animado?: boolean;
};

/**
 * Ancho del viewBox: muy apaisado a propósito. Con preserveAspectRatio slice
 * y un alto fijo, se recortan los costados (nunca abajo) hasta ~18:1.
 */
const ANCHO = 2800;

/** Puntos de enganche cada `paso`, cubriendo todo el ancho con margen. */
const enganches = (desde: number, paso: number) => {
  const xs: number[] = [];
  for (let x = desde; x < ANCHO + paso; x += paso) xs.push(x);
  return xs;
};

type Fila = {
  /** Puntos de enganche del hilo (x) */
  enganches: number[];
  y: number;
  caida: number;
  ancho: number;
  alto: number;
  paso: number;
  /** Desfase del primer banderín respecto del enganche */
  desfase: number;
  semilla: number;
  opacidad: number;
};

type Banderin = {
  x: number;
  y: number;
  angulo: number;
  d: string;
  dobladillo: string;
  celeste: boolean;
  duracion: number;
  demora: number;
  amplitud: number;
};

type FilaCalculada = {
  hilo: string;
  banderines: Banderin[];
  opacidad: number;
};

function prng(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function calcularFila(f: Fila): FilaCalculada {
  const azar = prng(f.semilla);
  let hilo = "";
  const banderines: Banderin[] = [];
  let indice = 0;

  for (let i = 0; i < f.enganches.length - 1; i++) {
    const x0 = f.enganches[i];
    const x2 = f.enganches[i + 1];
    const tramo = x2 - x0;
    // Leve diferencia de caída entre guirnaldas: colgadas a mano
    const caida = f.caida + (azar() - 0.5) * 8;
    hilo += `M${r1(x0)} ${r1(f.y)}Q${r1(x0 + tramo / 2)} ${r1(f.y + 2 * caida)} ${r1(x2)} ${r1(f.y)}`;

    const cantidad = Math.floor((tramo - f.desfase * 2) / f.paso) + 1;
    const sobrante = tramo - (cantidad - 1) * f.paso;
    for (let k = 0; k < cantidad; k++) {
      const x = x0 + sobrante / 2 + k * f.paso;
      if (x < -60 || x > ANCHO + 60) continue;
      const t = (x - x0) / tramo;
      const y = f.y + 4 * caida * t * (1 - t);
      const pendiente = (4 * caida * (1 - 2 * t)) / tramo;
      const angulo = r1((Math.atan(pendiente) * 180) / Math.PI);

      // Banderín cortado a tijera: lados apenas curvos, punta corrida
      const w = f.ancho / 2 + (azar() - 0.5) * 3;
      const h = f.alto + (azar() - 0.5) * 7;
      const punta = (azar() - 0.5) * 6;
      const panzaI = (azar() - 0.5) * 3;
      const panzaD = (azar() - 0.5) * 3;
      const d =
        `M${r1(-w)} 0L${r1(w)} 0` +
        `Q${r1(w / 2 + 1 + panzaD)} ${r1(h / 2)} ${r1(punta)} ${r1(h)}` +
        `Q${r1(-w / 2 - 1 + panzaI)} ${r1(h / 2)} ${r1(-w)} 0Z`;
      const dobladillo = `M${r1(-w + 3)} 4.5L${r1(w - 3)} 4.5`;

      banderines.push({
        x: r1(x),
        y: r1(y),
        angulo,
        d,
        dobladillo,
        celeste: indice % 2 === 0,
        duracion: r1(2.6 + azar() * 1.4),
        demora: r1(-azar() * 3),
        amplitud: r1(2.2 + azar() * 2.2),
      });
      indice++;
    }
  }

  return { hilo, banderines, opacidad: f.opacidad };
}

const FILA_1: Fila = {
  enganches: enganches(-30, 410),
  y: 6,
  caida: 30,
  ancho: 46,
  alto: 58,
  paso: 62,
  desfase: 20,
  semilla: 1810,
  opacidad: 1,
};

const FILA_2: Fila = {
  enganches: enganches(-235, 410),
  y: 74,
  caida: 26,
  ancho: 38,
  alto: 48,
  paso: 54,
  desfase: 18,
  semilla: 1816,
  opacidad: 0.88,
};

const UNA_FILA = [calcularFila(FILA_1)];
const DOS_FILAS = [calcularFila(FILA_2), calcularFila(FILA_1)];

const TIENE_ALTO = /(^|\s)([\w[\]-]+:)*h-/;

const ESTILOS = `
.lve-banderin{transform-origin:0 0}
.lve-banderines-animados .lve-banderin{animation:lve-mecer var(--dur,3s) ease-in-out var(--demora,0s) infinite alternate}
@keyframes lve-mecer{from{transform:rotate(calc(var(--amp,3deg) * -1))}to{transform:rotate(var(--amp,3deg))}}
`;

export default function Banderines({ className, filas = 2, animado = true }: Props) {
  const lista = filas === 2 ? DOS_FILAS : UNA_FILA;
  const alto = filas === 2 ? 152 : 100;

  return (
    <>
      <style href="lve-banderines" precedence="default">
        {ESTILOS}
      </style>
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        preserveAspectRatio="xMidYMin slice"
        className={clsx(
          "block w-full",
          // Alto por defecto solo si quien la usa no pasó uno (h-*)
          !TIENE_ALTO.test(className ?? "") && "h-[clamp(56px,8vw,112px)]",
          animado && "lve-banderines-animados",
          className,
        )}
        aria-hidden="true"
        focusable="false"
      >
        {lista.map((fila, i) => (
          <g key={i} opacity={fila.opacidad}>
            <path
              d={fila.hilo}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.55}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
            {fila.banderines.map((b, j) => (
              <g key={j} transform={`translate(${b.x} ${b.y}) rotate(${b.angulo})`}>
                <g
                  className="lve-banderin"
                  style={
                    {
                      "--dur": `${b.duracion}s`,
                      "--demora": `${b.demora}s`,
                      "--amp": `${b.amplitud}deg`,
                    } as CSSProperties
                  }
                >
                  <path
                    d={b.d}
                    fill={b.celeste ? "#7db3e3" : "#fdfbf6"}
                    stroke={b.celeste ? "#5f97c9" : "#d9d2c3"}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                  <path
                    d={b.dobladillo}
                    stroke={b.celeste ? "#5f97c9" : "#cfc7b6"}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    opacity={0.8}
                  />
                </g>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </>
  );
}
