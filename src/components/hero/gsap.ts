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

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger);

/** Condiciones de gsap.matchMedia() compartidas por todo el hero. */
export const CONDICIONES = {
  movimiento: "(prefers-reduced-motion: no-preference)",
  quieto: "(prefers-reduced-motion: reduce)",
  punteroFino: "(hover: hover) and (pointer: fine)",
} as const;

export type Condiciones = { [K in keyof typeof CONDICIONES]: boolean };

export { gsap, useGSAP, DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger };
