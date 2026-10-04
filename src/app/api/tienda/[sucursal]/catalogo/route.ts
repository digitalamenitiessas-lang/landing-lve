/**
 * GET /api/tienda/{sucursal}/catalogo → RespuestaCatalogo
 * El catálogo público va SIN datos de pago ni WhatsApp: esos llegan con la venta.
 */
import type { NextRequest } from "next/server";
import type { RespuestaCatalogo } from "@/lib/tienda/api-landing";
import { obtenerCatalogo } from "@/lib/tienda/cliente";
import { errorDeSucursal, origenDe, validarSucursal } from "../../_comun";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/tienda/[sucursal]/catalogo">) {
  const sucursal = validarSucursal((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;

  const r = await obtenerCatalogo(sucursal, { origen: origenDe(req) });
  if (!r.ok) return errorDeSucursal(r);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pago, whatsapp, version, ...catalogo } = r.data;
  const body: RespuestaCatalogo = { ok: true, catalogo };
  return Response.json(body, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
