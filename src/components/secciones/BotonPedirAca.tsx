"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import type { SucursalId } from "@/config/sucursales";
import { EVENTO_ELEGIR_SUCURSAL, type DetalleElegirSucursal } from "@/lib/tienda/api-landing";

type Props = {
  id: SucursalId;
  className?: string;
  children: ReactNode;
};

/**
 * Preselecciona la sucursal en el formulario de compra (evento global) y baja a #cafe.
 * Con prefers-reduced-motion el salto es instantáneo.
 */
export default function BotonPedirAca({ id, className, children }: Props) {
  function pedirAca() {
    window.dispatchEvent(
      new CustomEvent<DetalleElegirSucursal>(EVENTO_ELEGIR_SUCURSAL, { detail: { id } }),
    );
    const destino = document.getElementById("cafe");
    if (!destino) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    destino.scrollIntoView({ behavior: reducir ? "instant" : "smooth", block: "start" });
  }

  return (
    <button type="button" onClick={pedirAca} className={clsx("boton boton-rojo", className)}>
      {children}
    </button>
  );
}
