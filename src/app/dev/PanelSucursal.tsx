"use client";

/**
 * Panel de UNA sucursal simulada: configuración de la tienda y lista de ventas
 * con los botones que en el sistema real usa el equipo de la barra.
 * Solo se monta en /dev/sucursales (modo demo).
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import type { SucursalId } from "@/config/sucursales";
import type { EstadoVenta } from "@/lib/tienda/contrato";
import type { AccionAdmin, PanelSucursal as DatosPanel, RespuestaAdmin, VentaPanel } from "@/lib/tienda/mock/tipos";
import { formatPesos } from "@/lib/formato";

const REFRESCO_MS = 5_000;

type Props = {
  sucursal: SucursalId;
  nombre: string;
  direccion: string;
  apodo: string;
  inicial: DatosPanel;
};

const ETIQUETA_ESTADO: Record<EstadoVenta, string> = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

const CLASE_ESTADO: Record<EstadoVenta, string> = {
  pendiente_pago: "bg-sol text-tinta",
  pagado: "bg-verde text-white",
  retirado: "bg-celeste-claro text-tinta",
  cancelado: "bg-papel-oscuro text-tinta-suave",
};

/**
 * "06/10 18:30" en hora de Tucumán. Argentina no tiene horario de verano (UTC-3
 * fijo), así que se calcula a mano: idéntico en el servidor y en el navegador.
 */
function fechaCorta(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3_600_000);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

