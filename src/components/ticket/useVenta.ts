"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SucursalId } from "@/config/sucursales";
import {
  VentaPublicaSchema,
  type EstadoVenta,
  type VentaPublica,
} from "@/lib/tienda/contrato";
import { HEADER_TOKEN_VENTA, type RespuestaConsultarVenta } from "@/lib/tienda/api-landing";
import {
  borrarPedido,
  guardarVenta,
  leerPedido,
  suscribirMisPedidos,
  type PedidoGuardado,
} from "@/lib/mis-pedidos";

export const INTERVALO_POLLING_MS = 15_000;
const INTERVALO_MAXIMO_MS = 60_000;
/** Al volver a la pestaña no repetimos una consulta que se hizo hace menos de esto. */
const MINIMO_ENTRE_CONSULTAS_MS = 2_500;

export const estadoActivo = (e: EstadoVenta) => e === "pendiente_pago" || e === "pagado";

/* ------------------------------------------------------------------ */
/* Token: fragmento #t=... o, si no, lo guardado en este dispositivo    */
/* ------------------------------------------------------------------ */

function tokenDelFragmento(): string | null {
  try {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return null;
    const t = new URLSearchParams(hash).get("t")?.trim();
    return t && t.length >= 16 ? t : null;
  } catch {
    return null;
  }
}

function suscribirToken(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  const salir = suscribirMisPedidos(callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    salir();
  };
}

/**
 * undefined = todavía no montó (servidor / hidratación); null = no hay token.
 * Así el primer render del cliente coincide con el del servidor (esqueleto).
 */
function useTokenTicket(sucursal: SucursalId, codigo: string): string | null | undefined {
  return useSyncExternalStore(
    suscribirToken,
    () => tokenDelFragmento() ?? leerPedido(sucursal, codigo)?.token ?? null,
    () => undefined,
  );
}

/* ------------------------------------------------------------------ */
/* Estado del ticket                                                   */
/* ------------------------------------------------------------------ */

export type EstadoTicket =
  | { fase: "cargando" }
  | { fase: "sin-token" }
  | { fase: "no-encontrado" }
  /** La sucursal no responde y no hay copia completa: lo que haya guardado. */
  | { fase: "sin-conexion"; guardado: PedidoGuardado | null }
  | {
      fase: "ok";
      venta: VentaPublica;
      /** La última consulta falló: lo que se ve es lo último que supimos. */
      desactualizado: boolean;
      /** Date.now() de la última respuesta buena (null si viene del storage). */
      consultadoAt: number | null;
    };

type Interno = Exclude<EstadoTicket, { fase: "sin-token" }>;

export type UseVenta = {
  estado: EstadoTicket;
  token: string | null | undefined;
  /** Hay una consulta en curso. */
  consultando: boolean;
  /** Consulta ya (botón "Ya pagué, revisar ahora" / "Reintentar"). */
  refrescar: () => void;
};

export function useVenta(sucursal: SucursalId, codigo: string): UseVenta {
  const token = useTokenTicket(sucursal, codigo);
  const [interno, setInterno] = useState<Interno>({ fase: "cargando" });
  const [consultando, setConsultando] = useState(false);
  const refrescarRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!token) return;

    let vivo = true;
    let terminado = false; // retirado, cancelado o 404: no hay más nada que consultar
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let ultimaConsulta = 0;
    let fallos = 0;

    const programar = (ms: number) => {
      clearTimeout(timer);
      if (!vivo || terminado) return;
      timer = setTimeout(() => {
        // Con la pestaña oculta no consultamos: lo hace alVolver.
        if (document.visibilityState === "visible") void consultar();
      }, ms);
    };

    const desdeGuardado = (): Interno => {
      const guardado = leerPedido(sucursal, codigo);
      if (guardado?.venta) {
        return { fase: "ok", venta: guardado.venta, desactualizado: true, consultadoAt: null };
      }
      return { fase: "sin-conexion", guardado };
    };

    async function consultar() {
      if (!vivo || terminado || !token) return;
      clearTimeout(timer);
      controller?.abort();
      const actual = new AbortController();
      controller = actual;
      ultimaConsulta = Date.now();
      setConsultando(true);
      try {
        const res = await fetch(
          `/api/tienda/${sucursal}/ventas/${encodeURIComponent(codigo)}`,
          {
            headers: { [HEADER_TOKEN_VENTA]: token, Accept: "application/json" },
            cache: "no-store",
            referrerPolicy: "no-referrer",
            signal: actual.signal,
          },
        );
        const datos = (await res.json().catch(() => null)) as RespuestaConsultarVenta | null;
        if (!vivo || actual.signal.aborted) return;

        if (res.ok && datos?.ok) {
          const r = VentaPublicaSchema.safeParse(datos.venta);
          if (!r.success) throw new Error("La respuesta de la venta no tiene la forma esperada");
          const venta = r.data;
          fallos = 0;
          guardarVenta(sucursal, venta, token);
          setInterno({ fase: "ok", venta, desactualizado: false, consultadoAt: Date.now() });
          if (estadoActivo(venta.estado)) programar(INTERVALO_POLLING_MS);
          else terminado = true;
          return;
        }

        if (res.status === 404) {
          // Token incorrecto o pedido inexistente (la sucursal responde igual a propósito).
          terminado = true;
          borrarPedido(sucursal, codigo);
          setInterno({ fase: "no-encontrado" });
          return;
        }

        throw new Error(datos && !datos.ok ? datos.codigo : `HTTP ${res.status}`);
      } catch (e) {
        if (!vivo || actual.signal.aborted || (e as Error)?.name === "AbortError") return;
        // 503 (sucursal caída), 429, 500 o sin internet: mostramos lo último y reintentamos.
        fallos += 1;
        setInterno((previo) =>
          previo.fase === "ok" ? { ...previo, desactualizado: true } : desdeGuardado(),
        );
        programar(Math.min(INTERVALO_POLLING_MS * fallos, INTERVALO_MAXIMO_MS));
      } finally {
        if (vivo && controller === actual) setConsultando(false);
      }
    }

    // El cliente vuelve de la app del banco: refrescamos al toque.
    const alVolver = () => {
      if (document.visibilityState !== "visible" || terminado) return;
      if (Date.now() - ultimaConsulta < MINIMO_ENTRE_CONSULTAS_MS) return;
      void consultar();
    };

    refrescarRef.current = () => {
      if (terminado) return;
      fallos = 0;
      void consultar();
    };

    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    window.addEventListener("online", alVolver);
    void consultar();

    return () => {
      vivo = false;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      window.removeEventListener("online", alVolver);
      refrescarRef.current = () => {};
    };
  }, [sucursal, codigo, token]);

  const refrescar = useCallback(() => refrescarRef.current(), []);

  let estado: EstadoTicket;
  if (token === undefined) estado = { fase: "cargando" };
  else if (interno.fase === "no-encontrado") estado = interno;
  else if (token === null) estado = { fase: "sin-token" };
  else estado = interno;

  return { estado, token, consultando, refrescar };
}
