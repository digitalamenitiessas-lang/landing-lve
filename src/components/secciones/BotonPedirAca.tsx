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
 * Preselecciona la sucursal en el formulario de compra (evento global) y lleva
 * la vista y el foco hasta allá. Si el formulario maneja el evento (preventDefault:
 * ya scrolleó y movió el foco a la sucursal), no hacemos nada más. Si no, bajamos
 * a #cafe y le damos el foco a la sección, así el próximo Tab entra al formulario
 * y el lector de pantalla no se queda en Sucursales.
 * Con prefers-reduced-motion el salto es instantáneo.
 */
export default function BotonPedirAca({ id, className, children }: Props) {
  function pedirAca() {
    const sinManejar = window.dispatchEvent(
      new CustomEvent<DetalleElegirSucursal>(EVENTO_ELEGIR_SUCURSAL, {
        detail: { id },
        cancelable: true,
      }),
    );
    if (!sinManejar) return;
    const destino = document.getElementById("cafe");
    if (!destino) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    destino.scrollIntoView({ behavior: reducir ? "instant" : "smooth", block: "start" });
    if (!destino.hasAttribute("tabindex")) destino.tabIndex = -1;
    destino.focus({ preventScroll: true });
  }

  return (
    <button type="button" onClick={pedirAca} className={clsx("boton boton-rojo", className)}>
      {children}
    </button>
  );
}
