import type { Sucursal } from "@/config/sucursales";
import type { VentaPublica } from "@/lib/tienda/contrato";
import { formatPesos } from "@/lib/formato";

/**
 * Mensaje listo para mandar con el comprobante. La dirección es la de los
 * afiches (sucursal.direccion), tal cual, para que no haya dudas de dónde se retira.
 */
export function mensajeComprobante(venta: VentaPublica, sucursal: Sucursal): string {
  const items = venta.items.map((item) => {
    const detalle = item.detalle?.trim() ? ` (${item.detalle.trim()})` : "";
    return `• ${item.cantidad} × ${item.nombre}${detalle}`;
  });
  return [
    `¡Hola, La Vieja Escuela! Te mando el comprobante de mi pedido *${venta.codigo}*:`,
    ...items,
    `Total: ${formatPesos(venta.total)}`,
    `A nombre de: ${venta.cliente_nombre}`,
    `Retiro en: ${sucursal.direccion}`,
    "(Te adjunto la captura de la transferencia)",
  ].join("\n");
}

/** https://wa.me/{solo dígitos}?text={texto codificado} */
export function linkWhatsApp(numero: string, texto: string): string {
  const digitos = numero.replace(/\D/g, "");
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}
