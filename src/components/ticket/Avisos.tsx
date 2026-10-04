"use client";

import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { INSTAGRAM_URL, type Sucursal } from "@/config/sucursales";
import { formatFechaHora, formatPesos } from "@/lib/formato";
import type { PedidoGuardado } from "@/lib/mis-pedidos";
import type { VentaPublica } from "@/lib/tienda/contrato";
import HojaCuaderno from "./HojaCuaderno";
import { IconoInstagram } from "./iconos";
import Sello from "./Sello";

type Base = { sucursal: Sucursal; codigo: string };

function Codigo({ codigo }: { codigo: string }) {
  return (
    <>
      <p className="mt-5 text-sm font-semibold tracking-wide text-tinta-suave uppercase">
        Código
      </p>
      <p className="titulo-afiche mt-1 text-[clamp(2.4rem,12vw,4.25rem)] break-all text-tinta">
        {codigo}
      </p>
    </>
  );
}

function AccionesAyuda() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="boton boton-rojo w-full sm:w-auto"
      >
        <IconoInstagram className="size-5" />
        Escribinos por Instagram
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
      <Link href="/" className="boton boton-tinta w-full bg-papel-claro sm:w-auto">
        Volver al inicio
      </Link>
    </div>
  );
}

/** No hay token en el link ni en este dispositivo. */
export function AvisoSinToken({ sucursal, codigo }: Base) {
  return (
    <HojaCuaderno subtitulo={`Sucursal ${sucursal.direccion}`} etiqueta={`Pedido ${codigo}`}>
      <Codigo codigo={codigo} />
      <h1 className="titulo-afiche mt-6 text-3xl text-rojo-oscuro sm:text-4xl">
        No encontramos este ticket en este dispositivo
      </h1>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
        <li>
          Si guardaste el link con el botón «Copiar link del ticket», abrilo desde ahí: es el
          mismo de siempre, pero completo (termina con <span className="font-mono">#t=</span> y
          una clave larga).
        </li>
        <li>Si hiciste el pedido desde otro celu o navegador, abrilo desde ahí.</li>
        <li>
          ¿Lo perdiste? Escribinos por Instagram con tu nombre y el código{" "}
          <strong>{codigo}</strong> y te ayudamos.
        </li>
      </ul>
      <AccionesAyuda />
    </HojaCuaderno>
  );
}

/** La sucursal dice que el código no existe o el token no corresponde. */
export function AvisoNoEncontrado({ sucursal, codigo }: Base) {
  return (
    <HojaCuaderno subtitulo={`Sucursal ${sucursal.direccion}`} etiqueta={`Pedido ${codigo}`}>
      <Codigo codigo={codigo} />
      <h1 className="titulo-afiche mt-6 text-3xl text-rojo-oscuro sm:text-4xl">
        Este ticket no está en el cuaderno
      </h1>
      <p className="mt-3 text-base">
        El código no existe en la sucursal {sucursal.nombre} o el link quedó incompleto al
        copiarlo. Revisá que sea el link entero que copiaste con «Copiar link del ticket».
      </p>
      <p className="mt-2 text-base">
        Si ya transferiste, no te preocupes: escribinos con el comprobante y lo buscamos.
      </p>
      <AccionesAyuda />
    </HojaCuaderno>
  );
}

/** La sucursal no responde y no tenemos copia completa del pedido. */
export function AvisoSinConexion({
  sucursal,
  codigo,
  guardado,
  consultando,
  consultandoManual,
  onReintentar,
}: Base & {
  guardado: PedidoGuardado | null;
  consultando: boolean;
  /** El reintento en curso lo pidió el cliente (solo ese se anuncia). */
  consultandoManual: boolean;
  onReintentar: () => void;
}) {
  return (
    <HojaCuaderno subtitulo={`Sucursal ${sucursal.direccion}`} etiqueta={`Pedido ${codigo}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4">
        <div className="min-w-0">
          <Codigo codigo={codigo} />
        </div>
        {guardado ? <Sello estado={guardado.estado} className="mt-2 ml-auto" /> : null}
      </div>
      {guardado ? (
        <p className="mt-3 text-lg">
          Total: <strong className="tabular-nums">{formatPesos(guardado.total)}</strong>
        </p>
      ) : null}
      <h1 className="titulo-afiche mt-6 text-3xl text-tinta sm:text-4xl">
        La sucursal no responde ahora
      </h1>
      {/* Texto fijo en la región viva: no se reanuncia en cada reintento automático. */}
      <p className="mt-3 text-base">
        <span role="status" aria-live="polite">
          {guardado
            ? "Te mostramos lo último que sabemos de tu pedido."
            : "No pudimos consultar tu pedido."}{" "}
          Reintentamos solos cada tanto.
          {consultandoManual ? <span className="sr-only"> Reintentando…</span> : null}
        </span>
        {consultando ? (
          <span aria-hidden="true">
            {" "}
            <LoaderCircle className="inline size-4 align-[-2px] motion-safe:animate-spin" />{" "}
            Reintentando…
          </span>
        ) : null}
      </p>
      {/* Sin disabled: el polling no le saca el foco al botón. */}
      <button
        type="button"
        onClick={() => {
          if (!consultandoManual) onReintentar();
        }}
        aria-disabled={consultandoManual || undefined}
        aria-busy={consultando || undefined}
        className={clsx("boton boton-tinta mt-5 w-full bg-papel-claro sm:w-auto")}
      >
        <RefreshCw
          className={clsx("size-5", consultando && "motion-safe:animate-spin")}
          aria-hidden="true"
        />
        Probar de nuevo
      </button>
    </HojaCuaderno>
  );
}

/**
 * Copia guardada de un pedido pendiente cuya reserva ya pasó, mientras la sucursal
 * no responde: no mostramos los datos para transferir (lo más probable es que ya
 * esté cancelado), solo qué hacer.
 */
export function AvisoReservaVencida({ venta }: { venta: VentaPublica }) {
  return (
    <section aria-labelledby="titulo-reserva-vencida" className="mt-8">
      <h2
        id="titulo-reserva-vencida"
        className="titulo-afiche text-3xl text-rojo-oscuro sm:text-4xl"
      >
        La reserva venció
      </h2>
      <p className="mt-2 text-lg">
        Te guardábamos el pedido hasta el{" "}
        <time dateTime={venta.vence_at}>{formatFechaHora(venta.vence_at)}</time>. Como la
        sucursal no responde ahora, no podemos confirmar si llegó tu pago:{" "}
        <strong className="font-bold">no transfieras</strong> hasta que lo veamos.
      </p>
      <p className="mt-2 text-base text-tinta-suave">
        Si ya transferiste antes de esa fecha, quedate con el comprobante: apenas la sucursal
        responda, vas a ver acá cómo quedó el pedido.
      </p>
    </section>
  );
}
