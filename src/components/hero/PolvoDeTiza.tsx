"use client";

/**
 * Canvas a pantalla completa del hero:
 *  (a) polvo de tiza ambiental: partículas que derivan lento y titilan;
 *  (b) el puntero deja un rastro de tiza granulado que se borra en ~1.2 s,
 *      como pasar la tiza por el pizarrón. En táctil el dedo también dibuja
 *      al arrastrar, con listeners pasivos (sin preventDefault: el scroll sigue).
 *
 * Un solo requestAnimationFrame, que se pausa cuando el hero no se ve
 * (IntersectionObserver) o la pestaña está oculta. DPR máximo 2. Resize con
 * ResizeObserver. Con prefers-reduced-motion no dibuja nada.
 *
 * Escucha los eventos del elemento padre (la <section> del hero), así el
 * canvas puede ser pointer-events: none y no tapa links ni botones.
 */

import { useEffect, useRef } from "react";

const COLOR = "245, 242, 234"; // tiza
const VIDA_RASTRO = 1200; // ms
const MAX_GRANOS = 3200;
const CAMPOS = 5; // x, y, tamaño, alfa inicial, nacimiento

type Mota = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  fase: number;
  vel: number;
};

export default function PolvoDeTiza({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");

    let ancho = 0;
    let alto = 0;
    let dpr = 1;
    let raf = 0;
    let enPantalla = true;
    let ultimoFrame = 0;

    // Polvo ambiental
    let motas: Mota[] = [];
    const sembrarPolvo = () => {
      const cantidad = ancho < 640 ? 28 : ancho < 1100 ? 38 : 48;
      motas = Array.from({ length: cantidad }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.012,
        vy: -0.004 - Math.random() * 0.01,
        r: 0.5 + Math.random() * 1.4,
        a: 0.08 + Math.random() * 0.26,
        fase: Math.random() * Math.PI * 2,
        vel: 0.0006 + Math.random() * 0.0012,
      }));
    };

    // Rastro: buffer circular de granos en un Float32Array (sin basura por frame)
    const granos = new Float32Array(MAX_GRANOS * CAMPOS);
    let cabeza = 0;
    let vivos = 0;
    const agregarGrano = (x: number, y: number, tam: number, alfa: number, t: number) => {
      const i = cabeza * CAMPOS;
      granos[i] = x;
      granos[i + 1] = y;
      granos[i + 2] = tam;
      granos[i + 3] = alfa;
      granos[i + 4] = t;
      cabeza = (cabeza + 1) % MAX_GRANOS;
      if (vivos < MAX_GRANOS) vivos++;
    };

    // Trazo actual
    let ultimoX = 0;
    let ultimoY = 0;
    let ultimoT = -Infinity;

    const trazar = (clientX: number, clientY: number, radio: number) => {
      if (raf === 0) return; // pausado: no acumulamos
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const ahora = performance.now();
      const continua = ahora - ultimoT < 90;
      const x0 = continua ? ultimoX : x;
      const y0 = continua ? ultimoY : y;
      const dx = x - x0;
      const dy = y - y0;
      const dist = Math.hypot(dx, dy);
      const pasos = Math.max(1, Math.ceil(dist / 2.2));
      // Más rápido = la tiza "saltea" (menos granos por paso)
      const porPaso = dist / pasos > 1.6 && dist > 40 ? 2 : 3;
      for (let p = 1; p <= pasos; p++) {
        const k = p / pasos;
        const cx = x0 + dx * k;
        const cy = y0 + dy * k;
        for (let g = 0; g < porPaso; g++) {
          // Distribución más densa al centro del trazo
          const ang = Math.random() * Math.PI * 2;
          const rr = radio * Math.sqrt(Math.random()) * (Math.random() < 0.8 ? 0.7 : 1.2);
          agregarGrano(
            cx + Math.cos(ang) * rr,
            cy + Math.sin(ang) * rr,
            0.6 + Math.random() * 1.3,
            0.22 + Math.random() * 0.5,
            ahora,
          );
        }
      }
      ultimoX = x;
      ultimoY = y;
      ultimoT = ahora;
    };

    const alMoverPuntero = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // lo maneja touchmove
      trazar(e.clientX, e.clientY, 3);
    };
    const alSalirPuntero = () => {
      ultimoT = -Infinity;
    };
    const alTocar = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (e.type === "touchstart") ultimoT = -Infinity;
      trazar(t.clientX, t.clientY, 4);
    };

    const dibujar = (t: number) => {
      const dt = Math.min(48, ultimoFrame ? t - ultimoFrame : 16);
      ultimoFrame = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      ctx.fillStyle = `rgb(${COLOR})`;

      // Polvo
      for (const m of motas) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.x < -4) m.x = ancho + 4;
        else if (m.x > ancho + 4) m.x = -4;
        if (m.y < -4) {
          m.y = alto + 4;
          m.x = Math.random() * ancho;
        }
        ctx.globalAlpha = m.a * (0.65 + 0.35 * Math.sin(t * m.vel + m.fase));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rastro
      if (vivos > 0) {
        let quedan = 0;
        for (let n = 0; n < vivos; n++) {
          const idx = ((cabeza - 1 - n + MAX_GRANOS) % MAX_GRANOS) * CAMPOS;
          const edad = t - granos[idx + 4];
          if (edad >= VIDA_RASTRO) break; // los más viejos están al final
          const vida = 1 - edad / VIDA_RASTRO;
          ctx.globalAlpha = granos[idx + 3] * vida * vida;
          const tam = granos[idx + 2];
          ctx.fillRect(granos[idx] - tam / 2, granos[idx + 1] - tam / 2, tam, tam);
          quedan++;
        }
        vivos = quedan;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(dibujar);
    };

    const arrancar = () => {
      if (raf !== 0 || reducido.matches || !enPantalla || document.hidden) return;
      ultimoFrame = 0;
      raf = requestAnimationFrame(dibujar);
    };
    const parar = () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
    };
    const limpiar = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      vivos = 0;
    };

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      const nuevoAncho = Math.round(r.width);
      const nuevoAlto = Math.round(r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const cambioMucho = Math.abs(nuevoAncho - ancho) > 80 || motas.length === 0;
      ancho = nuevoAncho;
      alto = nuevoAlto;
      canvas.width = Math.max(1, Math.round(ancho * dpr));
      canvas.height = Math.max(1, Math.round(alto * dpr));
      if (cambioMucho) sembrarPolvo();
    };

    const ro = new ResizeObserver(() => medir());
    ro.observe(canvas);
    medir();

    const io = new IntersectionObserver(
      ([entrada]) => {
        enPantalla = entrada?.isIntersecting ?? true;
        if (enPantalla) arrancar();
        else parar();
      },
      { threshold: 0 },
    );
    io.observe(host);

    const alCambiarVisibilidad = () => {
      if (document.hidden) parar();
      else arrancar();
    };
    const alCambiarMovimiento = () => {
      if (reducido.matches) {
        parar();
        limpiar();
      } else arrancar();
    };

    host.addEventListener("pointermove", alMoverPuntero, { passive: true });
    host.addEventListener("pointerleave", alSalirPuntero, { passive: true });
    host.addEventListener("touchstart", alTocar, { passive: true });
    host.addEventListener("touchmove", alTocar, { passive: true });
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    reducido.addEventListener("change", alCambiarMovimiento);

    arrancar();

    return () => {
      parar();
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", alMoverPuntero);
      host.removeEventListener("pointerleave", alSalirPuntero);
      host.removeEventListener("touchstart", alTocar);
      host.removeEventListener("touchmove", alTocar);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      reducido.removeEventListener("change", alCambiarMovimiento);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
