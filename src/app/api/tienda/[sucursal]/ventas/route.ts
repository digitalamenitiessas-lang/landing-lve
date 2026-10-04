/**
 * POST /api/tienda/{sucursal}/ventas  (body: CrearVentaLandingBody) → RespuestaCrearVenta
 *
 * Orden de chequeos: sucursal → mismo origen + Content-Type JSON → JSON →
 * antispam (honeypot + tiempo mínimo) → validación del contrato → límite por IP →
 * reenvío a la sucursal.
 * Nunca se loguean nombre, teléfono ni email.
 */
import type { NextRequest } from "next/server";
import { rutaTicket, type CodigoErrorLanding, type RespuestaCrearVenta } from "@/lib/tienda/api-landing";
import { CrearVentaBodySchema } from "@/lib/tienda/contrato";
import { crearVenta, ERRORES_ES, invalidarCatalogo, primerProblema } from "@/lib/tienda/cliente";
import { devolver, permitir } from "@/lib/tienda/limite";
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
/**
 * t0 viene del reloj del dispositivo y se compara con el del servidor. Un reloj
 * adelantado deja `transcurrido` negativo: ahí no podemos medir nada y lo dejamos
 * pasar (castigarlo bloqueaba para siempre a quien tiene la hora mal, sin frenar a
 * ningún bot, que controla t0 igual). Solo descartamos lo absurdo (más de 24 h en
 * el futuro). Tradeoff aceptado: el tiempo mínimo solo frena bots ingenuos; algo
 * más fuerte necesitaría un t0 firmado por el servidor.
 */
const DESFASE_MAXIMO_MS = 24 * 60 * 60_000;
/** Pedidos distintos (idempotency_key distintas) por IP y sucursal. */
const LIMITE_POR_IP = 5;
/** Tope de requests de cualquier tipo por IP (incluye reintentos con la misma clave). */
const LIMITE_TOTAL_POR_IP = 20;
const VENTANA_IP_MS = 10 * 60_000;

const RECHAZADA = "No pudimos procesar el pedido. Recargá la página y probá de nuevo.";

/**
 * Rechazos de la sucursal que el cliente corrige reintentando (dato mal cargado o
 * catálogo desactualizado): no gastan cupo del límite por IP.
 */
const RECHAZOS_SIN_COSTO: ReadonlySet<CodigoErrorLanding> = new Set<CodigoErrorLanding>([
  "datos_invalidos",
  "opcion_invalida",
  "producto_no_disponible",
  "venta_deshabilitada",
]);
/** Rechazos que indican que el catálogo cacheado ya no refleja la sucursal. */
const RECHAZOS_DE_CATALOGO: ReadonlySet<CodigoErrorLanding> = new Set<CodigoErrorLanding>([
  "opcion_invalida",
  "producto_no_disponible",
  "venta_deshabilitada",
]);

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * true si el request no viene del formulario de esta misma landing: otro sitio
 * (Sec-Fetch-Site cross-site u Origin de otro host) o un body que no se declara
 * JSON (los "simple requests" text/plain no pasan por preflight CORS).
 */
function esDeOtroOrigen(req: NextRequest): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (origin === null) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return true; // "null" u Origin ilegible
  }
  const propios = [req.headers.get("x-forwarded-host"), req.headers.get("host"), req.nextUrl.host];
  return !propios.some((h) => h !== null && h.split(",")[0]?.trim().toLowerCase() === host.toLowerCase());
}

function esJson(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return ct.toLowerCase().split(";")[0]?.trim() === "application/json";
}

/** true si el envío parece de un bot (honeypot con algo o ausente, o enviado demasiado rápido). */
function pareceBot(body: Record<string, unknown>): boolean {
  const { hp, t0 } = body;
  // El formulario siempre manda los dos: que falten ya es sospechoso.
  if (typeof hp !== "string" || hp !== "") return true;
  if (typeof t0 !== "number" || !Number.isFinite(t0)) return true;
  const transcurrido = Date.now() - t0;
  if (transcurrido < -DESFASE_MAXIMO_MS) return true;
  // Reloj del dispositivo adelantado: no se puede medir, lo dejamos pasar.
  if (transcurrido < 0) return false;
  return transcurrido < TIEMPO_MINIMO_MS;
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/tienda/[sucursal]/ventas">) {
  const sucursal = validarSucursal((await ctx.params).sucursal);
  if (sucursal instanceof Response) return sucursal;

  if (esDeOtroOrigen(req)) return errorLanding(403, "solicitud_rechazada", RECHAZADA);
  if (!esJson(req)) return errorLanding(415, "solicitud_rechazada", RECHAZADA);

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
  // Un reintento con la misma idempotency_key (error de red, 503) tampoco: solo suma
  // al tope total, que protege a la sucursal de repeticiones sin fin.
  const ip = ipDe(req);
  const clavePedidos = `ventas:${sucursal}:${ip}`;
  const idPedido = parsed.data.idempotency_key;
  if (
    !permitir(`ventas-total:${ip}`, LIMITE_TOTAL_POR_IP, VENTANA_IP_MS) ||
    !permitir(clavePedidos, LIMITE_POR_IP, VENTANA_IP_MS, idPedido)
  ) {
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
  if (!r.ok) {
    if (RECHAZOS_DE_CATALOGO.has(r.codigo)) {
      // Que la recarga del formulario traiga el catálogo actual y no el cacheado.
      invalidarCatalogo(sucursal);
    }
    if (RECHAZOS_SIN_COSTO.has(r.codigo)) devolver(clavePedidos, idPedido);
    return errorDeSucursal(r);
  }

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
