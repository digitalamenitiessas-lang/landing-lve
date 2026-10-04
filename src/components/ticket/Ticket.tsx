"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { getSucursal, type SucursalId } from "@/config/sucursales";
import { rutaTicket } from "@/lib/tienda/api-landing";
import type { EstadoVenta } from "@/lib/tienda/contrato";
import { nombreDePila } from "@/lib/formato";
import { AvisoNoEncontrado, AvisoSinConexion, AvisoSinToken } from "./Avisos";
import BotonCopiar from "./BotonCopiar";
import Detalle from "./Detalle";
import { EstadoCancelado, EstadoPagado, EstadoRetirado } from "./Estados";
import HojaCuaderno from "./HojaCuaderno";
import PasosPago from "./PasosPago";
import Progreso from "./Progreso";
import Sello from "./Sello";
import TicketEsqueleto from "./TicketEsqueleto";
import { estadoActivo, useVenta } from "./useVenta";

export type TicketProps = {
  sucursal: SucursalId;
  /** Código ya decodificado, p. ej. "WEB-SF-0042" */
  codigo: string;
};

const TEXTO_ESTADO: Record<EstadoVenta, string> = {
  pendiente_pago: "pendiente de pago",
  pagado: "pagado, listo para retirar",
  retirado: "retirado",
  cancelado: "cancelado",
};

const hora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Tucuman",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Ticket del pedido con forma de cuaderno de comunicaciones.
 * Todo lo que depende del fragmento (#t=) o de localStorage se resuelve en el
 * cliente: el render del servidor y el primero del cliente son el esqueleto.
 */
export default function Ticket({ sucursal: sucursalId, codigo }: TicketProps) {
  const sucursal = getSucursal(sucursalId);
  const { estado, token, consultando, refrescar } = useVenta(sucursalId, codigo);

  if (estado.fase === "cargando") return <TicketEsqueleto codigo={codigo} />;
  if (estado.fase === "sin-token") return <AvisoSinToken sucursal={sucursal} codigo={codigo} />;
  if (estado.fase === "no-encontrado") {
    return <AvisoNoEncontrado sucursal={sucursal} codigo={codigo} />;
  }
  if (estado.fase === "sin-conexion") {
    return (
      <AvisoSinConexion
        sucursal={sucursal}
        codigo={codigo}
        guardado={estado.guardado}
        consultando={consultando}
        onReintentar={refrescar}
      />
    );
  }

  const { venta, desactualizado, consultadoAt } = estado;
  const activo = estadoActivo(venta.estado);
  const cancelado = venta.estado === "cancelado";

  return (
    <HojaCuaderno
      subtitulo={
        <>
          Sucursal <span className="text-tinta">{sucursal.direccion}</span>
        </>
      }
      atenuada={cancelado}
      etiqueta={`Pedido ${venta.codigo}`}
    >
      <p className="atenuable a-mano mt-4 text-2xl text-tinta">
        ¡Hola, {nombreDePila(venta.cliente_nombre)}!
      </p>

      <div className="flex flex-wrap items-end justify-between gap-x-4">
        <div className="atenuable min-w-0">
          <p className="mt-2 text-sm font-semibold tracking-wide text-tinta-suave uppercase">
            Tu código
          </p>
          <h1 className="titulo-afiche mt-1 text-[clamp(2.4rem,12vw,4.25rem)] break-all text-tinta">
            <span className="sr-only">Pedido </span>
            {venta.codigo}
          </h1>
        </div>
        <Sello estado={venta.estado} className="mt-3 ml-auto" />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        Estado del pedido: {TEXTO_ESTADO[venta.estado]}.
      </p>

      {desactualizado ? (
        <div
          role="status"
          className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border-2 border-sol bg-sol/15 p-3 text-base"
        >
          <CloudOff className="size-5 shrink-0 text-tinta" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            La sucursal no responde ahora: te mostramos lo último que sabemos.
            {consultando ? " Reintentando…" : " Reintentamos solos."}
          </p>
          <button
            type="button"
            onClick={refrescar}
            disabled={consultando}
            className="boton boton-tinta min-h-11 bg-papel-claro px-4 py-2 text-sm"
          >
            <RefreshCw
              className={clsx("size-4", consultando && "motion-safe:animate-spin")}
              aria-hidden="true"
            />
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="atenuable mt-7">
        <Progreso venta={venta} />
      </div>

      {venta.estado === "pendiente_pago" ? (
        <PasosPago
          venta={venta}
          sucursal={sucursal}
          consultando={consultando}
          onRefrescar={refrescar}
        />
      ) : venta.estado === "pagado" ? (
        <EstadoPagado venta={venta} sucursal={sucursal} />
      ) : venta.estado === "retirado" ? (
        <EstadoRetirado venta={venta} />
      ) : (
        <EstadoCancelado venta={venta} whatsapp={venta.whatsapp} />
      )}

      <Detalle venta={venta} />

      {token && !cancelado ? (
        <section aria-labelledby="titulo-link" className="mt-8 rounded-xl bg-celeste-claro/60 p-4">
          <h2 id="titulo-link" className="a-mano text-2xl text-verde">
            Guardate este ticket
          </h2>
          <p className="mt-1 text-base">
            Guardalo: con este link ves el estado de tu pedido desde cualquier lado.
          </p>
          <BotonCopiar
            className="mt-3"
            ancho
            etiqueta="Copiar link del ticket"
            que="el link del ticket"
            valor={() => `${window.location.origin}${rutaTicket(sucursalId, codigo, token)}`}
          />
        </section>
      ) : null}

      <p className="mt-6 text-sm text-tinta-suave">
        {consultadoAt ? (
          <>Consultado a las {hora.format(consultadoAt)}</>
        ) : (
          "Copia guardada en este dispositivo"
        )}
        {activo ? " · esta página se actualiza sola" : ""}
      </p>
    </HojaCuaderno>
  );
}
