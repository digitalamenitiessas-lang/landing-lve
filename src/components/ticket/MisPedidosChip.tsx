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
      // Sin #t=: el token ya está en este dispositivo (de ahí sale el chip). Con un
      // fragmento, Next no vuelve arriba al navegar y el ticket abre a mitad de página.
      href={rutaTicket(pedido.sucursal, pedido.codigo)}
      prefetch={false}
      className={clsx(
        "inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap transition-colors",
        // Tope propio en mobile (logo + menú ≈ 10rem) para que el texto se trunque
        // aunque el contenedor de la Nav no se achique: nunca empuja el botón de menú.
        "max-md:max-w-[calc(100vw-10rem)]",
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
        {/* En pantallas angostas se ve solo el código (lo útil); el resto queda para lectores. */}
        <span className="max-[379px]:sr-only">Tu pedido </span>
        <span className="tabular-nums">{pedido.codigo}</span>
      </span>
      <span className="sr-only">: {estadoTexto}</span>
    </Link>
  );
}
