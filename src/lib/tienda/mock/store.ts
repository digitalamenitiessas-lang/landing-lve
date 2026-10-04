/**
 * Sucursal simulada: implementación de REFERENCIA del contrato v1, en memoria.
 *
 * El estado vive en globalThis para sobrevivir al HMR de desarrollo (y se pierde
 * al reiniciar el servidor; en serverless, cada instancia tiene el suyo). Las
 * reglas de negocio de acá son las mismas que deben implementar los sistemas
 * reales de cada sucursal:
 *  - el precio se calcula SIEMPRE del lado de la sucursal;
 *  - opciones requeridas presentes y con valores existentes;
 *  - código humano correlativo por sucursal (WEB-SF-0001);
 *  - token aleatorio de 32 bytes del que se guarda solo el sha256;
 *  - idempotencia por idempotency_key (misma venta, token nuevo, status 200);
 *  - máx. 3 ventas pendientes de pago en 24 h por teléfono;
 *  - vencimiento perezoso (pendiente_pago vencida → cancelado al leerla);
 *  - la venta pública solo lleva el nombre de pila: nunca teléfono ni email.
 */
import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SucursalId } from "@/config/sucursales";
import { nombreDePila } from "@/lib/formato";
import {
  CrearVentaBodySchema,
  STATUS_POR_ERROR,
  type Catalogo,
  type CodigoError,
  type CrearVentaRespuesta,
  type EstadoVenta,
  type ItemVenta,
  type VentaPublica,
} from "../contrato";
import { ERRORES_ES, primerProblema } from "../cliente";
import { catalogoDemo, PREFIJO_CODIGO } from "./datos";
import type { AccionAdmin, PanelSucursal, VentaPanel } from "./tipos";

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */

type VentaMock = {
  codigo: string;
  estado: EstadoVenta;
  items: ItemVenta[];
  total: number;
  cliente: { nombre: string; telefono: string; email: string | null };
  /** Solo dígitos, últimos 10: para el límite por teléfono. */
  telefono_norm: string;
  nota: string | null;
  idempotency_key: string;
  token_hash: string;
  creado_at: string;
  pagado_at: string | null;
  retirado_at: string | null;
  cancelado_at: string | null;
  vence_at: string;
};

type EstadoSucursal = {
  catalogo: Catalogo;
  ventas: Map<string, VentaMock>;
  porIdempotencia: Map<string, string>;
  correlativo: number;
};

const CLAVE_GLOBAL = "__lveMockSucursales";
const g = globalThis as typeof globalThis & {
  [CLAVE_GLOBAL]?: Map<SucursalId, EstadoSucursal>;
};

function nuevoEstado(sucursal: SucursalId): EstadoSucursal {
  return {
    catalogo: catalogoDemo(sucursal),
    ventas: new Map(),
    porIdempotencia: new Map(),
    correlativo: 0,
  };
}

function estado(sucursal: SucursalId): EstadoSucursal {
  g[CLAVE_GLOBAL] ??= new Map();
  let e = g[CLAVE_GLOBAL].get(sucursal);
  if (!e) {
    e = nuevoEstado(sucursal);
    g[CLAVE_GLOBAL].set(sucursal, e);
  }
  return e;
}

/* ------------------------------------------------------------------ */
/* Resultados                                                          */
/* ------------------------------------------------------------------ */

export type ResultadoMock<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; body: { error: string; codigo: CodigoError; campo?: string } };

function falla<T>(codigo: CodigoError, error: string, campo?: string): ResultadoMock<T> {
  return {
    ok: false,
    status: STATUS_POR_ERROR[codigo],
    body: campo ? { error, codigo, campo } : { error, codigo },
  };
}

