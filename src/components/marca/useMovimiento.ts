"use client";

/**
 * Hooks de la preferencia "Pausar animaciones" (el store está en src/lib/movimiento.ts).
 */

import { useEffect, useLayoutEffect, useSyncExternalStore, type RefObject } from "react";
import {
  ATRIBUTO_FUERA,
  aplicarAtributoMovimiento,
  movimientoPausado,
  suscribirMovimiento,
} from "@/lib/movimiento";

/** En el servidor (y al hidratar) se reproduce: es el default. */
const reproducirEnServidor = () => false;

/** true si la persona pausó las animaciones o pide prefers-reduced-motion. */
export function useMovimientoPausado(): boolean {
  const pausado = useSyncExternalStore(suscribirMovimiento, movimientoPausado, reproducirEnServidor);
  // El script del <head> ya puso el atributo; esto lo repone si React limpió los
  // atributos de <html> (el remount de Strict Mode en desarrollo lo hace).
  useLayoutEffect(() => {
    aplicarAtributoMovimiento();
  }, []);
  return pausado;
}

/**
 * Marca `ref` con data-fuera-de-pantalla mientras no se ve (IntersectionObserver),
 * así globals.css pausa las animaciones CSS de adentro.
 */
export function usePausarFueraDePantalla(ref: RefObject<HTMLElement | null>, margen = "100px") {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting ?? true) el.removeAttribute(ATRIBUTO_FUERA);
        else el.setAttribute(ATRIBUTO_FUERA, "");
      },
      { rootMargin: margen },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute(ATRIBUTO_FUERA);
    };
  }, [ref, margen]);
}
