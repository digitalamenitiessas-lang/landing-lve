/**
 * POST /api/tienda/{sucursal}/ventas  (body: CrearVentaLandingBody) → RespuestaCrearVenta
 *
 * Orden de chequeos: sucursal → JSON → antispam (honeypot + tiempo mínimo) →
 * validación del contrato → límite por IP → reenvío a la sucursal.
 * Nunca se loguean nombre, teléfono ni email.
 */
import type { NextRequest } from "next/server";
import { rutaTicket, type RespuestaCrearVenta } from "@/lib/tienda/api-landing";
import { CrearVentaBodySchema } from "@/lib/tienda/contrato";
import { crearVenta, ERRORES_ES, primerProblema } from "@/lib/tienda/cliente";
import { permitir } from "@/lib/tienda/limite";
import {
  errorDeSucursal,
  errorLanding,
  ipDe,
  origenDe,
  SIN_CACHE,
  validarSucursal,
} from "../../_comun";

/** Menos que esto entre que se mostró el formulario y el envío: bot. */
const TIEMPO_MINIMO_MS = 2_500;
/** Tolerancia a relojes adelantados del lado del cliente. */
const DESFASE_MAXIMO_MS = 60_000;
const LIMITE_POR_IP = 5;
const VENTANA_IP_MS = 10 * 60_000;

const RECHAZADA = "No pudimos procesar el pedido. Recargá la página y probá de nuevo.";

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** true si el envío parece de un bot (honeypot con algo, o enviado demasiado rápido). */
function pareceBot(body: Record<string, unknown>): boolean {
  const { hp, t0 } = body;
  if (hp !== undefined && hp !== null && hp !== "") return true;
  if (t0 === undefined || t0 === null) return false;
  if (typeof t0 !== "number" || !Number.isFinite(t0)) return true;
  const transcurrido = Date.now() - t0;
  // t0 más de 60 s en el futuro: reloj imposible o valor inventado.
  if (transcurrido < -DESFASE_MAXIMO_MS) return true;
  // t0 apenas en el futuro (reloj del teléfono un poco adelantado): lo dejamos pasar.
  if (transcurrido < 0) return false;
  return transcurrido < TIEMPO_MINIMO_MS;
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/tienda/[sucursal]/ventas">) {
  const sucursal = validarSucursal((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;

  let crudo: unknown;
  try {
    crudo = await req.json();
  } catch {
    return errorLanding(400, "datos_invalidos", "No pudimos leer el pedido. Probá de nuevo.");
  }
  if (!esObjeto(crudo)) {
    return errorLanding(400, "datos_invalidos", "No pudimos leer el pedido. Probá de nuevo.");
  }

  if (pareceBot(crudo)) return errorLanding(400, "solicitud_rechazada", RECHAZADA);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hp, t0, ...resto } = crudo;
  const parsed = CrearVentaBodySchema.safeParse({ ...resto, origen: "landing" }, { error: ERRORES_ES });
  if (!parsed.success) {
    const p = primerProblema(parsed.error);
    return errorLanding(400, "datos_invalidos", p.error, p.campo);
  }

  // Cuenta solo pedidos bien formados: corregir un dato mal escrito no gasta intentos.
  const ip = ipDe(req);
  if (!permitir(`ventas:${ip}`, LIMITE_POR_IP, VENTANA_IP_MS)) {
    return errorLanding(
      429,
      "demasiados_intentos",
      "Hiciste varios pedidos seguidos. Esperá unos minutos y probá de nuevo.",
    );
  }

  const r = await crearVenta(sucursal, parsed.data, {
    origen: origenDe(req),
    ipCliente: ip === "desconocida" ? undefined : ip,
  });
  if (!r.ok) return errorDeSucursal(r);

  const { venta, token } = r.data;
  const body: RespuestaCrearVenta = {
    ok: true,
    venta,
    token,
    url: rutaTicket(sucursal, venta.codigo, token),
  };
  // 201 si la venta es nueva; 200 si fue una repetición idempotente (misma venta, token nuevo).
  return Response.json(body, { status: r.status === 200 ? 200 : 201, headers: SIN_CACHE });
}