const MENSAJE_NO_ENCONTRADA = "No encontramos ese pedido.";
const MAX_PENDIENTES_POR_TELEFONO = 3;
const VENTANA_TELEFONO_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokenCoincide(token: string, hashGuardado: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hashGuardado, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function nuevoToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizarTelefono(tel: string): string {
  return tel.replace(/\D/g, "").slice(-10);
}

/** Vencimiento perezoso: si está pendiente y ya pasó vence_at, se cancela. */
function aplicarVencimiento(v: VentaMock, ahora = Date.now()): void {
  if (v.estado === "pendiente_pago" && Date.parse(v.vence_at) <= ahora) {
    v.estado = "cancelado";
    v.cancelado_at = v.vence_at;
  }
}

function ventaPublica(v: VentaMock, catalogo: Catalogo): VentaPublica {
  return {
    codigo: v.codigo,
    estado: v.estado,
    total: v.total,
    items: v.items,
    cliente_nombre: nombreDePila(v.cliente.nombre),
    creado_at: v.creado_at,
    pagado_at: v.pagado_at,
    retirado_at: v.retirado_at,
    cancelado_at: v.cancelado_at,
    vence_at: v.vence_at,
    pago: catalogo.pago,
    whatsapp: catalogo.whatsapp,
    retiro: catalogo.retiro,
  };
}

/* ------------------------------------------------------------------ */
/* Contrato                                                            */
/* ------------------------------------------------------------------ */

export function catalogoMock(sucursal: SucursalId): Catalogo {
  return structuredClone(estado(sucursal).catalogo);
}

export function crearVentaMock(
  sucursal: SucursalId,
  body: unknown,
): ResultadoMock<CrearVentaRespuesta> {
  const e = estado(sucursal);

  const parsed = CrearVentaBodySchema.safeParse(body, { error: ERRORES_ES });
  if (!parsed.success) {
    const p = primerProblema(parsed.error);
    return falla("datos_invalidos", p.error, p.campo);
  }
  const pedido = parsed.data;

  // Idempotencia: misma clave → misma venta, token nuevo (el anterior deja de valer).
  const codigoPrevio = e.porIdempotencia.get(pedido.idempotency_key);
  const previa = codigoPrevio ? e.ventas.get(codigoPrevio) : undefined;
  if (previa) {
    aplicarVencimiento(previa);
    const token = nuevoToken();
    previa.token_hash = hashToken(token);
    return { ok: true, status: 200, body: { venta: ventaPublica(previa, e.catalogo), token } };
  }

  if (!e.catalogo.venta_habilitada) {
    return falla(
      "venta_deshabilitada",
      e.catalogo.mensaje ?? "Esta sucursal no está tomando pedidos web por ahora.",
    );
  }

  const items: ItemVenta[] = [];
  for (const [i, it] of pedido.items.entries()) {
    const prod = e.catalogo.productos.find((p) => p.id === it.producto_id);
    if (!prod || !prod.disponible || prod.precio <= 0) {
      return falla(
        "producto_no_disponible",
        "Ese producto no está disponible en este momento.",
        `items.${i}.producto_id`,
      );
    }
    if (it.cantidad > prod.max_por_pedido) {
      return falla(
        "datos_invalidos",
        `Podés pedir hasta ${prod.max_por_pedido} por pedido.`,
        `items.${i}.cantidad`,
      );
    }
    const elegidas: string[] = [];
    for (const op of prod.opciones) {
      const valorId = it.opciones[op.id];
      if (valorId === undefined || valorId === "") {
        if (op.requerida) {
          return falla("opcion_invalida", `Elegí una opción de ${op.nombre.toLowerCase()}.`, `items.${i}.opciones.${op.id}`);
        }
        continue;
      }
      const valor = op.valores.find((v) => v.id === valorId);
      if (!valor) {
        return falla("opcion_invalida", `Esa ${op.nombre.toLowerCase()} no existe.`, `items.${i}.opciones.${op.id}`);
      }
      elegidas.push(valor.nombre);
    }
    for (const opId of Object.keys(it.opciones)) {
      if (!prod.opciones.some((op) => op.id === opId)) {
        return falla("opcion_invalida", "Ese producto no tiene esa opción.", `items.${i}.opciones.${opId}`);
      }
    }
    items.push({
      nombre: prod.nombre,
      detalle: elegidas.length ? elegidas.join(" · ") : null,
      cantidad: it.cantidad,
      precio_unitario: prod.precio,
      subtotal: prod.precio * it.cantidad,
    });
  }

  const ahora = Date.now();
  const telefono_norm = normalizarTelefono(pedido.cliente.telefono);
  let pendientes = 0;
  for (const v of e.ventas.values()) {
    aplicarVencimiento(v, ahora);
    if (
      v.telefono_norm === telefono_norm &&
      v.estado === "pendiente_pago" &&
      ahora - Date.parse(v.creado_at) < VENTANA_TELEFONO_MS
    ) {
      pendientes++;
    }
  }
  if (pendientes >= MAX_PENDIENTES_POR_TELEFONO) {
    return falla(
      "demasiados_pedidos",
      "Ya tenés varios pedidos esperando el pago con este teléfono. Pagá o esperá a que venzan antes de hacer otro.",
    );
  }

  e.correlativo += 1;
  const codigo = `${PREFIJO_CODIGO[sucursal]}${String(e.correlativo).padStart(4, "0")}`;
  const token = nuevoToken();
  const venta: VentaMock = {
    codigo,
    estado: "pendiente_pago",
    items,
    total: items.reduce((s, it) => s + it.subtotal, 0),
    cliente: {
      nombre: pedido.cliente.nombre,
      telefono: pedido.cliente.telefono,
      email: pedido.cliente.email,
    },
    telefono_norm,
    nota: pedido.nota,
    idempotency_key: pedido.idempotency_key,
    token_hash: hashToken(token),
    creado_at: new Date(ahora).toISOString(),
    pagado_at: null,
    retirado_at: null,
    cancelado_at: null,
    vence_at: new Date(ahora + e.catalogo.vencimiento_horas * 3_600_000).toISOString(),
  };
  e.ventas.set(codigo, venta);
  e.porIdempotencia.set(pedido.idempotency_key, codigo);

  return { ok: true, status: 201, body: { venta: ventaPublica(venta, e.catalogo), token } };
}

export function consultarVentaMock(
  sucursal: SucursalId,
  codigo: string,
  token: string | null,
): ResultadoMock<{ venta: VentaPublica }> {
  const e = estado(sucursal);
  const v = e.ventas.get(codigo.toUpperCase());
  // Código inexistente y token incorrecto responden exactamente lo mismo.
  if (!v || !token || !tokenCoincide(token, v.token_hash)) {
    return falla("no_encontrada", MENSAJE_NO_ENCONTRADA);
  }
  aplicarVencimiento(v);
  return { ok: true, status: 200, body: { venta: ventaPublica(v, e.catalogo) } };
}

/* ------------------------------------------------------------------ */
/* Panel (solo demo)                                                   */
/* ------------------------------------------------------------------ */

const TRANSICIONES: Record<EstadoVenta, readonly EstadoVenta[]> = {
  pendiente_pago: ["pagado", "cancelado"],
  pagado: ["retirado", "cancelado"],
  retirado: [],
  cancelado: [],
};

export function panelMock(sucursal: SucursalId): PanelSucursal {
  const e = estado(sucursal);
  const prod = e.catalogo.productos[0];
  const ahora = Date.now();
  const ventas: VentaPanel[] = [...e.ventas.values()]
    .map((v) => {
      aplicarVencimiento(v, ahora);
      return {
        codigo: v.codigo,
        estado: v.estado,
        nombre: v.cliente.nombre,
        total: v.total,
        resumen: v.items.map((it) => `${it.cantidad} × ${it.detalle ?? it.nombre}`).join(", "),
        creado_at: v.creado_at,
        vence_at: v.vence_at,
        pagado_at: v.pagado_at,
        retirado_at: v.retirado_at,
        cancelado_at: v.cancelado_at,
      };
    })
    .sort((a, b) => b.creado_at.localeCompare(a.creado_at) || b.codigo.localeCompare(a.codigo));
  return {
    sucursal,
    config: {
      venta_habilitada: e.catalogo.venta_habilitada,
      precio: prod?.precio ?? 0,
      disponible: prod?.disponible ?? false,
      mensaje: e.catalogo.mensaje,
    },
    ventas,
  };
}

export type ResultadoAdmin =
  | { ok: true; panel: PanelSucursal }
  | { ok: false; status: number; codigo: string; error: string };

export function accionAdminMock(sucursal: SucursalId, accion: AccionAdmin): ResultadoAdmin {
  const e = estado(sucursal);

  if (accion.accion === "reset") {
    g[CLAVE_GLOBAL]?.set(sucursal, nuevoEstado(sucursal));
    return { ok: true, panel: panelMock(sucursal) };
  }

  if (accion.accion === "config") {
    if (accion.venta_habilitada !== undefined) e.catalogo.venta_habilitada = accion.venta_habilitada;
    if (accion.mensaje !== undefined) e.catalogo.mensaje = accion.mensaje?.trim() || null;
    for (const p of e.catalogo.productos) {
      if (accion.precio !== undefined) p.precio = accion.precio;
      if (accion.disponible !== undefined) p.disponible = accion.disponible;
    }
    return { ok: true, panel: panelMock(sucursal) };
  }

  const v = e.ventas.get(accion.codigo.toUpperCase());
  if (!v) return { ok: false, status: 404, codigo: "no_encontrada", error: "No existe esa venta." };
  aplicarVencimiento(v);
  if (!TRANSICIONES[v.estado].includes(accion.estado)) {
    return {
      ok: false,
      status: 409,
      codigo: "transicion_invalida",
      error: `No se puede pasar de "${v.estado}" a "${accion.estado}".`,
    };
  }
  const ahora = new Date().toISOString();
  v.estado = accion.estado;
  if (accion.estado === "pagado") v.pagado_at = ahora;
  if (accion.estado === "retirado") v.retirado_at = ahora;
  if (accion.estado === "cancelado") v.cancelado_at = ahora;
  return { ok: true, panel: panelMock(sucursal) };
}
