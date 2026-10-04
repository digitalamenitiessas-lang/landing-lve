/**
 * Sucursal simulada · panel de demo (/dev/sucursales).
 *   GET  → estado del panel (config + ventas)
 *   POST → { accion: 'estado', codigo, estado } | { accion: 'config', ... } | { accion: 'reset' }
 * Sin secreto a propósito: solo existe con TIENDA_MOCK=1 fuera de producción y
 * maneja datos de mentira. Un sistema real NUNCA expone algo así sin login.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { EstadoVentaSchema } from "@/lib/tienda/contrato";
import { ERRORES_ES, invalidarCatalogo, primerProblema } from "@/lib/tienda/cliente";
import { accionAdminMock, panelMock } from "@/lib/tienda/mock/store";
import { jsonMock, sucursalMock } from "@/lib/tienda/mock/http";
import type { RespuestaAdmin } from "@/lib/tienda/mock/tipos";

export const dynamic = "force-dynamic";

const AccionSchema = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("estado"),
    codigo: z.string().min(3).max(40),
    estado: EstadoVentaSchema,
  }),
  z.object({
    accion: z.literal("config"),
    venta_habilitada: z.boolean().optional(),
    precio: z.number().int().min(0).max(10_000_000).optional(),
    disponible: z.boolean().optional(),
    mensaje: z.string().max(200).nullable().optional(),
  }),
  z.object({ accion: z.literal("reset") }),
]);

function responder(r: RespuestaAdmin, status = 200): Response {
  return jsonMock(r, status);
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mock-sucursal/[sucursal]/admin">) {
  const sucursal = sucursalMock((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;
  return responder({ ok: true, panel: panelMock(sucursal) });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mock-sucursal/[sucursal]/admin">) {
  const sucursal = sucursalMock((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return responder({ ok: false, codigo: "datos_invalidos", error: "El cuerpo no es JSON válido." }, 400);
  }
  const parsed = AccionSchema.safeParse(body, { error: ERRORES_ES });
  if (!parsed.success) {
    const p = primerProblema(parsed.error);
    return responder(
      { ok: false, codigo: "datos_invalidos", error: p.campo ? `${p.campo}: ${p.error}` : p.error },
      400,
    );
  }

  const r = accionAdminMock(sucursal, parsed.data);
  // La landing cachea el catálogo 60 s: que los cambios del panel se vean al toque.
  if (parsed.data.accion !== "estado") invalidarCatalogo(sucursal);
  if (!r.ok) return responder({ ok: false, codigo: r.codigo, error: r.error }, r.status);
  return responder({ ok: true, panel: r.panel });
}
