"use client";

import { useRef, type ReactNode } from "react";
import { usePausarFueraDePantalla } from "./useMovimiento";

/**
 * <div> que pausa las animaciones CSS de sus hijos mientras no se ve
 * (data-fuera-de-pantalla + regla de globals.css). Los hijos pueden ser Server Components.
 */
export default function PausaFueraDePantalla({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePausarFueraDePantalla(ref);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
