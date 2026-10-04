/**
 * Cliente HTTP de la landing hacia el sistema de cada sucursal (contrato v1).
 *
 * - Resuelve URL y secreto de cada sucursal desde el entorno:
 *   SUCURSAL_<envKey>_API_URL y SUCURSAL_<envKey>_API_SECRET.
 * - En modo demo (TIENDA_MOCK=1 fuera de producción) habla siempre con la
 *   sucursal simulada de /api/mock-sucursal/{id}.
 * - Valida TODAS las respuestas con los schemas de contrato.ts: si la sucursal
 *   responde algo que no entendemos, para el navegador es "sucursal no disponible".
 * - Nunca loguea secretos ni datos personales (nombre, teléfono, email).
 */
import "server-only";

import { z } from "zod";
import { getSucursal, type SucursalId } from "@/config/sucursales";
import {
  CatalogoSchema,
  ConsultarVentaRespuestaSchema,
  CONTRATO_VERSION,
  CrearVentaRespuestaSchema,
  ErrorRespuestaSchema,
  type Catalogo,
  type CrearVentaBody,
  type CrearVentaRespuesta,
  type VentaPublica,
} from "./contrato";
import { HEADER_TOKEN_VENTA, type CodigoErrorLanding } from "./api-landing";

/* ------------------------------------------------------------------ */
/* Tipos y constantes                                                  */
/* ------------------------------------------------------------------ */

export type ResultadoSucursal<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; codigo: CodigoErrorLanding; error: string; campo?: string };

const TIMEOUT_MS = 8_000;
const CATALOGO_TTL_MS = 60_000;
/** Si la sucursal falla, servimos el último catálogo bueno hasta este tope de antigüedad. */
const CATALOGO_STALE_MAX_MS = 10 * 60_000;

export const MENSAJE_NO_DISPONIBLE =
  "No pudimos comunicarnos con la sucursal en este momento. Probá de nuevo en un ratito; si sigue sin andar, escribinos por Instagram.";

/** Mensajes de zod en castellano (los mensajes propios de cada schema tienen prioridad). */
export const ERRORES_ES = z.locales.es().localeError;

/** Primer problema de una validación fallida, en el formato { campo, error } de las respuestas. */
export function primerProblema(error: z.ZodError): { campo?: string; error: string } {
  const issue = error.issues[0];
  if (!issue) return { error: "Revisá los datos del pedido." };
  const campo = issue.path.map(String).join(".");
  return { campo: campo || undefined, error: issue.message };
}

/* ------------------------------------------------------------------ */
/* Modo demo y resolución de cada sucursal                             */
/* ------------------------------------------------------------------ */

/** Sucursales simuladas: solo con TIENDA_MOCK=1 y nunca en el entorno de producción de Vercel. */
export function mockHabilitado(): boolean {
  return process.env.TIENDA_MOCK === "1" && process.env.VERCEL_ENV !== "production";
}

type Destino = { base: string; secreto: string; mock: boolean };

function resolverDestino(sucursal: SucursalId, origen: string): Destino | null {
  if (mockHabilitado()) {
    return {
      base: `${origen.replace(/\/+$/, "")}/api/mock-sucursal/${sucursal}`,
      secreto: `mock-secret-${sucursal}`,
      mock: true,
    };
  }
  const { envKey } = getSucursal(sucursal);
  const base = process.env[`SUCURSAL_${envKey}_API_URL`]?.trim().replace(/\/+$/, "");
  const secreto = process.env[`SUCURSAL_${envKey}_API_SECRET`]?.trim();
  if (!base || !secreto) return null;
  return { base, secreto, mock: false };
}

/* ------------------------------------------------------------------ */
/* Llamada genérica                                                    */
/* ------------------------------------------------------------------ */

function noDisponible<T>(sucursal: SucursalId, operacion: string, detalle: string): ResultadoSucursal<T> {
  // Solo detalle técnico: nunca el secreto, el body ni el token.
  console.error(`[tienda] sucursal=${sucursal} ${operacion}: ${detalle}`);
  return { ok: false, status: 503, codigo: "sucursal_no_disponible", error: MENSAJE_NO_DISPONIBLE };
}

type Llamada<T> = {
  sucursal: SucursalId;
  origen: string;
  /** Para los logs, sin datos sensibles: "GET catalogo" */
  operacion: string;
  metodo: "GET" | "POST";
  ruta: string;
  schema: z.ZodType<T>;
  body?: unknown;
  headers?: Record<string, string>;
};

