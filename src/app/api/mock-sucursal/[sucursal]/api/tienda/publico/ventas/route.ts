/**
 * Sucursal simulada · POST /api/tienda/publico/ventas (contrato v1).
 * Solo existe con TIENDA_MOCK=1 fuera de producción.
 */
import type { NextRequest } from "next/server";
import { crearVentaMock } from "@/lib/tienda/mock/store";
import {
  chequearContrato,
  demora,
  errorMock,
  jsonMock,
  sucursalMock,
} from "@/lib/tienda/mock/http";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/mock-sucursal/[sucursal]/api/tienda/publico/ventas">,
) {
  const sucursal = sucursalMock((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;
  const rechazo = chequearContrato(req, sucursal);
  if (rechazo) return rechazo;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorMock(400, { error: "El cuerpo no es JSON válido.", codigo: "datos_invalidos" });
  }

  await demora();
  const r = crearVentaMock(sucursal, body);
  return jsonMock(r.body, r.status);
}
