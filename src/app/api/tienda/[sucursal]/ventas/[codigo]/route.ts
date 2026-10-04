/**
 * GET /api/tienda/{sucursal}/ventas/{codigo}  (header X-Venta-Token) → RespuestaConsultarVenta
 * Código mal formado, token ausente o inválido, venta inexistente: siempre el mismo 404.
 */
import type { NextRequest } from "next/server";
import { HEADER_TOKEN_VENTA, type RespuestaConsultarVenta } from "@/lib/tienda/api-landing";
import { consultarVenta } from "@/lib/tienda/cliente";
import { errorDeSucursal, errorLanding, origenDe, SIN_CACHE, validarSucursal } from "../../../_comun";

export const dynamic = "force-dynamic";

const CODIGO_REGEX = /^[A-Za-z0-9-]{3,40}$/;
const NO_ENCONTRADA =
  "No encontramos ese pedido. Abrí el link completo que te dimos al pedir (o el que te mandamos por WhatsApp).";

function noEncontrada(): Response {
  return errorLanding(404, "no_encontrada", NO_ENCONTRADA);
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/tienda/[sucursal]/ventas/[codigo]">) {
  const { sucursal: param, codigo } = await ctx.params;
  const sucursal = validarSucursal(param);
  if (sucursal instanceof Response) return sucursal;

  const token = req.headers.get(HEADER_TOKEN_VENTA)?.trim() ?? "";
  if (!CODIGO_REGEX.test(codigo) || token.length < 32 || token.length > 200) return noEncontrada();

  const r = await consultarVenta(sucursal, codigo, token, { origen: origenDe(req) });
  if (!r.ok) return r.codigo === "no_encontrada" ? noEncontrada() : errorDeSucursal(r);

  const body: RespuestaConsultarVenta = { ok: true, venta: r.data.venta };
  return Response.json(body, { headers: SIN_CACHE });
}
