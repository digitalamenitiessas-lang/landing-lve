/**
 * "Pausar animaciones": preferencia global de movimiento (WCAG 2.2.2).
 *
 * - La elige la persona con el botón del hero y queda guardada en localStorage
 *   (con try/catch: en modo privado o con storage bloqueado, vale por la visita).
 * - Por defecto se reproduce. Con prefers-reduced-motion cuenta siempre como pausado.
 * - Mientras está pausado, <html> lleva data-movimiento="pausado": globals.css
 *   frena las animaciones CSS, y el hero frena sus tweens de GSAP y el canvas.
 * - Un script inline en el <head> (SCRIPT_MOVIMIENTO, en layout.tsx) aplica el
 *   atributo antes del primer pintado, así no hay un "arranca y se frena".
 *
 * Store para useSyncExternalStore: movimientoPausado() es el snapshot y
 * suscribirMovimiento() la suscripción. Este módulo no importa hooks de React a
 * propósito: lo usa también el root layout (Server Component). Los hooks
 * (useMovimientoPausado, usePausarFueraDePantalla) están en
 * components/marca/useMovimiento.ts.
 */

const CLAVE = "lve:movimiento";
const ATRIBUTO = "data-movimiento";
const PAUSADO = "pausado";
const CONSULTA_REDUCIR = "(prefers-reduced-motion: reduce)";

/** Atributo que pone usePausarFueraDePantalla() mientras el contenedor no se ve (lo lee globals.css). */
export const ATRIBUTO_FUERA = "data-fuera-de-pantalla";

/**
 * Script inline para el <head>: marca <html> con la clase "js" (la usa la
 * entrada del hero, ver hero.module.css) y aplica la pausa guardada.
 */
export const SCRIPT_MOVIMIENTO = `(function(){var d=document.documentElement;d.classList.add("js");try{if(localStorage.getItem("${CLAVE}")==="${PAUSADO}")d.setAttribute("${ATRIBUTO}","${PAUSADO}")}catch(e){}})()`;

const oyentes = new Set<() => void>();
/** Elección de la persona; null = todavía no se leyó de localStorage. */
let elegido: boolean | null = null;

function pausadoPorUsuario(): boolean {
  if (elegido === null) {
    try {
      elegido = window.localStorage.getItem(CLAVE) === PAUSADO;
    } catch {
      elegido = false;
    }
  }
  return elegido;
}

function reducido(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(CONSULTA_REDUCIR).matches;
}

/** Pone o saca data-movimiento en <html> según la elección guardada. */
export function aplicarAtributoMovimiento() {
  const html = document.documentElement;
  if (pausadoPorUsuario()) html.setAttribute(ATRIBUTO, PAUSADO);
  else html.removeAttribute(ATRIBUTO);
}

/** ¿Hay que quedarse quieto? (elección de la persona o prefers-reduced-motion). */
export function movimientoPausado(): boolean {
  if (typeof window === "undefined") return false;
  return pausadoPorUsuario() || reducido();
}

/** Avisa cuando cambia la elección o prefers-reduced-motion. Devuelve la baja. */
export function suscribirMovimiento(avisar: () => void): () => void {
  const consulta =
    typeof window.matchMedia === "function" ? window.matchMedia(CONSULTA_REDUCIR) : null;
  oyentes.add(avisar);
  consulta?.addEventListener("change", avisar);
  return () => {
    oyentes.delete(avisar);
    consulta?.removeEventListener("change", avisar);
  };
}

export function pausarMovimiento(pausar: boolean) {
  elegido = pausar;
  try {
    if (pausar) window.localStorage.setItem(CLAVE, PAUSADO);
    else window.localStorage.removeItem(CLAVE);
  } catch {
    // Sin storage: la elección vale hasta recargar.
  }
  aplicarAtributoMovimiento();
  for (const avisar of oyentes) avisar();
}
