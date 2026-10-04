/**
 * "Mis pedidos": los pedidos que se hicieron desde este dispositivo.
 *
 * Vive solo en localStorage (la landing no tiene base de datos). Guarda el token
 * de cada ticket para que el cliente pueda volver a verlo aunque pierda el link,
 * y alimenta el chip "Tu pedido ..." de la navegación.
 *
 * Todo es SSR-safe (en el servidor no hay pedidos) y a prueba de navegadores que
 * bloquean el storage (modo incógnito, cookies apagadas): nunca tira.
 */
import { z } from "zod";
import { esSucursalId, type SucursalId } from "@/config/sucursales";
import {
  EstadoVentaSchema,
  VentaPublicaSchema,
  type EstadoVenta,
  type VentaPublica,
} from "@/lib/tienda/contrato";

export const CLAVE_MIS_PEDIDOS = "lve:pedidos:v1";
/** Evento propio (misma pestaña); entre pestañas se usa el evento nativo 'storage'. */
export const EVENTO_MIS_PEDIDOS = "lve:pedidos-cambio";
export const MAX_MIS_PEDIDOS = 10;
/** Un pedido pendiente o pagado deja de mostrarse en el chip después de esto. */
export const DIAS_PEDIDO_ACTIVO = 7;

const PedidoGuardadoSchema = z.object({
  sucursal: z.string().refine(esSucursalId),
  codigo: z.string().min(1),
  token: z.string().min(1),
  total: z.number().nonnegative(),
  estado: EstadoVentaSchema,
  creado_at: z.string(),
  actualizado_at: z.string(),
  /**
   * Última copia completa de la venta (opcional). Sirve para mostrar el ticket
   * con alias y CBU aunque la sucursal no responda en ese momento.
   */
  venta: VentaPublicaSchema.optional(),
});

export type PedidoGuardado = {
  sucursal: SucursalId;
  codigo: string;
  token: string;
  total: number;
  estado: EstadoVenta;
  creado_at: string;
  actualizado_at: string;
  venta?: VentaPublica;
};

export type NuevoPedidoGuardado = Omit<PedidoGuardado, "actualizado_at"> & {
  actualizado_at?: string;
};

/* ------------------------------------------------------------------ */
/* Acceso crudo al storage                                             */
/* ------------------------------------------------------------------ */

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * El valor crudo guardado (string estable, sirve como snapshot de
 * useSyncExternalStore). null si no hay nada o no hay storage.
 */
export function leerCrudoMisPedidos(): string | null {
  try {
    return storage()?.getItem(CLAVE_MIS_PEDIDOS) ?? null;
  } catch {
    return null;
  }
}

/** Parsea el valor crudo descartando entradas rotas. Ordenados del más reciente al más viejo. */
export function parsearMisPedidos(crudo: string | null): PedidoGuardado[] {
  if (!crudo) return [];
  let datos: unknown;
  try {
    datos = JSON.parse(crudo);
  } catch {
    return [];
  }
  if (!Array.isArray(datos)) return [];
  const pedidos: PedidoGuardado[] = [];
  for (const d of datos) {
    const r = PedidoGuardadoSchema.safeParse(d);
    if (r.success) pedidos.push(r.data as PedidoGuardado);
  }
  return ordenar(pedidos);
}

function ordenar(pedidos: PedidoGuardado[]): PedidoGuardado[] {
  return [...pedidos].sort((a, b) => fecha(b.actualizado_at) - fecha(a.actualizado_at));
}

