/**
 * API interna de la landing (navegador ↔ servidor de la landing).
 * El navegador nunca habla con las sucursales: el servidor de la landing hace de
 * intermediario, agrega el secreto y filtra lo que no tiene que salir.
 *
 *   GET  /api/tienda/{sucursal}/catalogo
 *   POST /api/tienda/{sucursal}/ventas
 *   GET  /api/tienda/{sucursal}/ventas/{codigo}     header X-Venta-Token
 *
 * Todas responden { ok: true, ... } o { ok: false, error, codigo, campo? }.
 */
import type { Catalogo, CodigoError, CrearVentaBody, VentaPublica } from "./contrato";
import type { SucursalId } from "@/config/sucursales";

/** El catálogo sin datos de pago: el alias y el CBU llegan recién con la venta. */
export type CatalogoPublico = Omit<Catalogo, "pago" | "whatsapp" | "version">;

/** Códigos que agrega la landing además de los del contrato. */
export type CodigoErrorLanding =
  | CodigoError
  | "sucursal_desconocida" // 404: el id de sucursal de la URL no existe
  | "sucursal_no_disponible" // 503: la sucursal no está configurada, no responde o respondió algo inválido
  | "demasiados_intentos" // 429: límite por IP en la landing
  | "solicitud_rechazada"; // 400: trampa antispam (honeypot o envío instantáneo); 403/415: no viene del formulario (otro origen o no JSON)

export type ErrorLanding = {
  ok: false;
  error: string;
  codigo: CodigoErrorLanding;
  campo?: string;
};

export type RespuestaCatalogo = { ok: true; catalogo: CatalogoPublico } | ErrorLanding;

/** Body que manda el formulario. `hp` es el honeypot (debe ir vacío) y `t0` el Date.now() de cuando se mostró el formulario. */
export type CrearVentaLandingBody = Omit<CrearVentaBody, "origen"> & {
  hp: string;
  t0: number;
};

export type RespuestaCrearVenta =
  | {
      ok: true;
      venta: VentaPublica;
      token: string;
      /** Ruta del ticket, con el token en el fragmento: /pedido/{sucursal}/{codigo}#t={token} */
      url: string;
    }
  | ErrorLanding;

export type RespuestaConsultarVenta = { ok: true; venta: VentaPublica } | ErrorLanding;

export const HEADER_TOKEN_VENTA = "X-Venta-Token";

export function rutaTicket(sucursal: SucursalId, codigo: string, token?: string): string {
  const base = `/pedido/${sucursal}/${encodeURIComponent(codigo)}`;
  return token ? `${base}#t=${encodeURIComponent(token)}` : base;
}

/** Evento para preseleccionar una sucursal en el formulario desde otra sección. */
export const EVENTO_ELEGIR_SUCURSAL = "lve:elegir-sucursal";
export type DetalleElegirSucursal = { id: SucursalId };
