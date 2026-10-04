/**
 * GET /api/tienda/{sucursal}/ventas/{codigo}  (header X-Venta-Token) → RespuestaConsultarVenta
 * Código mal formado, token ausente o inválido, venta inexistente: siempre el mismo 404.
 */
import type { NextRequest } from "next/server";
import { HEADER_TOKEN_VENTA, type RespuestaConsultarVenta } from "@/lib/tienda/api-landing";
import { consultarVenta } from "@/lib/tienda/cliente";
import { permitir } from "@/lib/tienda/limite";
import { errorDeSucursal, errorLanding, ipDe, origenDe, SIN_CACHE, validarSucursal } from "../../../_comun";

export const dynamic = "force-dynamic";

const CODIGO_REGEX = /^[A-Za-z0-9-]{3,40}$/;
/** Misma regla que aplica la sucursal: un token que no la cumple ni se reenvía. */
const TOKEN_REGEX = /^[A-Za-z0-9_-]{32,128}$/;
/**
 * El ticket consulta cada 15 s con la pestaña visible; 60/min por IP sobra aun con
 * varios clientes detrás de la misma IP (CGNAT) y frena el uso como proxy abierto.
 */
const LIMITE_CONSULTAS_POR_IP = 60;
const VENTANA_CONSULTAS_MS = 60_000;
const NO_ENCONTRADA =
  "No encontramos ese pedido. Abrí el link completo del ticket (el de «Copiar link del ticket») desde el dispositivo donde hiciste el pedido.";

function noEncontrada(): Response {
  return errorLanding(404, "no_encontrada", NO_ENCONTRADA);
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/tienda/[sucursal]/ventas/[codigo]">) {
  const { sucursal: param, codigo } = await ctx.params;
  const sucursal = validarSucursal(param);
  if (sucursal instanceof Response) return sucursal;

  const ip = ipDe(req);
  if (!permitir(`consulta:${ip}`, LIMITE_CONSULTAS_POR_IP, VENTANA_CONSULTAS_MS)) {
    return errorLanding(
      429,
      "demasiados_intentos",
      "Estás consultando muy seguido. Esperá un minuto y probá de nuevo.",
    );
  }

  const token = req.headers.get(HEADER_TOKEN_VENTA)?.trim() ?? "";
  if (!CODIGO_REGEX.test(codigo) || !TOKEN_REGEX.test(token)) return noEncontrada();

  const r = await consultarVenta(sucursal, codigo, token, {
    origen: origenDe(req),
    ipCliente: ip === "desconocida" ? undefined : ip,
  });
  if (!r.ok) return r.codigo === "no_encontrada" ? noEncontrada() : errorDeSucursal(r);

  const body: RespuestaConsultarVenta = { ok: true, venta: r.data.venta };
  return Response.json(body, { headers: SIN_CACHE });
}