export function PanelSucursal({ sucursal, nombre, direccion, apodo, inicial }: Props) {
  const [panel, setPanel] = useState<DatosPanel>(inicial);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [precioBorrador, setPrecioBorrador] = useState<string | null>(null);
  const [mensajeBorrador, setMensajeBorrador] = useState<string | null>(null);
  const enVuelo = useRef(false);

  const url = `/api/mock-sucursal/${sucursal}/admin`;
  const idBase = `panel-${sucursal}`;

  const refrescar = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as RespuestaAdmin;
      if (json.ok) {
        setPanel(json.panel);
        setSinConexion(false);
      } else {
        setSinConexion(true);
      }
    } catch {
      setSinConexion(true);
    } finally {
      enVuelo.current = false;
    }
  }, [url]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refrescar();
    }, REFRESCO_MS);
    return () => window.clearInterval(id);
  }, [refrescar]);

  async function enviar(accion: AccionAdmin, clave: string, exito: string): Promise<boolean> {
    setOcupado(clave);
    setAviso(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accion),
      });
      const json = (await res.json()) as RespuestaAdmin;
      if (!json.ok) {
        setAviso({ tipo: "error", texto: json.error });
        return false;
      }
      setPanel(json.panel);
      setAviso({ tipo: "ok", texto: exito });
      return true;
    } catch {
      setAviso({ tipo: "error", texto: "No se pudo hablar con la sucursal simulada. ¿Está corriendo el servidor?" });
      return false;
    } finally {
      setOcupado(null);
    }
  }

  const { config, ventas } = panel;
  const precioMostrado = precioBorrador ?? String(config.precio);
  const mensajeMostrado = mensajeBorrador ?? config.mensaje ?? "";
  const hayBorrador = precioBorrador !== null || mensajeBorrador !== null;

  async function guardarConfig(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const precio = Number(precioMostrado);
    if (!Number.isInteger(precio) || precio < 0) {
      setAviso({ tipo: "error", texto: "El precio tiene que ser un número entero, sin puntos ni centavos." });
      return;
    }
    const ok = await enviar(
      { accion: "config", precio, mensaje: mensajeMostrado.trim() || null },
      "config",
      "Configuración guardada.",
    );
    if (ok) {
      setPrecioBorrador(null);
      setMensajeBorrador(null);
    }
  }

  function cambiarEstado(v: VentaPanel, estado: EstadoVenta) {
    void enviar(
      { accion: "estado", codigo: v.codigo, estado },
      `${v.codigo}:${estado}`,
      `${v.codigo} pasó a "${ETIQUETA_ESTADO[estado].toLowerCase()}".`,
    );
  }

  function resetear() {
    if (!window.confirm(`¿Borrar todas las ventas simuladas de ${nombre} y volver a la configuración inicial?`)) return;
    setPrecioBorrador(null);
    setMensajeBorrador(null);
    void enviar({ accion: "reset" }, "reset", "Sucursal simulada reiniciada.");
  }

  return (
    <section
      aria-labelledby={`${idBase}-titulo`}
      className="rounded-2xl border-2 border-tinta bg-papel-claro p-4 shadow-[6px_6px_0_var(--color-tinta)] sm:p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-dashed border-tinta/30 pb-4">
        <div>
          <p className="a-mano text-xl text-verde">{apodo}</p>
          <h2 id={`${idBase}-titulo`} className="titulo-afiche text-4xl text-rojo-oscuro sm:text-5xl">
            {nombre}
          </h2>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-tinta-suave">{direccion}</p>
        </div>
        <p className="text-xs text-tinta-suave">
          {sinConexion ? (
            <span className="font-semibold text-rojo-oscuro">Sin conexión con la sucursal simulada</span>
          ) : (
            "Se actualiza sola cada 5 s"
          )}
        </p>
      </header>

      <p role="status" aria-live="polite" className="min-h-6 pt-3 text-sm font-semibold">
        {aviso && (
          <span className={aviso.tipo === "ok" ? "text-verde" : "text-rojo-oscuro"}>{aviso.texto}</span>
        )}
      </p>

      {/* ---------------- Configuración ---------------- */}
      <div className="mt-2">
        <h3 className="titulo-afiche text-2xl text-verde">Configuración de la tienda</h3>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Interruptor
            etiqueta="Venta web habilitada"
            ayuda="Apagada: la landing no deja pedir en esta sucursal."
            activo={config.venta_habilitada}
            deshabilitado={ocupado !== null}
            onCambiar={(v) =>
              void enviar(
                { accion: "config", venta_habilitada: v },
                "venta",
                v ? "Venta web habilitada." : "Venta web deshabilitada.",
              )
            }
          />
          <Interruptor
            etiqueta="Café disponible"
            ayuda="Apagado: el 1/4 kg figura sin stock."
            activo={config.disponible}
            deshabilitado={ocupado !== null}
            onCambiar={(v) =>
              void enviar(
                { accion: "config", disponible: v },
                "disponible",
                v ? "Café marcado como disponible." : "Café marcado sin stock.",
              )
            }
          />
        </div>

        <form onSubmit={guardarConfig} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <label htmlFor={`${idBase}-precio`} className="block text-sm font-bold">
              Precio del 1/4 kg ($)
            </label>
            <input
              id={`${idBase}-precio`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={precioMostrado}
              onChange={(e) => setPrecioBorrador(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border-2 border-tinta bg-white px-3 text-base tabular-nums"
            />
          </div>
          <div>
            <label htmlFor={`${idBase}-mensaje`} className="block text-sm font-bold">
              Aviso arriba del formulario <span className="font-normal text-tinta-suave">(opcional)</span>
            </label>
            <input
              id={`${idBase}-mensaje`}
              type="text"
              maxLength={200}
              placeholder="Ej.: Sin café molido para filtro hasta el lunes"
              value={mensajeMostrado}
              onChange={(e) => setMensajeBorrador(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border-2 border-tinta bg-white px-3 text-base placeholder:text-tinta-suave/80"
            />
          </div>
          <button type="submit" className="boton boton-verde" disabled={ocupado !== null || !hayBorrador}>
            {ocupado === "config" ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </div>

      {/* ---------------- Ventas ---------------- */}
      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="titulo-afiche text-2xl text-verde">
            Ventas web <span className="text-tinta-suave">({ventas.length})</span>
          </h3>
          <button
            type="button"
            onClick={resetear}
            disabled={ocupado !== null}
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-rojo-oscuro underline underline-offset-4 hover:bg-rojo/10 disabled:opacity-55"
          >
            Reiniciar sucursal
          </button>
        </div>

        {ventas.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-tinta/30 p-4 text-tinta-suave">
            <span className="a-mano block text-2xl text-tinta">Todavía no hay pedidos.</span>
            Hacé uno desde la landing eligiendo esta sucursal y va a aparecer acá.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {ventas.map((v) => (
              <FilaVenta key={v.codigo} venta={v} ocupado={ocupado} onEstado={cambiarEstado} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Interruptor({
  etiqueta,
  ayuda,
  activo,
  deshabilitado,
  onCambiar,
}: {
  etiqueta: string;
  ayuda: string;
  activo: boolean;
  deshabilitado: boolean;
  onCambiar: (valor: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => onCambiar(!activo)}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-tinta/20 bg-white/60 px-3 py-2 text-left hover:border-tinta/50 disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={clsx(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-tinta transition-colors",
          activo ? "bg-verde" : "bg-papel-oscuro",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full border-2 border-tinta bg-white transition-transform duration-200",
            activo ? "translate-x-[1.35rem]" : "translate-x-0.5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">
          {etiqueta}: <span className={activo ? "text-verde" : "text-rojo-oscuro"}>{activo ? "Sí" : "No"}</span>
        </span>
        <span className="block text-xs text-tinta-suave">{ayuda}</span>
      </span>
    </button>
  );
}

function FilaVenta({
  venta: v,
  ocupado,
  onEstado,
}: {
  venta: VentaPanel;
  ocupado: string | null;
  onEstado: (v: VentaPanel, estado: EstadoVenta) => void;
}) {
  const bloqueado = ocupado !== null;
  return (
    <li
      className={clsx(
        "rounded-xl border-2 border-tinta bg-white p-3 sm:p-4",
        (v.estado === "cancelado" || v.estado === "retirado") && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-base font-bold tracking-tight">{v.codigo}</p>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", CLASE_ESTADO[v.estado])}>
          {ETIQUETA_ESTADO[v.estado]}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-tinta-suave">Cliente</dt>
        <dd className="min-w-0 break-words font-semibold">{v.nombre}</dd>
        <dt className="text-tinta-suave">Pedido</dt>
        <dd className="min-w-0 break-words">{v.resumen}</dd>
        <dt className="text-tinta-suave">Total</dt>
        <dd className="font-bold tabular-nums">{formatPesos(v.total)}</dd>
        <dt className="text-tinta-suave">Creado</dt>
        <dd className="tabular-nums">{fechaCorta(v.creado_at)}</dd>
        {v.estado === "pendiente_pago" && (
          <>
            <dt className="text-tinta-suave">Vence</dt>
            <dd className="tabular-nums">{fechaCorta(v.vence_at)}</dd>
          </>
        )}
        {v.pagado_at && (
          <>
            <dt className="text-tinta-suave">Pagado</dt>
            <dd className="tabular-nums">{fechaCorta(v.pagado_at)}</dd>
          </>
        )}
        {v.retirado_at && (
          <>
            <dt className="text-tinta-suave">Retirado</dt>
            <dd className="tabular-nums">{fechaCorta(v.retirado_at)}</dd>
          </>
        )}
        {v.cancelado_at && (
          <>
            <dt className="text-tinta-suave">Cancelado</dt>
            <dd className="tabular-nums">{fechaCorta(v.cancelado_at)}</dd>
          </>
        )}
      </dl>

      {(v.estado === "pendiente_pago" || v.estado === "pagado") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {v.estado === "pendiente_pago" ? (
            <button
              type="button"
              className="boton boton-verde flex-1 sm:flex-none"
              disabled={bloqueado}
              onClick={() => onEstado(v, "pagado")}
              aria-label={`Marcar ${v.codigo} como pagado`}
            >
              {ocupado === `${v.codigo}:pagado` ? "Marcando…" : "Marcar pagado"}
            </button>
          ) : (
            <button
              type="button"
              className="boton boton-verde flex-1 sm:flex-none"
              disabled={bloqueado}
              onClick={() => onEstado(v, "retirado")}
              aria-label={`Marcar ${v.codigo} como retirado`}
            >
              {ocupado === `${v.codigo}:retirado` ? "Marcando…" : "Marcar retirado"}
            </button>
          )}
          <button
            type="button"
            className="boton border-2 border-rojo-oscuro text-rojo-oscuro hover:bg-rojo-oscuro hover:text-white"
            disabled={bloqueado}
            onClick={() => onEstado(v, "cancelado")}
            aria-label={`Cancelar ${v.codigo}`}
          >
            {ocupado === `${v.codigo}:cancelado` ? "Cancelando…" : "Cancelar"}
          </button>
        </div>
      )}
    </li>
  );
}