function fecha(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function escribir(pedidos: PedidoGuardado[]): void {
  const s = storage();
  if (!s) return;
  try {
    const lista = ordenar(pedidos).slice(0, MAX_MIS_PEDIDOS);
    if (lista.length === 0) s.removeItem(CLAVE_MIS_PEDIDOS);
    else s.setItem(CLAVE_MIS_PEDIDOS, JSON.stringify(lista));
  } catch {
    // Storage lleno o bloqueado: si guardaba copias completas, probamos sin ellas.
    try {
      const livianos = ordenar(pedidos)
        .slice(0, MAX_MIS_PEDIDOS)
        .map((p) => {
          const liviano: PedidoGuardado = { ...p };
          delete liviano.venta;
          return liviano;
        });
      s.setItem(CLAVE_MIS_PEDIDOS, JSON.stringify(livianos));
    } catch {
      return;
    }
  }
  avisar();
}

function avisar(): void {
  try {
    window.dispatchEvent(new Event(EVENTO_MIS_PEDIDOS));
  } catch {
    // nada
  }
}

const mismo = (p: PedidoGuardado, sucursal: SucursalId, codigo: string) =>
  p.sucursal === sucursal && p.codigo === codigo;

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** Todos los pedidos de este dispositivo, del más reciente al más viejo. */
export function listarPedidos(): PedidoGuardado[] {
  return parsearMisPedidos(leerCrudoMisPedidos());
}

export function leerPedido(sucursal: SucursalId, codigo: string): PedidoGuardado | null {
  return listarPedidos().find((p) => mismo(p, sucursal, codigo)) ?? null;
}

/** Crea o actualiza (por sucursal + código). Conserva los 10 más recientes. */
export function guardarPedido(pedido: NuevoPedidoGuardado): void {
  const actuales = listarPedidos();
  const previo = actuales.find((p) => mismo(p, pedido.sucursal, pedido.codigo));
  // Si no viene una copia nueva de la venta, la vieja sirve solo si sigue en el mismo estado.
  const venta =
    pedido.venta ?? (previo?.venta?.estado === pedido.estado ? previo.venta : undefined);
  const nuevo: PedidoGuardado = {
    ...pedido,
    actualizado_at: pedido.actualizado_at ?? new Date().toISOString(),
  };
  if (venta) nuevo.venta = venta;
  else delete nuevo.venta;
  escribir([nuevo, ...actuales.filter((p) => p !== previo)]);
}

/** Atajo: guarda lo que devuelve la API (al crear la venta o al consultarla). */
export function guardarVenta(sucursal: SucursalId, venta: VentaPublica, token: string): void {
  guardarPedido({
    sucursal,
    codigo: venta.codigo,
    token,
    total: venta.total,
    estado: venta.estado,
    creado_at: venta.creado_at,
    venta,
  });
}

export function borrarPedido(sucursal: SucursalId, codigo: string): void {
  const actuales = listarPedidos();
  const resto = actuales.filter((p) => !mismo(p, sucursal, codigo));
  if (resto.length !== actuales.length) escribir(resto);
}

export function borrarTodosLosPedidos(): void {
  escribir([]);
}

/** Pendiente de pago o pagado (todavía no retirado) y hecho hace menos de 7 días. */
export function esPedidoActivo(p: PedidoGuardado, ahora: number = Date.now()): boolean {
  if (p.estado !== "pendiente_pago" && p.estado !== "pagado") return false;
  const creado = fecha(p.creado_at) || fecha(p.actualizado_at);
  return ahora - creado < DIAS_PEDIDO_ACTIVO * 24 * 60 * 60 * 1000;
}

/** El pedido activo más reciente (para el chip), o null. */
export function pedidoActivoDe(pedidos: PedidoGuardado[]): PedidoGuardado | null {
  const ahora = Date.now();
  return pedidos.find((p) => esPedidoActivo(p, ahora)) ?? null;
}

/**
 * Se entera de cualquier cambio en "mis pedidos": en esta pestaña (evento propio)
 * y en otras (evento 'storage'). Devuelve la función para desuscribirse.
 * Tiene la firma que pide useSyncExternalStore.
 */
export function suscribirMisPedidos(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const alCambiarStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CLAVE_MIS_PEDIDOS) callback();
  };
  window.addEventListener("storage", alCambiarStorage);
  window.addEventListener(EVENTO_MIS_PEDIDOS, callback);
  return () => {
    window.removeEventListener("storage", alCambiarStorage);
    window.removeEventListener(EVENTO_MIS_PEDIDOS, callback);
  };
}