async function llamar<T>(ll: Llamada<T>): Promise<ResultadoSucursal<T>> {
  const destino = resolverDestino(ll.sucursal, ll.origen);
  if (!destino) {
    return noDisponible(ll.sucursal, ll.operacion, "falta SUCURSAL_<envKey>_API_URL o _API_SECRET");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${destino.secreto}`,
    "X-Contrato-Version": String(CONTRATO_VERSION),
    Accept: "application/json",
    ...ll.headers,
  };
  if (ll.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${destino.base}${ll.ruta}`, {
      method: ll.metodo,
      headers,
      body: ll.body === undefined ? undefined : JSON.stringify(ll.body),
      cache: "no-store",
      // Una redirección podría mandar el secreto a otro lado: la tratamos como falla.
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const nombre = e instanceof Error ? e.name : "Error";
    const detalle = nombre === "TimeoutError" ? `timeout de ${TIMEOUT_MS} ms` : `fetch falló (${nombre})`;
    return noDisponible(ll.sucursal, ll.operacion, detalle);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return noDisponible(ll.sucursal, ll.operacion, `HTTP ${res.status} con cuerpo que no es JSON`);
  }

  if (res.ok) {
    const parsed = ll.schema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return noDisponible(
        ll.sucursal,
        ll.operacion,
        `HTTP ${res.status} con respuesta fuera de contrato (${issue?.path.join(".") || "raíz"}: ${issue?.code ?? "?"})`,
      );
    }
    return { ok: true, data: parsed.data, status: res.status };
  }

  const err = ErrorRespuestaSchema.safeParse(json);
  if (!err.success) {
    return noDisponible(ll.sucursal, ll.operacion, `HTTP ${res.status} con error fuera de contrato`);
  }
  if (err.data.codigo === "no_autorizado") {
    // El secreto no coincide: es un problema de configuración nuestro, no del cliente.
    return noDisponible(ll.sucursal, ll.operacion, "la sucursal rechazó el secreto (401 no_autorizado)");
  }
  if (res.status >= 500) {
    console.error(`[tienda] sucursal=${ll.sucursal} ${ll.operacion}: HTTP ${res.status} ${err.data.codigo}`);
  }
  return {
    ok: false,
    status: res.status,
    codigo: err.data.codigo,
    error: err.data.error,
    ...(err.data.campo ? { campo: err.data.campo } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Catálogo con caché en memoria (TTL 60 s + stale-if-error 10 min)    */
/* ------------------------------------------------------------------ */

type EntradaCatalogo = { catalogo: Catalogo; at: number };
type CacheCatalogo = {
  entradas: Map<string, EntradaCatalogo>;
  /** Pedidos en vuelo, para no golpear a la sucursal N veces a la vez. */
  enVuelo: Map<string, Promise<ResultadoSucursal<Catalogo>>>;
};

const CLAVE_CACHE = "__lveCacheCatalogo";
const g = globalThis as typeof globalThis & { [CLAVE_CACHE]?: CacheCatalogo };

function cacheCatalogo(): CacheCatalogo {
  g[CLAVE_CACHE] ??= { entradas: new Map(), enVuelo: new Map() };
  return g[CLAVE_CACHE];
}

function claveCatalogo(sucursal: SucursalId): string {
  return `${mockHabilitado() ? "mock" : "real"}:${sucursal}`;
}

/** Olvida el catálogo cacheado (lo usa el panel de sucursales simuladas al cambiar la config). */
export function invalidarCatalogo(sucursal: SucursalId): void {
  const c = cacheCatalogo();
  c.entradas.delete(`mock:${sucursal}`);
  c.entradas.delete(`real:${sucursal}`);
}

export async function obtenerCatalogo(
  sucursal: SucursalId,
  opts: { origen: string },
): Promise<ResultadoSucursal<Catalogo>> {
  const c = cacheCatalogo();
  const clave = claveCatalogo(sucursal);
  const ahora = Date.now();
  const previa = c.entradas.get(clave);
  if (previa && ahora - previa.at < CATALOGO_TTL_MS) {
    return { ok: true, data: previa.catalogo, status: 200 };
  }

  let pedido = c.enVuelo.get(clave);
  if (!pedido) {
    pedido = llamar({
      sucursal,
      origen: opts.origen,
      operacion: "GET catalogo",
      metodo: "GET",
      ruta: "/api/tienda/publico/catalogo",
      schema: CatalogoSchema,
    }).finally(() => c.enVuelo.delete(clave));
    c.enVuelo.set(clave, pedido);
  }
  const r = await pedido;

  if (r.ok) {
    c.entradas.set(clave, { catalogo: r.data, at: Date.now() });
    return r;
  }
  const ultima = c.entradas.get(clave);
  if (ultima && Date.now() - ultima.at < CATALOGO_STALE_MAX_MS) {
    console.error(`[tienda] sucursal=${sucursal} GET catalogo: sirviendo catálogo viejo (${r.codigo})`);
    return { ok: true, data: ultima.catalogo, status: 200 };
  }
  return r;
}

/* ------------------------------------------------------------------ */
/* Ventas                                                              */
/* ------------------------------------------------------------------ */

export async function crearVenta(
  sucursal: SucursalId,
  body: CrearVentaBody,
  opts: { origen: string; ipCliente?: string },
): Promise<ResultadoSucursal<CrearVentaRespuesta>> {
  return llamar({
    sucursal,
    origen: opts.origen,
    operacion: "POST ventas",
    metodo: "POST",
    ruta: "/api/tienda/publico/ventas",
    schema: CrearVentaRespuestaSchema,
    body,
    headers: opts.ipCliente ? { "X-Cliente-IP": opts.ipCliente } : undefined,
  });
}

export async function consultarVenta(
  sucursal: SucursalId,
  codigo: string,
  token: string,
  opts: { origen: string; ipCliente?: string },
): Promise<ResultadoSucursal<{ venta: VentaPublica }>> {
  return llamar({
    sucursal,
    origen: opts.origen,
    operacion: `GET ventas/${codigo}`,
    metodo: "GET",
    ruta: `/api/tienda/publico/ventas/${encodeURIComponent(codigo)}`,
    schema: ConsultarVentaRespuestaSchema,
    headers: {
      [HEADER_TOKEN_VENTA]: token,
      ...(opts.ipCliente ? { "X-Cliente-IP": opts.ipCliente } : {}),
    },
  });
}
