/**
 * Utilidades del formulario de pedido (sin React): mensajes de error,
 * mapeo de campos del servidor, opciones y "recordar mis datos".
 */
import type { CodigoErrorLanding } from "@/lib/tienda/api-landing";
import type { Opcion, OpcionValor, Producto } from "@/lib/tienda/contrato";

/* ------------------------------------------------------------------ */
/* Campos del formulario                                               */
/* ------------------------------------------------------------------ */

export type CampoDato = "nombre" | "telefono" | "email" | "nota";
/** Campos con error propio: datos, cantidad, sucursal u `opcion:{id}`. */
export type CampoForm = CampoDato | "sucursal" | "cantidad" | `opcion:${string}`;
export type ErroresCampo = Partial<Record<CampoForm, string>>;

/** Traduce el `campo` que devuelve el servidor al campo del formulario. */
export function campoDelServidor(campo: string | undefined): CampoForm | null {
  if (!campo) return null;
  switch (campo) {
    case "cliente.nombre":
      return "nombre";
    case "cliente.telefono":
      return "telefono";
    case "cliente.email":
      return "email";
    case "nota":
      return "nota";
    case "items.0.cantidad":
      return "cantidad";
  }
  const opcion = /^items\.0\.opciones\.(.+)$/.exec(campo);
  if (opcion?.[1]) return `opcion:${opcion[1]}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Mensajes de error                                                   */
/* ------------------------------------------------------------------ */

export const MENSAJE_SIN_CONEXION =
  "No pudimos conectarnos. Revisá tu conexión a internet y volvé a tocar el botón.";

const MENSAJES: Partial<Record<CodigoErrorLanding, string>> = {
  sucursal_no_disponible:
    "No pudimos conectar con la sucursal. Probá de nuevo en un rato o elegí la otra.",
  no_autorizado: "No pudimos conectar con la sucursal. Probá de nuevo en un rato o elegí la otra.",
  error_interno: "Algo falló del lado de la sucursal. Probá de nuevo en un rato o elegí la otra.",
  venta_deshabilitada:
    "Esta sucursal pausó la venta de café por ahora. Probá en la otra o volvé más tarde.",
  producto_no_disponible:
    "El café no está disponible en esta sucursal en este momento. Probá en la otra o más tarde.",
  demasiados_pedidos:
    "Ya tenés pedidos pendientes con este número. Pagá o esperá a que venzan antes de hacer uno nuevo.",
  demasiados_intentos: "Hiciste muchos intentos seguidos. Esperá un minuto y probá de nuevo.",
  solicitud_rechazada:
    "No pudimos tomar el pedido. Esperá unos segundos y probá de nuevo; si sigue pasando, recargá la página.",
  sucursal_desconocida: "Esa sucursal no existe. Elegí una de las dos de la lista.",
  datos_invalidos: "Revisá los datos del pedido.",
  opcion_invalida: "Revisá las opciones del café.",
};

export function mensajeDeError(codigo: CodigoErrorLanding | undefined, error?: string): string {
  if (codigo && MENSAJES[codigo]) {
    // Para errores de validación el texto del servidor es más preciso.
    if ((codigo === "datos_invalidos" || codigo === "opcion_invalida") && error) return error;
    return MENSAJES[codigo]!;
  }
  return error || "Algo salió mal. Probá de nuevo en un rato.";
}

/* ------------------------------------------------------------------ */
/* Producto y opciones                                                 */
/* ------------------------------------------------------------------ */

export const SLUG_CAFE = "cafe-1-4";

export function elegirProducto(productos: readonly Producto[]): Producto | null {
  return productos.find((p) => p.slug === SLUG_CAFE) ?? productos[0] ?? null;
}

/** Tope de cantidad: lo que diga la sucursal, sin pasar el máximo del contrato (20). */
export function cantidadMaxima(producto: Producto | null): number {
  if (!producto) return 1;
  return Math.max(1, Math.min(producto.max_por_pedido, 20));
}

function esMolienda(opcion: Opcion): boolean {
  return /moli/i.test(opcion.id) || /moli/i.test(opcion.nombre);
}

function esEnGrano(valor: OpcionValor): boolean {
  return /grano/i.test(valor.id) || /grano/i.test(valor.nombre);
}

/** "Espresso" → "espresso"; "V60" queda igual. */
function minusculaInicial(texto: string): string {
  if (/^\p{Lu}\p{Ll}/u.test(texto)) {
    return texto[0]!.toLowerCase() + texto.slice(1);
  }
  return texto;
}

export type ValorVisible = { id: string; etiqueta: string };

/** Valores de una opción listos para mostrar. En la molienda, "En grano" va primero y el resto como "Molido para…". */
export function valoresVisibles(opcion: Opcion): ValorVisible[] {
  if (!esMolienda(opcion)) {
    return opcion.valores.map((v) => ({ id: v.id, etiqueta: v.nombre }));
  }
  const grano = opcion.valores.filter(esEnGrano);
  const resto = opcion.valores.filter((v) => !esEnGrano(v));
  return [
    ...grano.map((v) => ({ id: v.id, etiqueta: "En grano" })),
    ...resto.map((v) => ({
      id: v.id,
      etiqueta: /^molid/i.test(v.nombre) ? v.nombre : `Molido para ${minusculaInicial(v.nombre)}`,
    })),
  ];
}

export function etiquetaValor(opcion: Opcion, valorId: string): string | null {
  return valoresVisibles(opcion).find((v) => v.id === valorId)?.etiqueta ?? null;
}

/** Deja solo las elecciones que existen en el producto; si una opción requerida tiene un único valor, lo elige. */
export function normalizarOpciones(
  producto: Producto | null,
  elegidas: Record<string, string>,
): Record<string, string> {
  if (!producto) return elegidas;
  const salida: Record<string, string> = {};
  for (const opcion of producto.opciones) {
    const actual = elegidas[opcion.id];
    if (actual && opcion.valores.some((v) => v.id === actual)) salida[opcion.id] = actual;
    else if (opcion.requerida && opcion.valores.length === 1) salida[opcion.id] = opcion.valores[0]!.id;
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Idempotencia                                                        */
/* ------------------------------------------------------------------ */

/** UUID v4. `crypto.randomUUID` solo existe en contextos seguros: si falta, lo armamos a mano. */
export function nuevaClave(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* ------------------------------------------------------------------ */
/* Recordar mis datos                                                  */
/* ------------------------------------------------------------------ */

const CLAVE_DATOS = "lve:datos-cliente";

export type DatosRecordados = { nombre: string; telefono: string; email: string };

export function leerDatosRecordados(): DatosRecordados | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_DATOS);
    if (!crudo) return null;
    const d = JSON.parse(crudo) as Partial<Record<keyof DatosRecordados, unknown>>;
    const texto = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
    return { nombre: texto(d.nombre), telefono: texto(d.telefono), email: texto(d.email) };
  } catch {
    return null;
  }
}

export function guardarDatosRecordados(datos: DatosRecordados): void {
  try {
    window.localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
  } catch {
    /* modo privado o almacenamiento bloqueado: no pasa nada */
  }
}

export function borrarDatosRecordados(): void {
  try {
    window.localStorage.removeItem(CLAVE_DATOS);
  } catch {
    /* idem */
  }
}
