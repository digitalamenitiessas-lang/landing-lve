/**
 * Sucursal simulada · GET /api/tienda/publico/ventas/{codigo} (contrato v1).
 * Requiere X-Venta-Token. Solo existe con TIENDA_MOCK=1 fuera de producción.
 */
import type { NextRequest } from "next/server";
import { HEADER_TOKEN_VENTA } from "@/lib/tienda/api-landing";
import { consultarVentaMock } from "@/lib/tienda/mock/store";
import { chequearContrato, demora, jsonMock, sucursalMock } from "@/lib/tienda/mock/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/mock-sucursal/[sucursal]/api/tienda/publico/ventas/[codigo]">,
) {
  const { sucursal: param, codigo } = await ctx.params;
  const sucursal = sucursalMock(param);
  if (sucursal instanceof Response) return sucursal;
  const rechazo = chequearContrato(req, sucursal);
  if (rechazo) return rechazo;

  await demora();
  const r = consultarVentaMock(sucursal, codigo, req.headers.get(HEADER_TOKEN_VENTA));
  return jsonMock(r.body, r.status);
}
