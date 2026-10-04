"use client";

/**
 * HERO "PIZARRÓN VIVO" — lo primero que se ve de La Vieja Escuela.
 *
 * Capas (de atrás para adelante):
 *  0. .pizarra (fondo + grano) y el canvas de polvo / rastro de tiza
 *  1. Banderines celestes y blancos (2 filas) con parallax al puntero
 *  2. Arte: Sol de Mayo tenue girando, la taza de tiza, vapor, granos,
 *     la anotación "tarea para el hogar" y el afiche de la dirección
 *  3. Texto: kicker, h1, bajada y CTAs (HTML real)
 *  4. Repisa del pizarrón e indicador de scroll
 *
 * Movimiento con GSAP (gsap.matchMedia):
 *  - entrada (~2.5 s) que dibuja todo; el estado inicial oculto lo pone CSS
 *    (hero.module.css) para que no haya flash entre el SSR y la hidratación;
 *  - parallax al puntero (solo mouse/lápiz) y vapor que se aleja del puntero;
 *  - ScrollTrigger: al salir, el texto sube más rápido que la taza y se apaga;
 *  - prefers-reduced-motion: todo dibujado y quieto, sin canvas.
 */

import clsx from "clsx";
import { useRef } from "react";
import Banderines from "@/components/marca/Banderines";
import SolDeMayo from "@/components/marca/SolDeMayo";
import AficheDireccion from "./AficheDireccion";
import AnotacionTiza from "./AnotacionTiza";
import GranosTiza from "./GranosTiza";
import IndicadorScroll from "./IndicadorScroll";
import PolvoDeTiza from "./PolvoDeTiza";
import RepisaTiza from "./RepisaTiza";
import SubrayadoTiza from "./SubrayadoTiza";
import TazaTiza from "./TazaTiza";
import Vapor from "./Vapor";
import { CONDICIONES, gsap, useGSAP } from "./gsap";
import styles from "./hero.module.css";
import { ARTE_ANCHO, BOCA_TAZA } from "./trazos";

/**
 * Si la hidratación llega tarde (red lenta), no repetimos la entrada: el
 * contenido ya se mostró por la red de seguridad de CSS (3 s) o está por
 * mostrarse, y volver a ocultarlo para animarlo sería peor que no animarlo.
 */
const ENTRADA_HASTA_MS = 2600;

/**
 * El texto (kicker, h1, bajada y CTAs) entra con CSS desde el primer pintado,
 * sin esperar a que hidrate React: es el contenido principal (LCP) y no puede
 * quedar invisible en un celular lento. GSAP anima solo los dibujos.
 */
const retraso = (segundos: number) => ({ "--retraso": `${segundos}s` }) as React.CSSProperties;

function Palabra({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <span data-css="palabra" style={retraso(0.18 + i * 0.085)} className="inline-block">
      {children}
    </span>
  );
}

