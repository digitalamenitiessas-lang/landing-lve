import clsx from "clsx";
import { Check, X } from "lucide-react";
import type { VentaPublica } from "@/lib/tienda/contrato";
import { formatFechaHora } from "@/lib/formato";

type Paso = {
  nombre: string;
  fecha: string | null;
  hecho: boolean;
  actual: boolean;
  fallido?: boolean;
};

function pasos(venta: VentaPublica): Paso[] {
  const { estado } = venta;
  if (estado === "cancelado") {
    const cancelado: Paso = {
      nombre: "Cancelado",
      fecha: venta.cancelado_at,
      hecho: false,
      actual: true,
      fallido: true,
    };
    // Si llegó a estar pagado, no lo escondemos: Pedido → Pagado → Cancelado.
    if (venta.pagado_at) {
      return [
        { nombre: "Pedido", fecha: venta.creado_at, hecho: true, actual: false },
        { nombre: "Pagado", fecha: venta.pagado_at, hecho: true, actual: false },
        cancelado,
      ];
    }
    return [
      { nombre: "Pedido", fecha: venta.creado_at, hecho: true, actual: false },
      cancelado,
      { nombre: "Retirado", fecha: null, hecho: false, actual: false },
    ];
  }
  return [
    {
      nombre: "Pedido",
      fecha: venta.creado_at,
      hecho: true,
      actual: estado === "pendiente_pago",
    },
    {
      nombre: "Pagado",
      fecha: venta.pagado_at,
      hecho: estado === "pagado" || estado === "retirado",
      actual: estado === "pagado",
    },
    {
      nombre: "Retirado",
      fecha: venta.retirado_at,
      hecho: estado === "retirado",
      actual: estado === "retirado",
    },
  ];
}

/** Pedido → Pagado → Retirado, como los casilleros de un boletín. */
export default function Progreso({ venta }: { venta: VentaPublica }) {
  const lista = pasos(venta);
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="Estado del pedido">
      {lista.map((paso, i) => (
        <li
          key={paso.nombre}
          aria-current={paso.actual ? "step" : undefined}
          className="relative flex flex-col items-center text-center"
        >
          {i > 0 ? (
            <span
              aria-hidden="true"
              className={clsx(
                "absolute top-4 right-[calc(50%+1.1rem)] left-[calc(-50%+1.1rem)] h-0.5",
                paso.hecho ? "bg-verde" : "border-t-2 border-dashed border-tinta/25",
              )}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={clsx(
              "grid size-8 place-items-center rounded-full border-2 text-sm font-bold",
              paso.fallido
                ? "border-tinta-suave bg-tinta-suave text-papel-claro"
                : paso.hecho
                  ? "border-verde bg-verde text-white"
                  : "border-tinta/30 bg-papel-claro text-tinta-suave",
              paso.actual && !paso.fallido && "ring-4 ring-sol/50",
            )}
          >
            {paso.fallido ? (
              <X className="size-4" strokeWidth={3} />
            ) : paso.hecho ? (
              <Check className="size-4" strokeWidth={3} />
            ) : (
              i + 1
            )}
          </span>
          <span
            className={clsx(
              "mt-1.5 text-sm leading-tight font-bold",
              paso.hecho || paso.actual ? "text-tinta" : "text-tinta-suave",
            )}
          >
            {paso.nombre}
            <span className="sr-only">
              {paso.fallido ? "" : paso.hecho ? " (hecho)" : " (falta)"}
            </span>
          </span>
          <span className="mt-0.5 min-h-[2.5em] text-xs leading-tight text-tinta-suave">
            {paso.fecha ? (
              <time dateTime={paso.fecha}>{formatFechaHora(paso.fecha)}</time>
            ) : paso.hecho || paso.fallido ? null : (
              "—"
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
