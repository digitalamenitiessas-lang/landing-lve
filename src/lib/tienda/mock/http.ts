/**
 * Helpers HTTP de las rutas de la sucursal simulada (/api/mock-sucursal/...).
 */
import "server-only";

import { timingSafeEqual } from "node:crypto";
import { esSucursalId, type SucursalId } from "@/config/sucursales";
import { CONTRATO_VERSION, type ErrorRespuesta } from "../contrato";
import { mockHabilitado } from "../cliente";

const SIN_CACHE = { "Cache-Control": "no-store" } as const;

/** Latencia simulada para que se vean los estados de carga de la landing. */
export function demora(ms = 350): Promise<void> {
  const jitter = Math.round(ms * 0.3 * (Math.random() - 0.5));
  return new Promise((r) => setTimeout(r, ms + jitter));
}

export function jsonMock(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: SIN_CACHE });
}

export function errorMock(status: number, body: ErrorRespuesta): Response {
  return jsonMock(body, status);
}

/** 404 "pelado", igual al de una ruta que no existe. */
export function noExiste(): Response {
  return new Response("Not Found", { status: 404, headers: SIN_CACHE });
}

/**
 * Valida que el modo demo esté activo y que la sucursal exista.
 * Devuelve el id o una Response 404 para cortar.
 */
export function sucursalMock(param: string): SucursalId | Response {
  if (!mockHabilitado() || !esSucursalId(param)) return noExiste();
  return param;
}

function igual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Chequeos de contrato: Authorization: Bearer mock-secret-<sucursal> y, si viene,
 * X-Contrato-Version igual a la nuestra. Devuelve null si está todo bien.
 */
export function chequearContrato(req: Request, sucursal: SucursalId): Response | null {
  const auth = req.headers.get("authorization") ?? "";
  const esperado = `Bearer mock-secret-${sucursal}`;
  if (!igual(auth, esperado)) {
    return errorMock(401, { error: "Secreto inválido.", codigo: "no_autorizado" });
  }
  const version = req.headers.get("x-contrato-version");
  if (version !== null && version !== String(CONTRATO_VERSION)) {
    return errorMock(400, {
      error: `Versión de contrato no soportada (esperada ${CONTRATO_VERSION}).`,
      codigo: "datos_invalidos",
      campo: "X-Contrato-Version",
    });
  }
  return null;
}
