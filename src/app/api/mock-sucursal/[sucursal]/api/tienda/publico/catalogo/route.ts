/**
 * Sucursal simulada · GET /api/tienda/publico/catalogo (contrato v1).
 * Solo existe con TIENDA_MOCK=1 fuera de producción.
 */
import type { NextRequest } from "next/server";
import { catalogoMock } from "@/lib/tienda/mock/store";
import { chequearContrato, demora, jsonMock, sucursalMock } from "@/lib/tienda/mock/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/mock-sucursal/[sucursal]/api/tienda/publico/catalogo">,
) {
  const sucursal = sucursalMock((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;
  const rechazo = chequearContrato(req, sucursal);
  if (rechazo) return rechazo;

  await demora();
  return jsonMock(catalogoMock(sucursal));
}
