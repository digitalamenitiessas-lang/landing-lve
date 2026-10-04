import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { INSTAGRAM_URL, type Sucursal } from "@/config/sucursales";
import type { VentaPublica } from "@/lib/tienda/contrato";
import { formatFechaHora } from "@/lib/formato";
import { linkWhatsApp } from "@/lib/whatsapp";
import { IconoInstagram, IconoWhatsApp } from "./iconos";

/**
 * Bloque de retiro con el formato de los afiches: "GUARDATE ESTA DIRECCIÓN" y la
 * dirección tal como figura en ellos (sucursal.direccion). Lo que cargue la
 * sucursal en su sistema (retiro.direccion) solo se agrega como referencia si dice
 * algo distinto, nunca la reemplaza.
 */
export function AficheDireccion({ venta, sucursal }: { venta: VentaPublica; sucursal: Sucursal }) {
  const { retiro } = venta;
  const referencia = retiro.direccion?.trim();
  const mostrarReferencia =
    referencia && normalizar(referencia) !== normalizar(sucursal.direccion) ? referencia : null;

  return (
    <div className="rounded-xl border-2 border-tinta/15 bg-papel p-4 text-center shadow-[0_2px_0_rgb(30_26_21/0.06)]">
      <p className="titulo-afiche text-2xl text-rojo-oscuro">Guardate esta dirección</p>
      <p className="titulo-afiche mt-2 text-[clamp(2.2rem,11vw,3.25rem)] text-verde">
        {sucursal.direccion}
      </p>
      <p className="mt-1 text-sm font-semibold tracking-wide text-tinta-suave uppercase">
        {sucursal.ciudad}
      </p>
      {mostrarReferencia ? (
        <p className="mt-2 text-base">
          <span className="font-semibold text-tinta-suave">Referencia: </span>
          {mostrarReferencia}
        </p>
      ) : null}

      {retiro.horario?.trim() || retiro.indicaciones?.trim() ? (
        <dl className="mx-auto mt-4 max-w-sm space-y-2 text-left text-base">
          {retiro.horario?.trim() ? (
            <div className="flex gap-2">
              <dt>
                <Clock className="mt-0.5 size-5 text-verde" aria-hidden="true" />
                <span className="sr-only">Horario de retiro</span>
              </dt>
              <dd>
                <span className="font-semibold">Horario de retiro:</span> {retiro.horario}
              </dd>
            </div>
          ) : null}
          {retiro.indicaciones?.trim() ? (
            <div className="flex gap-2">
              <dt>
                <MapPin className="mt-0.5 size-5 text-verde" aria-hidden="true" />
                <span className="sr-only">Indicaciones</span>
              </dt>
              <dd>{retiro.indicaciones}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <a
        href={sucursal.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="boton boton-tinta mt-4 w-full bg-papel-claro sm:w-auto"
      >
        <MapPin className="size-5" aria-hidden="true" />
        Cómo llegar
        <span className="sr-only"> (se abre Google Maps)</span>
      </a>
    </div>
  );
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

export function EstadoPagado({ venta, sucursal }: { venta: VentaPublica; sucursal: Sucursal }) {
  return (
    <section aria-labelledby="titulo-pagado" className="mt-8">
      <h2 id="titulo-pagado" className="titulo-afiche text-4xl text-verde sm:text-5xl">
        ¡Listo, ya está pago!
      </h2>
      <p className="a-mano mt-1 text-2xl text-tinta-suave">
        Tu café te espera en la sucursal {sucursal.nombre}.
      </p>
      <div className="mt-5">
        <AficheDireccion venta={venta} sucursal={sucursal} />
      </div>
      <div className="mt-5 rounded-xl border-2 border-dashed border-verde/50 bg-white/50 p-4 text-center">
        <p className="text-base font-semibold">Mostrá este código en la barra:</p>
        <p className="titulo-afiche mt-1 text-[clamp(2.4rem,12vw,3.5rem)] break-all text-tinta">
          {venta.codigo}
        </p>
      </div>
    </section>
  );
}

export function EstadoRetirado({ venta }: { venta: VentaPublica }) {
  return (
    <section aria-labelledby="titulo-retirado" className="mt-8">
      <h2 id="titulo-retirado" className="titulo-afiche text-4xl text-rojo-oscuro sm:text-5xl">
        ¡Presente! Que lo disfrutes.
      </h2>
      <p className="mt-2 text-lg">
        {venta.retirado_at ? (
          <>
            Retiraste tu café el{" "}
            <time dateTime={venta.retirado_at}>{formatFechaHora(venta.retirado_at)}</time>.{" "}
          </>
        ) : null}
        Gracias por elegir La Vieja Escuela. Contanos qué tal te salió el primer café: te
        leemos en Instagram.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-rojo w-full sm:w-auto"
        >
          <IconoInstagram className="size-5" />
          Seguinos en Instagram
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
        <Link href="/#cafe" className="boton boton-tinta w-full bg-papel-claro sm:w-auto">
          Pedir más café
        </Link>
      </div>
    </section>
  );
}

export function EstadoCancelado({
  venta,
  whatsapp,
}: {
  venta: VentaPublica;
  whatsapp: string | null;
}) {
  const cancelado = venta.cancelado_at ? Date.parse(venta.cancelado_at) : NaN;
  const vence = Date.parse(venta.vence_at);
  // Llegó a figurar pagado y después se canceló (la sucursal lo dio de baja): no es
  // un vencimiento, aunque haya sido después de vence_at.
  const habiaPagado = Boolean(venta.pagado_at);
  // Sin pago y cancelado después del vencimiento (o casi): fue porque venció la reserva.
  // Ojo: "sin pago" es "sin pago confirmado"; puede que el cliente haya transferido a tiempo.
  const vencio =
    !habiaPagado && !Number.isNaN(cancelado) && !Number.isNaN(vence) && cancelado >= vence - 60_000;
  const canal = whatsapp ? " por WhatsApp" : " por Instagram";

  return (
    <section aria-labelledby="titulo-cancelado" className="mt-8">
      <h2 id="titulo-cancelado" className="titulo-afiche text-4xl text-tinta sm:text-5xl">
        {vencio ? "Este pedido venció" : "Este pedido se canceló"}
      </h2>
      <p className="mt-2 text-lg">
        {vencio ? (
          <>
            La reserva venció el{" "}
            <time dateTime={venta.vence_at}>{formatFechaHora(venta.vence_at)}</time> sin que
            confirmáramos el pago.
          </>
        ) : venta.cancelado_at ? (
          <>
            Lo cancelamos el{" "}
            <time dateTime={venta.cancelado_at}>{formatFechaHora(venta.cancelado_at)}</time>.
          </>
        ) : (
          "La sucursal lo dio de baja."
        )}
      </p>
      <p className="mt-2 text-base text-tinta-suave">
        {vencio
          ? `Si transferiste antes de esa fecha, escribinos${canal} con el comprobante y lo confirmamos igual.`
          : habiaPagado
            ? `Si ya habías pagado, escribinos${canal} y lo resolvemos.`
            : `Si ya habías transferido, escribinos${canal} con el comprobante y lo resolvemos.`}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/#cafe" className="boton boton-rojo w-full sm:w-auto">
          Hacer un nuevo pedido
        </Link>
        <a
          href={
            whatsapp
              ? linkWhatsApp(
                  whatsapp,
                  habiaPagado
                    ? `¡Hola, La Vieja Escuela! Mi pedido *${venta.codigo}* figura cancelado y ya lo había pagado. ¿Me ayudan a resolverlo?`
                    : `¡Hola, La Vieja Escuela! Mi pedido *${venta.codigo}* figura cancelado y ya había transferido. Te mando el comprobante.`,
                )
              : INSTAGRAM_URL
          }
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-tinta w-full bg-papel-claro sm:w-auto"
        >
          {whatsapp ? (
            <IconoWhatsApp className="size-5" />
          ) : (
            <IconoInstagram className="size-5" />
          )}
          {habiaPagado ? "Ya lo había pagado" : "Ya había transferido"}
          <span className="sr-only">
            {whatsapp ? " (se abre WhatsApp)" : " (se abre Instagram)"}
          </span>
        </a>
      </div>
    </section>
  );
}