export default function Hero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const raiz = scope.current;
      if (!raiz) return;
      const q = gsap.utils.selector(raiz);
      const mm = gsap.matchMedia();

      /* ---------------------------------------------- entrada + scroll */
      mm.add(CONDICIONES.movimiento, () => {
        if (performance.now() > ENTRADA_HASTA_MS) {
          gsap.set(q("[data-entra]"), { visibility: "visible" });
        } else {
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          const dibujar = (sel: string, en: number, duracion: number, escalonar: number) =>
            tl.fromTo(
              q(`[data-trazo="${sel}"]`),
              { drawSVG: "0%" },
              { drawSVG: "100%", duration: duracion, stagger: escalonar, ease: "power1.inOut" },
              en,
            );

          tl.from(
            q('[data-entra="banderines"]'),
            { yPercent: -70, autoAlpha: 0, duration: 1.1, ease: "back.out(1.5)" },
            0,
          )
            .from(q('[data-entra="repisa"]'), { autoAlpha: 0, y: 14, duration: 0.6 }, 0.05)
            .from(
              q('[data-entra="sol"]'),
              { autoAlpha: 0, scale: 0.82, rotation: -25, duration: 1.6, ease: "power2.out" },
              0.15,
            );

          // La taza se dibuja: plato → cuerpo → asa → borde → café
          tl.set(q('[data-entra="taza"]'), { autoAlpha: 1 }, 0.4);
          dibujar("plato", 0.4, 0.6, 0.07);
          dibujar("cuerpo", 0.75, 0.65, 0.06);
          dibujar("asa", 1.15, 0.45, 0.12);
          dibujar("borde", 1.35, 0.5, 0);
          dibujar("cafe", 1.6, 0.45, 0.06);
          tl.from(q('[data-relleno="cafe"]'), { opacity: 0, duration: 0.6, ease: "power1.out" }, 1.65);

          // Subrayado de "café" (el texto ya entró por CSS)
          tl.set(q('[data-entra="subrayado"]'), { autoAlpha: 1 }, 0.9);
          dibujar("subrayado", 0.9, 0.4, 0.16);

          // Vapor, granos y afiche
          tl.from(q('[data-entra="vapor"]'), { autoAlpha: 0, y: 24, duration: 1.2, ease: "power2.out" }, 1.75)
            .from(
              q('[data-entra="grano"]'),
              {
                autoAlpha: 0,
                scale: 0,
                rotation: -60,
                duration: 0.6,
                stagger: { each: 0.06, from: "random" },
                ease: "back.out(2)",
              },
              1.6,
            )
            .from(
              q('[data-entra="afiche"]'),
              { autoAlpha: 0, y: -26, rotation: -7, duration: 0.8, ease: "back.out(1.4)" },
              1.45,
            );

          // La anotación se escribe renglón por renglón y la flecha apunta a la taza
          tl.set(q('[data-entra="anotacion"]'), { autoAlpha: 1 }, 1.55)
            .fromTo(
              q("[data-renglon]"),
              { clipPath: "inset(-25% 100% -25% 0%)" },
              {
                clipPath: "inset(-25% 0% -25% 0%)",
                duration: 0.6,
                stagger: 0.55,
                ease: "power1.inOut",
                clearProps: "clipPath",
              },
              1.55,
            )
            .set(q('[data-entra="flecha"]'), { autoAlpha: 1 }, 2.1);
          dibujar("flecha", 2.1, 0.35, 0.3);
          tl.from(q('[data-entra="bajar"]'), { autoAlpha: 0, y: -10, duration: 0.6 }, 2.2);
        }

        // Parallax de salida: el texto sube más rápido que la taza y se apaga
        const salida = { trigger: raiz, start: "top top", end: "bottom top", scrub: 0.4 };
        gsap.to(q('[data-scroll="texto"]'), {
          y: -110,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: salida,
        });
        gsap.to(q('[data-scroll="arte"]'), { y: -36, ease: "none", scrollTrigger: { ...salida } });
      });

      /* ---------------------------------------------- puntero */
      mm.add(`${CONDICIONES.movimiento} and ${CONDICIONES.punteroFino}`, () => {
        const capas = q("[data-parallax]").map((el) => {
          const prof = Number((el as HTMLElement).dataset.parallax) || 0;
          return {
            prof,
            x: gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" }),
          };
        });

        const vapor = raiz.querySelector<SVGGElement>("[data-vapor-inclina]");
        const taza = raiz.querySelector<HTMLElement>("[data-ancla-taza]");
        let inclinar: ((v: number) => void) | null = null;
        if (vapor) {
          gsap.set(vapor, { svgOrigin: `${BOCA_TAZA.x} ${BOCA_TAZA.y}` });
          inclinar = gsap.quickTo(vapor, "rotation", { duration: 1.6, ease: "power2.out" });
        }

        const alMover = (e: PointerEvent) => {
          if (e.pointerType === "touch") return;
          const r = raiz.getBoundingClientRect();
          const nx = gsap.utils.clamp(-1, 1, ((e.clientX - r.left) / r.width) * 2 - 1);
          const ny = gsap.utils.clamp(-1, 1, ((e.clientY - r.top) / r.height) * 2 - 1);
          for (const c of capas) {
            c.x(nx * c.prof);
            c.y(ny * c.prof * 0.6);
          }
          if (inclinar && taza) {
            const t = taza.getBoundingClientRect();
            const centro = t.left + t.width * (BOCA_TAZA.x / ARTE_ANCHO);
            const dx = gsap.utils.clamp(-1, 1, (e.clientX - centro) / (r.width * 0.35));
            // El vapor se aleja del puntero
            inclinar(-dx * 9);
          }
        };
        const alSalir = () => {
          for (const c of capas) {
            c.x(0);
            c.y(0);
          }
          inclinar?.(0);
        };

        raiz.addEventListener("pointermove", alMover, { passive: true });
        raiz.addEventListener("pointerleave", alSalir, { passive: true });
        return () => {
          raiz.removeEventListener("pointermove", alMover);
          raiz.removeEventListener("pointerleave", alSalir);
        };
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      id="inicio"
      aria-labelledby="hero-titulo"
      className={clsx(
        styles.hero,
        "pizarra relative flex min-h-[max(640px,100svh)] flex-col overflow-hidden",
      )}
    >
      {/* 0. Polvo de tiza + rastro del puntero */}
      <PolvoDeTiza className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      {/* 1. Banderines */}
      <div
        data-entra="banderines"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[58px] z-[2] text-tiza lg:top-[64px]"
      >
        <div data-parallax="-7">
          <Banderines filas={2} className="h-[72px] sm:h-[92px] lg:h-[112px]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-rows-[auto_1fr] gap-y-3 px-4 pt-[136px] pb-[40px] sm:px-8 sm:pt-[160px] lg:grid-cols-[55fr_45fr] lg:grid-rows-1 lg:items-center lg:gap-x-8 lg:px-12 lg:pt-[180px] lg:pb-[60px]">
        {/* 3. Texto */}
        <div data-scroll="texto" className="relative z-10 max-w-[40rem] lg:max-w-none">
          <p
            data-css="kicker"
            style={retraso(0.05)}
            className="a-mano text-[1.2rem] text-sol min-[400px]:text-[1.3rem] sm:text-2xl lg:text-[1.7rem]"
          >
            Neobodegón norteño · San Miguel de Tucumán
          </p>
          <h1
            id="hero-titulo"
            className="titulo-afiche mt-2 text-[clamp(3.4rem,min(14.6vw,12.5svh),8.5rem)] text-tiza lg:mt-3 lg:text-[clamp(4rem,min(8.4vw,12.5svh),8.5rem)]"
          >
            <span className="block">
              <Palabra i={0}>Buenas</Palabra> <Palabra i={1}>costumbres</Palabra>
            </span>
            <span className="block">
              <Palabra i={2}>y</Palabra> <Palabra i={3}>rico</Palabra>{" "}
              <span className="relative inline-block">
                <Palabra i={4}>café.</Palabra>
                <SubrayadoTiza />
              </span>
            </span>
          </h1>
          <p
            data-css="bajada"
            style={retraso(0.6)}
            className="mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-tiza/85 sm:text-lg lg:mt-7 lg:text-xl"
          >
            Llevate a casa el café de La Vieja Escuela: pedí tu 1/4&nbsp;kg en grano o molido,
            transferí y retiralo en tu sucursal.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3 lg:mt-8">
            {/* Se anima el wrapper: .boton tiene transición de transform propia */}
            <span data-css="cta" style={retraso(0.75)} className="inline-flex">
              <a href="#cafe" className="boton boton-rojo px-4 text-[0.95rem] sm:px-6 sm:text-base">
                Pedí tu 1/4 de café
              </a>
            </span>
            <span data-css="cta" style={retraso(0.85)} className="inline-flex">
              <a
                href="#sucursales"
                className="boton boton-tiza px-4 text-[0.95rem] sm:px-6 sm:text-base"
              >
                Ver sucursales
              </a>
            </span>
          </div>
        </div>

        {/* 2. Arte */}
        <div
          data-scroll="arte"
          className="relative z-[1] min-h-[clamp(200px,28svh,400px)] [container-type:size] lg:h-[min(70svh,620px)] lg:min-h-0"
        >
          <div className="absolute inset-0 flex items-end justify-center lg:items-center">
            <div className="@container relative aspect-[600/560] shrink-0 w-[min(100cqw,calc(100cqh*600/560))] lg:w-[min(116cqw,calc(100cqh*600/560))]">
              {/* Sol de Mayo grande y tenue, centrado detrás de la taza */}
              <div
                data-parallax="-10"
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-[6.7%] aspect-square w-[110%]"
              >
                <div data-entra="sol" className="h-full w-full">
                  <SolDeMayo girar className="h-full w-full text-tiza opacity-[0.13]" />
                </div>
              </div>

              {/* Taza + vapor + anotación se mueven juntos (la flecha encastra) */}
              <div data-parallax="6" data-ancla-taza="" className="absolute inset-0">
                <TazaTiza className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" />
                <Vapor className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" />
                <AnotacionTiza />
              </div>

              <GranosTiza />

              <AficheDireccion className="absolute top-0 left-[-7%] z-[3] hidden lg:block" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Repisa e indicador de scroll */}
      <RepisaTiza />
      <IndicadorScroll className="absolute bottom-[20px] left-4 z-[3] sm:left-8 lg:left-1/2 lg:-translate-x-1/2" />
    </section>
  );
}
