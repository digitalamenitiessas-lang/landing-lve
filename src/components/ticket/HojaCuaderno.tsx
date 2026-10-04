import Image from "next/image";
import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Hoja del cuaderno de comunicaciones: renglones celestes tenues, margen rojo y
 * el encabezado escrito a mano. Server-safe (no usa hooks).
 */
const RENGLONES = {
  backgroundImage: [
    // margen rojo (doble línea, como los cuadernos Rivadavia)
    "linear-gradient(to right, transparent calc(var(--margen) - 4px), rgb(214 64 44 / 0.45) calc(var(--margen) - 4px), rgb(214 64 44 / 0.45) calc(var(--margen) - 3px), transparent calc(var(--margen) - 3px), transparent var(--margen), rgb(214 64 44 / 0.45) var(--margen), rgb(214 64 44 / 0.45) calc(var(--margen) + 1px), transparent calc(var(--margen) + 1px))",
    // renglones
    "repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.75rem - 1px), rgb(125 179 227 / 0.32) calc(1.75rem - 1px), rgb(125 179 227 / 0.32) 1.75rem)",
  ].join(", "),
  backgroundPosition: "0 0, 0 4.5rem",
};

type Props = {
  children: ReactNode;
  /** Subtítulo del encabezado: "Sucursal Santa Fe 746" */
  subtitulo?: ReactNode;
  className?: string;
  /** Pedido cancelado: lo marcado con .atenuable se ve gris y apagado. */
  atenuada?: boolean;
  /** aria-label del <article>. */
  etiqueta?: string;
};

export default function HojaCuaderno({
  children,
  subtitulo,
  className,
  atenuada,
  etiqueta,
}: Props) {
  return (
    <article
      aria-label={etiqueta}
      className={clsx(
        "relative mx-auto w-full max-w-xl overflow-hidden rounded-sm bg-papel-claro text-tinta",
        "shadow-[0_1px_0_rgb(30_26_21/0.08),0_14px_30px_-12px_rgb(30_26_21/0.35)]",
        "[--margen:1.6rem] sm:[--margen:3.25rem]",
        className,
      )}
      style={RENGLONES}
    >
      {/* borde superior de la hoja, con los agujeritos del espiral */}
      <div
        aria-hidden="true"
        className="flex h-4 items-center justify-around bg-papel-oscuro/60 px-6"
      >
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="size-2 rounded-full bg-tinta/20 shadow-inner" />
        ))}
      </div>

      <div
        className={clsx(
          "pt-4 pr-4 pb-8 pl-[calc(var(--margen)+0.85rem)] sm:pr-8",
          atenuada && "[&_.atenuable]:opacity-60 [&_.atenuable]:grayscale",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b-2 border-double border-rojo/40 pb-2">
          <div className="min-w-0">
            <p className="a-mano text-2xl text-verde sm:text-3xl">Cuaderno de comunicaciones</p>
            {subtitulo ? (
              <p className="mt-0.5 text-sm font-semibold text-tinta-suave">{subtitulo}</p>
            ) : null}
          </div>
          <Image
            src="/marca/logo-verde.png"
            alt=""
            width={607}
            height={416}
            className="h-10 w-auto shrink-0 sm:h-12"
          />
        </header>
        {children}
      </div>
    </article>
  );
}
