/**
 * Contrato v1 entre la landing y el sistema de cada sucursal (Sala de Profes).
 *
 * La landing NO guarda pedidos: cada venta vive en la base de la sucursal donde
 * se compró. La sucursal expone tres endpoints protegidos con un secreto
 * compartido (ver integracion-sucursales/CONTRATO.md):
 *
 *   GET  {base}/api/tienda/publico/catalogo
 *   POST {base}/api/tienda/publico/ventas
 *   GET  {base}/api/tienda/publico/ventas/{codigo}      (header X-Venta-Token)
 *
 * Headers en todas las llamadas:
 *   Authorization: Bearer <TIENDA_API_SECRET de esa sucursal>
 *   X-Contrato-Version: 1
 *
 * Este archivo es la fuente de verdad de las formas de datos. El kit de
 * integración para las sucursales repite estos tipos; si cambian acá, cambian allá.
 */
import { z } from "zod";

export const CONTRATO_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

export const EstadoVentaSchema = z.enum([
  "pendiente_pago",
  "pagado",
  "retirado",
  "cancelado",
]);
export type EstadoVenta = z.infer<typeof EstadoVentaSchema>;

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

export const OpcionValorSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
});

export const OpcionSchema = z.object({
  /** p. ej. "molienda" */
  id: z.string().min(1),
  /** p. ej. "Molienda" */
  nombre: z.string().min(1),
  requerida: z.boolean(),
  valores: z.array(OpcionValorSchema).min(1),
});

export const ProductoSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().nullable(),
  /** p. ej. "250 g" */
  presentacion: z.string().nullable(),
  /** Pesos argentinos, IVA incluido. */
  precio: z.number().nonnegative(),
  disponible: z.boolean(),
  opciones: z.array(OpcionSchema),
  max_por_pedido: z.number().int().positive(),
});

export const DatosPagoSchema = z.object({
  alias: z.string().nullable(),
  cbu: z.string().nullable(),
  titular: z.string().nullable(),
  banco: z.string().nullable(),
  cuit: z.string().nullable(),
});

export const DatosRetiroSchema = z.object({
  direccion: z.string().nullable(),
  horario: z.string().nullable(),
  indicaciones: z.string().nullable(),
});

export const CatalogoSchema = z.object({
  version: z.literal(CONTRATO_VERSION),
  /** Interruptor general de la sucursal: si es false no se aceptan ventas. */
  venta_habilitada: z.boolean(),
  /** Aviso opcional para mostrar arriba del formulario ("Sin stock hasta el lunes"). */
  mensaje: z.string().nullable(),
  productos: z.array(ProductoSchema),
  pago: DatosPagoSchema,
  /** Número de WhatsApp en formato internacional, solo dígitos: 549381XXXXXXX */
  whatsapp: z.string().regex(/^\d{10,15}$/).nullable(),
  retiro: DatosRetiroSchema,
  /** Horas que se reserva un pedido sin pagar antes de cancelarse. */
  vencimiento_horas: z.number().int().positive(),
});

export type OpcionValor = z.infer<typeof OpcionValorSchema>;
export type Opcion = z.infer<typeof OpcionSchema>;
export type Producto = z.infer<typeof ProductoSchema>;
export type DatosPago = z.infer<typeof DatosPagoSchema>;
export type DatosRetiro = z.infer<typeof DatosRetiroSchema>;
export type Catalogo = z.infer<typeof CatalogoSchema>;

/* ------------------------------------------------------------------ */
/* Ventas                                                              */
/* ------------------------------------------------------------------ */

