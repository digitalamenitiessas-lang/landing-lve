"use client";

import { useRef } from "react";
import clsx from "clsx";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { EstadoVenta } from "@/lib/tienda/contrato";

gsap.registerPlugin(useGSAP);

type Tinta = { texto: string; sub?: string; color: string };

/** Lo que dice el sello y con qué tinta. Colores con contraste AA sobre el papel. */
export const SELLOS: Record<EstadoVenta, Tinta> = {
  pendiente_pago: { texto: "Pendiente de pago", color: "#9a5a00" }, // sol oscuro
  pagado: { texto: "Pagado", color: "var(--color-verde)" },
  retirado: { texto: "¡Presente!", sub: "retirado", color: "var(--color-rojo-oscuro)" },
  cancelado: { texto: "Cancelado", color: "var(--color-tinta-suave)" },
};

type Props = { estado: EstadoVenta; className?: string };

/**
 * Sello de goma: borde doble, tinta gastada (el grano de --grano tapa la tinta
 * con puntitos de papel) y un golpe cada vez que cambia el estado.
 * La rotación de -8° es estática (CSS); GSAP anima un envoltorio interno.
 */
export default function Sello({ estado, className }: Props) {
  const golpe = useRef<HTMLDivElement>(null);
  const tinta = SELLOS[estado];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline()
          .fromTo(
            golpe.current,
            { scale: 1.4, rotate: 7, opacity: 0, y: -10 },
            { scale: 1, rotate: 0, opacity: 1, y: 0, duration: 0.26, ease: "power4.in" },
          )
          .to(golpe.current, { scale: 0.96, duration: 0.07, ease: "power1.out" })
          .to(golpe.current, { scale: 1, duration: 0.18, ease: "back.out(3)" });
      });
      return () => mm.revert();
    },
    { dependencies: [estado], revertOnUpdate: true },
  );

  return (
    <div className={clsx("-rotate-[8deg] select-none", className)}>
      <div ref={golpe} className="will-change-transform">
        <div
          className="relative isolate inline-flex max-w-[11rem] flex-col items-center rounded-md border-[6px] border-double px-3 py-1.5 text-center"
          style={{ color: tinta.color, borderColor: "currentColor" }}
        >
          <span className="titulo-afiche text-[1.7rem] leading-[0.95] tracking-wide">
            {tinta.texto}
          </span>
          {tinta.sub ? (
            <span className="mt-0.5 font-sans text-xs font-extrabold tracking-[0.3em] uppercase">
              {tinta.sub}
            </span>
          ) : null}
          {/* Tinta gastada: puntitos del color del papel encima del sello */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 bg-papel-claro opacity-90"
            style={{
              WebkitMaskImage: "var(--grano)",
              maskImage: "var(--grano)",
              WebkitMaskSize: "180px",
              maskSize: "180px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
