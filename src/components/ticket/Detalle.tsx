import type { VentaPublica } from "@/lib/tienda/contrato";
import { formatPesos } from "@/lib/formato";

/** Lo que se pidió, como una lista de útiles. */
export default function Detalle({ venta }: { venta: VentaPublica }) {
  return (
    <section aria-labelledby="titulo-detalle" className="atenuable mt-8">
      <h2 id="titulo-detalle" className="a-mano text-2xl text-verde">
        Tu pedido
      </h2>
      <ul className="mt-2 divide-y divide-dashed divide-tinta/20 border-y border-dashed border-tinta/20">
        {venta.items.map((item, i) => (
          <li key={`${item.nombre}-${i}`} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="font-semibold">
                <span className="tabular-nums">{item.cantidad}</span>
                {" × "}
                {item.nombre}
              </p>
              {item.detalle ? <p className="text-sm text-tinta-suave">{item.detalle}</p> : null}
            </div>
            <p className="shrink-0 font-semibold tabular-nums">{formatPesos(item.subtotal)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between gap-3">
        <span className="titulo-afiche text-2xl">Total</span>
        <span className="titulo-afiche text-3xl text-verde tabular-nums">
          {formatPesos(venta.total)}
        </span>
      </p>
    </section>
  );
}