export const ItemVentaSchema = z.object({
  nombre: z.string(),
  /** Opciones elegidas en texto: "Molido para espresso" */
  detalle: z.string().nullable(),
  cantidad: z.number().int().positive(),
  precio_unitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

/** Lo que la sucursal devuelve de una venta. Nunca incluye el teléfono ni el email. */
export const VentaPublicaSchema = z.object({
  /** Código humano, p. ej. "WEB-SF-0042" */
  codigo: z.string().min(3),
  estado: EstadoVentaSchema,
  total: z.number().nonnegative(),
  items: z.array(ItemVentaSchema).min(1),
  /** Solo el nombre de pila, para personalizar el ticket. */
  cliente_nombre: z.string(),
  creado_at: z.string(),
  pagado_at: z.string().nullable(),
  retirado_at: z.string().nullable(),
  cancelado_at: z.string().nullable(),
  vence_at: z.string(),
  pago: DatosPagoSchema,
  whatsapp: z.string().nullable(),
  retiro: DatosRetiroSchema,
});
export type ItemVenta = z.infer<typeof ItemVentaSchema>;
export type VentaPublica = z.infer<typeof VentaPublicaSchema>;

/** Teléfono argentino tal como lo escribe la gente: "381 555-1234", "+54 9 381 5551234". */
export const TELEFONO_REGEX = /^[+]?[\d\s()-]{8,20}$/;

export const ItemPedidoSchema = z.object({
  producto_id: z.string().min(1),
  cantidad: z.number().int().min(1).max(20),
  /** { [opcion.id]: valor.id }, p. ej. { molienda: "espresso" } */
  opciones: z.record(z.string(), z.string()),
});

export const ClienteSchema = z.object({
  nombre: z.string().trim().min(2, "Escribí tu nombre").max(80),
  telefono: z
    .string()
    .trim()
    .regex(TELEFONO_REGEX, "Revisá el teléfono: solo números, con característica"),
  email: z.email("Revisá el email").nullable(),
});

/** Body de POST /api/tienda/publico/ventas */
export const CrearVentaBodySchema = z.object({
  /** UUID v4 generado por la landing; repetir la llamada con la misma clave no duplica la venta. */
  idempotency_key: z.uuid(),
  items: z.array(ItemPedidoSchema).min(1).max(10),
  cliente: ClienteSchema,
  nota: z.string().trim().max(300).nullable(),
  origen: z.literal("landing"),
});
export type ItemPedido = z.infer<typeof ItemPedidoSchema>;
export type Cliente = z.infer<typeof ClienteSchema>;
export type CrearVentaBody = z.infer<typeof CrearVentaBodySchema>;

/** Respuesta 201 (o 200 si es una repetición idempotente) */
export const CrearVentaRespuestaSchema = z.object({
  venta: VentaPublicaSchema,
  /** Secreto para consultar el estado. La sucursal guarda solo su hash. */
  token: z.string().min(32),
});
export type CrearVentaRespuesta = z.infer<typeof CrearVentaRespuestaSchema>;

/** Respuesta 200 de GET /api/tienda/publico/ventas/{codigo} */
export const ConsultarVentaRespuestaSchema = z.object({
  venta: VentaPublicaSchema,
});

/* ------------------------------------------------------------------ */
/* Errores                                                             */
/* ------------------------------------------------------------------ */

export const CODIGOS_ERROR = [
  "no_autorizado", // 401: falta o no coincide el secreto
  "datos_invalidos", // 400: body mal formado; `campo` indica cuál
  "opcion_invalida", // 400: una opción requerida falta o no existe
  "venta_deshabilitada", // 409: la sucursal apagó la venta web
  "producto_no_disponible", // 409: producto inexistente, sin stock o sin precio
  "demasiados_pedidos", // 429: límite de pedidos pendientes por teléfono
  "no_encontrada", // 404: código inexistente o token incorrecto (misma respuesta a propósito)
  "error_interno", // 500
] as const;
export const CodigoErrorSchema = z.enum(CODIGOS_ERROR);
export type CodigoError = z.infer<typeof CodigoErrorSchema>;

export const ErrorRespuestaSchema = z.object({
  error: z.string(),
  codigo: CodigoErrorSchema,
  campo: z.string().optional(),
});
export type ErrorRespuesta = z.infer<typeof ErrorRespuestaSchema>;

/** Status HTTP que corresponde a cada código de error. */
export const STATUS_POR_ERROR: Record<CodigoError, number> = {
  no_autorizado: 401,
  datos_invalidos: 400,
  opcion_invalida: 400,
  venta_deshabilitada: 409,
  producto_no_disponible: 409,
  demasiados_pedidos: 429,
  no_encontrada: 404,
  error_interno: 500,
};
