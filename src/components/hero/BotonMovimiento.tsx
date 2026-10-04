"use client";

/**
 * Botón "Pausar animaciones" (WCAG 2.2.2): frena el vapor, los granos, el polvo,
 * los banderines, el sol, la marquesina y demás bucles de toda la página.
 * Es un toggle: el nombre no cambia y el estado lo dice aria-pressed.
 * Con prefers-reduced-motion no se muestra: ya está todo quieto.
 */

import clsx from "clsx";
import { Pause, Play } from "lucide-react";
import { useMovimientoPausado } from "@/components/marca/useMovimiento";
import { pausarMovimiento } from "@/lib/movimiento";

export default function BotonMovimiento({ className }: { className?: string }) {
  const pausado = useMovimientoPausado();

  return (
    <button
      type="button"
      aria-pressed={pausado}
      onClick={() => pausarMovimiento(!pausado)}
      title={pausado ? "Reanudar animaciones" : "Pausar animaciones"}
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border-2 px-2.5 text-sm font-semibold transition-colors motion-reduce:hidden sm:px-3.5",
        pausado
          ? "border-tiza bg-tiza text-pizarra hover:bg-tiza/85"
          : "border-tiza/60 bg-pizarra-oscura/50 text-tiza hover:border-tiza hover:bg-tiza/10",
        className,
      )}
    >
      {pausado ? (
        <Play className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Pause className="size-4 shrink-0" aria-hidden="true" />
      )}
      {/* En mobile queda solo el ícono (la repisa ocupa la esquina); el nombre siempre está */}
      <span className="sr-only sm:not-sr-only">Pausar animaciones</span>
    </button>
  );
}
