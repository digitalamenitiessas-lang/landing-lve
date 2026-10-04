"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { INSTAGRAM_URL, type Sucursal } from "@/config/sucursales";
import type { VentaPublica } from "@/lib/tienda/contrato";
import { formatFechaHora, formatPesos, montoParaTransferir } from "@/lib/formato";
import { linkWhatsApp, mensajeComprobante } from "@/lib/whatsapp";
import BotonCopiar from "./BotonCopiar";
import { IconoInstagram, IconoWhatsApp } from "./iconos";

type Props = {
  venta: VentaPublica;
  sucursal: Sucursal;
  consultando: boolean;
  onRefrescar: () => void;
};

/** Pendiente de pago: la tarea para el hogar, en cuatro pasos clarísimos. */
export default function PasosPago({ venta, sucursal, consultando, onRefrescar }: Props) {
  const { pago, whatsapp } = venta;
  const alias = pago.alias?.trim() || null;
  const cbu = pago.cbu?.trim() || null;
  const hayAlias = alias !== null;
  const hayCbu = cbu !== null;
  const hayDatos = hayAlias || hayCbu;
  const mensaje = mensajeComprobante(venta, sucursal);

  return (
    <section aria-labelledby="titulo-pasos" className="mt-8">
      <h2 id="titulo-pasos" className="titulo-afiche text-3xl text-rojo-oscuro sm:text-4xl">
        Tarea para el hogar
      </h2>
      <p className="mt-1 text-base text-tinta-suave">
        Para que tu café quede reservado, hacé estos pasos:
      </p>

      <ol className="mt-5 space-y-4">
        {/* 1. Alias / CBU */}
        <PasoPago
          numero={1}
          titulo={hayAlias ? "Copiá el alias" : hayCbu ? "Copiá el CBU" : "Datos para transferir"}
        >
          {hayDatos ? (
            <>
              {alias ? (
                <DatoGrande etiqueta="Alias" valor={alias} que="el alias" />
              ) : null}
              <dl className="mt-3 space-y-2.5 text-base">
                {cbu ? (
                  <div>
                    <dt className="text-sm font-semibold text-tinta-suave">CBU / CVU</dt>
                    <dd className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="font-mono text-[0.95rem] font-semibold tracking-tight break-all tabular-nums">
                        {cbu}
                      </span>
                      <BotonCopiar valor={cbu} etiqueta="Copiar" que="el CBU" />
                    </dd>
                  </div>
                ) : null}
                <Dato etiqueta="Titular" valor={pago.titular} />
                <Dato etiqueta="Banco" valor={pago.banco} />
                <Dato etiqueta="CUIT" valor={pago.cuit} />
              </dl>
              <p className="mt-3 text-sm text-tinta-suave">
                Antes de confirmar, fijate que el titular coincida.
              </p>
            </>
          ) : (
            <p className="rounded-lg border-2 border-dashed border-rojo/50 bg-rojo/5 p-3 font-semibold text-rojo-oscuro">
              La sucursal todavía no cargó sus datos de pago: escribinos por WhatsApp
              {whatsapp ? "" : " o por Instagram"} y te los pasamos.
            </p>
          )}
        </PasoPago>

        {/* 2. Monto */}
        <PasoPago numero={2} titulo={`Transferí exactamente ${formatPesos(venta.total)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="titulo-afiche text-5xl text-verde tabular-nums">
              {formatPesos(venta.total)}
            </p>
            <BotonCopiar
              valor={montoParaTransferir(venta.total)}
              etiqueta="Copiar monto"
              que={`el monto, ${montoParaTransferir(venta.total)} pesos`}
            />
          </div>
          <p className="mt-2 text-base text-tinta-suave">
            Desde la app de tu banco o billetera virtual (Mercado Pago, Ualá, Naranja X…). El
            monto justo nos ayuda a encontrar tu pago enseguida.
          </p>
        </PasoPago>

        {/* 3. Comprobante */}
        <PasoPago numero={3} titulo="Mandanos el comprobante">
          {whatsapp ? (
            <>
              <a
                href={linkWhatsApp(whatsapp, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                className="boton boton-verde min-h-14 w-full text-lg"
              >
                <IconoWhatsApp className="size-6" />
                Enviar por WhatsApp
                <span className="sr-only"> (se abre WhatsApp)</span>
              </a>
              <p className="mt-2 text-base text-tinta-suave">
                Ya te dejamos el mensaje escrito. Adjuntá la captura o el PDF del comprobante en
                el chat.
              </p>
            </>
          ) : (
            <>
              <p className="text-base">
                Esta sucursal todavía no tiene un WhatsApp cargado. Mandanos la captura del
                comprobante por mensaje directo en Instagram, junto con este texto:
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <BotonCopiar valor={mensaje} etiqueta="Copiar mensaje" que="el mensaje" ancho />
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton boton-rojo w-full sm:w-auto"
                >
                  <IconoInstagram className="size-5" />
                  Abrir Instagram
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </div>
            </>
          )}
        </PasoPago>

        {/* 4. Esperar el sello */}
        <PasoPago numero={4} titulo="Esperá el sello de PAGADO">
          <p className="text-base">
            Esta página se actualiza sola. Te guardamos el pedido hasta el{" "}
            <strong className="font-bold">
              <time dateTime={venta.vence_at}>{formatFechaHora(venta.vence_at)}</time>
            </strong>
            .
          </p>
          <button
            type="button"
            onClick={onRefrescar}
            disabled={consultando}
            className="boton boton-tinta mt-3 min-h-11 bg-papel-claro px-4 py-2 text-base"
          >
            <RefreshCw
              className={clsx("size-5", consultando && "motion-safe:animate-spin")}
              aria-hidden="true"
            />
            {consultando ? "Revisando…" : "Ya pagué, revisar ahora"}
          </button>
        </PasoPago>
      </ol>
    </section>
  );
}

function PasoPago({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <li className="rounded-xl border-2 border-tinta/15 bg-papel-claro/90 p-4 shadow-[0_2px_0_rgb(30_26_21/0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="titulo-afiche grid size-9 shrink-0 place-items-center rounded-full bg-rojo text-xl text-white sm:size-10 sm:text-2xl"
        >
          {numero}
        </span>
        <h3 className="titulo-afiche min-w-0 flex-1 pt-1 text-2xl text-verde sm:text-[1.7rem]">
          <span className="sr-only">Paso {numero}: </span>
          {titulo}
        </h3>
      </div>
      <div className="mt-3">{children}</div>
    </li>
  );
}

function DatoGrande({ etiqueta, valor, que }: { etiqueta: string; valor: string; que: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-verde/40 bg-white/60 p-3">
      <p className="text-sm font-semibold text-tinta-suave">{etiqueta}</p>
      <p className="mt-0.5 text-[1.6rem] leading-tight font-extrabold break-all text-tinta select-all sm:text-3xl">
        {valor}
      </p>
      <BotonCopiar
        valor={valor}
        etiqueta={`Copiar ${etiqueta.toLowerCase()}`}
        que={que}
        variante="verde"
        ancho
        className="mt-3"
      />
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor?.trim()) return null;
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-sm font-semibold text-tinta-suave">{etiqueta}:</dt>
      <dd className="font-semibold break-words">{valor}</dd>
    </div>
  );
}
