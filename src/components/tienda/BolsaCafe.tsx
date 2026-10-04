"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useId, useRef } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

/* ------------------------------------------------------------------ */
/* Granos: posiciones fijas (PRNG con semilla → igual en SSR y cliente) */
/* ------------------------------------------------------------------ */

function prng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

type Grano = { x: number; y: number; giro: number; escala: number };

/** Montañita de granos que asoma por la boca de la bolsa. */
const PILA: Grano[] = (() => {
  const azar = prng(746);
  const granos: Grano[] = [];
  for (let i = 0; i < 48; i++) {
    const x = 72 + azar() * 176;
    const u = (x - 160) / 92;
    const cima = 134 - 25 * (1 - u * u);
    granos.push({
      x: r1(x),
      y: r1(cima + 4 + azar() * 16),
      giro: Math.round(azar() * 360),
      escala: r1(0.9 + azar() * 0.25),
    });
  }
  return granos.sort((a, b) => a.y - b.y);
})();

type GranoQueCae = { x: number; desde: number; hasta: number; giro: number; vueltas: number };

/** Granos que caen desde arriba y se pierden adentro de la bolsa. */
const CAEN: GranoQueCae[] = (() => {
  const azar = prng(24);
  return Array.from({ length: 16 }, () => ({
    x: r1(96 + azar() * 128),
    desde: r1(-30 - azar() * 40),
    hasta: r1(150 + azar() * 20),
    giro: Math.round(azar() * 360),
    vueltas: Math.round((azar() - 0.5) * 540),
  }));
})();

const SUELO: Grano[] = [
  { x: 262, y: 374, giro: 70, escala: 1 },
  { x: 282, y: 369, giro: 150, escala: 0.95 },
  { x: 246, y: 381, giro: 20, escala: 1 },
];

/** Borde dentado (tijera zigzag) entre dos puntos a la misma altura. */
function dientes(x0: number, x1: number, y: number, alto: number, paso = 8): string {
  const puntos: string[] = [];
  let arriba = false;
  for (let x = x0; x <= x1; x += paso / 2) {
    puntos.push(`${x} ${arriba ? y - alto : y}`);
    arriba = !arriba;
  }
  return puntos.join(" L");
}

const ESPALDA = `M${dientes(66, 254, 100, 6)} L258 362 L62 362 Z`;
const FRENTE = `M${dientes(58, 262, 134, 6)} L266 364 L54 364 Z`;

