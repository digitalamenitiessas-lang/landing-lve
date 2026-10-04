"use client";

/**
 * Registro único de plugins de GSAP para el hero.
 * Importá { gsap, useGSAP, ... } desde acá en vez de "gsap" directo, así los
 * plugins quedan registrados antes de cualquier tween.
 */

import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { movimientoPausado, suscribirMovimiento } from "@/lib/movimiento";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger);

/** Condiciones de gsap.matchMedia() compartidas por todo el hero. */
export const CONDICIONES = {
  movimiento: "(prefers-reduced-motion: no-preference)",
  quieto: "(prefers-reduced-motion: reduce)",
  punteroFino: "(hover: hover) and (pointer: fine)",
} as const;

export type Condiciones = { [K in keyof typeof CONDICIONES]: boolean };

/**
 * Pausa los tweens infinitos de `el` cuando no se ve (IntersectionObserver,
 * que siempre avisa una primera vez) o cuando la persona pausa las animaciones
 * (src/lib/movimiento.ts). Así el ticker de GSAP puede dormirse fuera del hero.
 * Devolvé el resultado desde mm.add(): mm.revert() lo limpia.
 */
export function pausarCuandoNoSeVe(el: Element | null, tweens: gsap.core.Animation[]) {
  let enPantalla = true;
  const aplicar = () => {
    const quieto = !enPantalla || movimientoPausado();
    for (const t of tweens) t.paused(quieto);
  };
  const io =
    el && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entrada]) => {
          enPantalla = entrada?.isIntersecting ?? true;
          aplicar();
        })
      : null;
  if (el) io?.observe(el);
  const desuscribir = suscribirMovimiento(aplicar);
  aplicar();
  return () => {
    io?.disconnect();
    desuscribir();
  };
}

export { gsap, useGSAP, DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger };
