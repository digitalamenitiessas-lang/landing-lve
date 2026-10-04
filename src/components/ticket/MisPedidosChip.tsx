"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { rutaTicket } from "@/lib/tienda/api-landing";
import {
  leerCrudoMisPedidos,
  parsearMisPedidos,
  pedidoActivoDe,
  suscribirMisPedidos,
} from "@/lib/mis-pedidos";

type Props = {
  /** 'claro' = texto claro para fondo verde; 'oscuro' = texto tinta para fondo papel. */
  variante?: "claro" | "oscuro";
  className?: string;
};

/**
 * Chip "Tu pedido WEB-SF-0042" para la navegación: aparece si en este
 * dispositivo hay un pedido pendiente de pago o pagado (de los últimos 7 días).
 * No renderiza nada en el servidor ni en la hidratación.
 */
export default function MisPedidosChip({ variante = "claro", className }: Props) {
  // Snapshot = string crudo del storage (estable); en el servidor, null.
  const crudo = useSyncExternalStore(suscribirMisPedidos, leerCrudoMisPedidos, () => null);
  const pedido = useMemo(() => pedidoActivoDe(parsearMisPedidos(crudo)), [crudo]);

  if (!pedido) return null;

  const pagado = pedido.estado === "pagado";
  const estadoTexto = pagado ? "pagado, listo para retirar" : "pendiente de pago";

  return (
    <Link
      href={rutaTicket(pedido.sucursal, pedido.codigo, pedido.token)}
      prefetch={false}
      className={clsx(
        "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap transition-colors",
        variante === "claro"
          ? "border-tiza/60 bg-white/10 text-tiza hover:border-tiza hover:bg-white/20"
          : "border-tinta bg-papel-claro text-tinta hover:bg-tinta hover:text-papel",
        className,
      )}
    >
      <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
        {!pagado ? (
          <span className="absolute inset-0 rounded-full bg-sol opacity-75 motion-safe:animate-ping" />
        ) : null}
        <span
          className={clsx(
            "relative size-2.5 rounded-full",
            pagado
              ? variante === "claro"
                ? "bg-[#6ee7a8] ring-2 ring-tiza/70"
                : "bg-verde"
              : "bg-sol ring-1 ring-tinta/30",
          )}
        />
      </span>
      <span className="truncate">
        Tu pedido <span className="tabular-nums">{pedido.codigo}</span>
      </span>
      <span className="sr-only">: {estadoTexto}</span>
    </Link>
  );
}