export default function BolsaCafe({ className }: { className?: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (nombre: string) => `bolsa-${uid}-${nombre}`;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Con reduced-motion no se anima nada: queda la bolsa llena, tal como viene del servidor.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: contenedor.current, start: "top 78%", once: true },
          defaults: { overwrite: "auto" },
        });

        tl.fromTo(
          ".grano-cae",
          { y: (i: number) => CAEN[i]!.desde, rotation: 0, opacity: 1 },
          {
            y: (i: number) => CAEN[i]!.hasta,
            rotation: (i: number) => CAEN[i]!.vueltas,
            duration: 0.6,
            ease: "power2.in",
            stagger: 0.055,
            transformOrigin: "50% 50%",
          },
          0,
        )
          .from(".pila", { y: 48, duration: 1.1, ease: "power1.out" }, 0.3)
          .set(".grano-cae", { opacity: 0 }, ">")
          .from(
            ".sello",
            { scale: 1.9, opacity: 0, duration: 0.24, ease: "power3.in", transformOrigin: "50% 50%" },
            1.2,
          )
          .to(
            ".colgante",
            {
              keyframes: [
                { rotation: -9, duration: 0.16 },
                { rotation: 5, duration: 0.2 },
                { rotation: 0, duration: 0.3 },
              ],
              ease: "sine.inOut",
              svgOrigin: "88 150",
            },
            1.3,
          );
      });
    },
    { scope: contenedor },
  );

  return (
    <div ref={contenedor} className={className}>
      <svg
        viewBox="0 0 320 400"
        role="img"
        aria-label="Bolsa de papel madera de 1/4 kg de café de La Vieja Escuela, llena de granos"
        className="block h-auto w-full"
      >
        <defs>
          <radialGradient id={id("grano-g")} cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#8a5a34" />
            <stop offset="0.55" stopColor="var(--color-cafe)" />
            <stop offset="1" stopColor="var(--color-cafe-oscuro)" />
          </radialGradient>
          <g id={id("grano")}>
            <ellipse rx="6.4" ry="8.6" fill={`url(#${id("grano-g")})`} />
            <path
              d="M0.6 -7.2 C -3.2 -3 3.6 2.6 -0.6 7.2"
              fill="none"
              stroke="#24140a"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <ellipse cx="-2.6" cy="-3.4" rx="1.4" ry="2.6" fill="#fff" opacity="0.14" />
          </g>

          <linearGradient id={id("frente-g")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#a5814d" />
            <stop offset="0.08" stopColor="#bf9b69" />
            <stop offset="0.11" stopColor="#d0af80" />
            <stop offset="0.5" stopColor="#d6b688" />
            <stop offset="0.89" stopColor="#c9a678" />
            <stop offset="0.92" stopColor="#b18b57" />
            <stop offset="1" stopColor="#9a7644" />
          </linearGradient>
          <linearGradient id={id("espalda-g")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8c6b40" />
            <stop offset="0.14" stopColor="#6e5232" />
            <stop offset="0.3" stopColor="#b8925f" />
          </linearGradient>
          <linearGradient id={id("sombra-boca")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.28" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>

          {/* Fibras del papel madera */}
          <filter id={id("fibra")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="3" seed="7" />
            <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.16  0 0 0 0 0.07  0 0 0 0.9 -0.25" />
            <feComposite in2="SourceAlpha" operator="in" />
          </filter>
          {/* Tinta de sello gastada */}
          <filter id={id("gastado")} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="ruido" />
            <feColorMatrix
              in="ruido"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.95"
              result="mascara"
            />
            <feComposite in="SourceGraphic" in2="mascara" operator="in" />
          </filter>
          <path id={id("aro")} d="M0 -29.5 A29.5 29.5 0 1 1 -0.01 -29.5" />
        </defs>

        {/* Sombra en la mesa */}
        <ellipse cx="164" cy="368" rx="128" ry="11" fill="var(--color-tinta)" opacity="0.14" />

        {/* Espalda de la bolsa (se ve por dentro, más oscura) */}
        <path d={ESPALDA} fill={`url(#${id("espalda-g")})`} />
        <ellipse cx="160" cy="134" rx="98" ry="12" fill="var(--color-cafe-oscuro)" opacity="0.85" />

        {/* Granos que caen */}
        <g aria-hidden="true">
          {CAEN.map((g, i) => (
            <g key={i} transform={`translate(${g.x} 0)`}>
              <g className="grano-cae" opacity="0">
                <use href={`#${id("grano")}`} transform={`rotate(${g.giro})`} />
              </g>
            </g>
          ))}
        </g>

        {/* Montañita de granos */}
        <g className="pila">
          {PILA.map((g, i) => (
            <use
              key={i}
              href={`#${id("grano")}`}
              transform={`translate(${g.x} ${g.y}) rotate(${g.giro}) scale(${g.escala})`}
            />
          ))}
        </g>

        {/* Frente */}
        <path d={FRENTE} fill={`url(#${id("frente-g")})`} />
        <path d={FRENTE} filter={`url(#${id("fibra")})`} opacity="0.55" />
        <path d="M54 134 H266 V158 H54 Z" fill={`url(#${id("sombra-boca")})`} opacity="0.5" />
        {/* Pliegues */}
        <g fill="none" strokeLinecap="round">
          <path d="M72 140 L69 360" stroke="#7a5a33" strokeOpacity="0.35" strokeWidth="1.2" />
          <path d="M248 140 L251 360" stroke="#7a5a33" strokeOpacity="0.35" strokeWidth="1.2" />
          <path d="M60 158 Q160 152 260 158" stroke="#7a5a33" strokeOpacity="0.28" strokeWidth="1" />
          <path d="M60 160 Q160 154 260 160" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />
          <path d="M56 338 L264 338" stroke="#7a5a33" strokeOpacity="0.25" strokeWidth="1" />
        </g>
        <path d="M56 352 L264 352 L266 364 L54 364 Z" fill="#000" opacity="0.08" />

        {/* Etiqueta de papel con el logo */}
        <g transform="rotate(-2 160 238)">
          <rect x="91" y="170" width="138" height="138" rx="3" fill="#000" opacity="0.12" transform="translate(2 3)" />
          <rect x="91" y="170" width="138" height="138" rx="3" fill="var(--color-papel-claro)" />
          <rect
            x="96"
            y="175"
            width="128"
            height="128"
            rx="2"
            fill="none"
            stroke="var(--color-verde)"
            strokeWidth="1.4"
          />
          <image href="/marca/logo-verde.png" x="113" y="181" width="94" height="64.4" />
          <line x1="108" x2="212" y1="252" y2="252" stroke="var(--color-verde)" strokeWidth="1" />
          <text
            x="160"
            y="279"
            textAnchor="middle"
            fill="var(--color-rojo)"
            fontSize="25"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
          >
            RICO CAFÉ
          </text>
          <text
            x="160"
            y="294"
            textAnchor="middle"
            fill="var(--color-verde)"
            fontSize="7.6"
            fontWeight="700"
            style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.14em" }}
          >
            NEOBODEGÓN NORTEÑO
          </text>
        </g>

        {/* Sello de goma "1/4 kg" */}
        <g transform="translate(228 316) rotate(-14)">
          <g className="sello">
            <g
              filter={`url(#${id("gastado")})`}
              fill="var(--color-rojo)"
              stroke="var(--color-rojo)"
              style={{ mixBlendMode: "multiply" }}
              opacity="0.92"
            >
              <circle r="36" fill="none" strokeWidth="3.2" />
              <circle r="23.5" fill="none" strokeWidth="1.3" />
              <text
                fontSize="7.4"
                stroke="none"
                style={{ fontFamily: "var(--font-sans)", fontWeight: 800, letterSpacing: "0.22em" }}
              >
                <textPath href={`#${id("aro")}`} startOffset="0">
                  LA VIEJA ESCUELA · CAFÉ ·
                </textPath>
              </text>
              <text
                y="5"
                textAnchor="middle"
                fontSize="22"
                stroke="none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                1/4
              </text>
              <text
                y="16"
                textAnchor="middle"
                fontSize="8"
                stroke="none"
                style={{ fontFamily: "var(--font-sans)", fontWeight: 800, letterSpacing: "0.2em" }}
              >
                KG
              </text>
            </g>
          </g>
        </g>

        {/* Cordel con etiqueta colgante */}
        <g className="colgante">
          <circle cx="80" cy="150" r="3" fill="var(--color-cafe-oscuro)" />
          <circle cx="96" cy="150" r="3" fill="var(--color-cafe-oscuro)" />
          <g fill="none" strokeLinecap="round">
            <path d="M80 150 C72 172 52 190 40 222" stroke="#8a6a42" strokeWidth="2.2" />
            <path d="M96 150 C88 180 60 198 42 222" stroke="#8a6a42" strokeWidth="2.2" />
            <path
              d="M80 150 C72 172 52 190 40 222"
              stroke="#e8d3ad"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <path
              d="M96 150 C88 180 60 198 42 222"
              stroke="#e8d3ad"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <path d="M80 150 Q88 140 96 150" stroke="#8a6a42" strokeWidth="2.2" />
          </g>
          <g transform="rotate(7 41 222)">
            <path
              d="M15 229 L25 216 L57 216 L67 229 L67 294 L15 294 Z"
              fill="var(--color-papel)"
              stroke="var(--color-tinta-suave)"
              strokeWidth="0.8"
            />
            <circle cx="41" cy="224" r="3" fill="var(--color-papel-oscuro)" stroke="#8a6a42" strokeWidth="1" />
            <text
              x="41"
              y="250"
              textAnchor="middle"
              fontSize="13"
              fill="var(--color-tinta)"
              style={{ fontFamily: "var(--font-tiza)", fontWeight: 600 }}
            >
              en grano
            </text>
            <text
              x="41"
              y="266"
              textAnchor="middle"
              fontSize="13"
              fill="var(--color-tinta)"
              style={{ fontFamily: "var(--font-tiza)", fontWeight: 600 }}
            >
              o molido
            </text>
            <path d="M26 277 Q41 282 56 275" fill="none" stroke="var(--color-rojo)" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>

        {/* Granos sueltos en la mesa */}
        {SUELO.map((g, i) => (
          <use
            key={i}
            href={`#${id("grano")}`}
            transform={`translate(${g.x} ${g.y}) rotate(${g.giro}) scale(${g.escala})`}
          />
        ))}
      </svg>
    </div>
  );
}
