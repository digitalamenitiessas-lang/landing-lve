/**
 * Helpers compartidos por la API interna de la tienda (/api/tienda/...).
 * No es una ruta: Next solo enruta archivos route.ts.
 */
import "server-only";

import type { NextRequest } from "next/server";
import { esSucursalId, type SucursalId } from "@/config/sucursales";
import type { CodigoErrorLanding, ErrorLanding } from "@/lib/tienda/api-landing";
import type { ResultadoSucursal } from "@/lib/tienda/cliente";

export const SIN_CACHE = { "Cache-Control": "no-store" } as const;

export function errorLanding(
  status: number,
  codigo: CodigoErrorLanding,
  error: string,
  campo?: string,
): Response {
  const body: ErrorLanding = campo ? { ok: false, error, codigo, campo } : { ok: false, error, codigo };
  return Response.json(body, { status, headers: SIN_CACHE });
}

/** Reenvía al navegador el error que devolvió (o que generó) el cliente de sucursales. */
export function errorDeSucursal(r: Extract<ResultadoSucursal<unknown>, { ok: false }>): Response {
  return errorLanding(r.status, r.codigo, r.error, r.campo);
}

/** Valida el id de sucursal de la URL; si no existe, devuelve la Response 404. */
export function validarSucursal(param: string): SucursalId | Response {
  if (esSucursalId(param)) return param;
  return errorLanding(404, "sucursal_desconocida", "No conocemos esa sucursal.");
}

/** Origen del request entrante (para llegar a la sucursal simulada en modo demo). */
export function origenDe(req: NextRequest): string {
  return req.nextUrl.origin;
}

/** IP del cliente: primer valor de x-forwarded-for, si no x-real-ip, si no "desconocida". */
export function ipDe(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const real = req.headers.get("x-real-ip")?.trim();
  return real || "desconocida";
}
