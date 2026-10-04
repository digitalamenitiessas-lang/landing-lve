/**
 * Datos DEMO de las sucursales simuladas. Nada de esto es real: precios, alias,
 * CBU y WhatsApp son de mentira y solo existen con TIENDA_MOCK=1.
 */
import type { Catalogo, Producto } from "../contrato";
import { CONTRATO_VERSION } from "../contrato";
import { getSucursal, type SucursalId } from "@/config/sucursales";

/** Prefijo del código humano de cada venta: WEB-SF-0001, WEB-24-0001. */
export const PREFIJO_CODIGO: Record<SucursalId, string> = {
  "santa-fe": "WEB-SF-",
  "24-de-septiembre": "WEB-24-",
};

const DEMO: Record<
  SucursalId,
  { precio: number; alias: string; cbu: string; whatsapp: string }
> = {
  "santa-fe": {
    precio: 9800,
    alias: "LVE.SANTAFE.DEMO",
    cbu: "0000003100000000000001",
    whatsapp: "5493810000000",
  },
  "24-de-septiembre": {
    precio: 9800,
    alias: "LVE.24.DEMO",
    cbu: "0000003100000000000024",
    whatsapp: "5493810000024",
  },
};

function productoDemo(sucursal: SucursalId): Producto {
  return {
    id: `demo-${sucursal}-cafe-1-4`,
    slug: "cafe-1-4",
    nombre: "Café de la casa · 1/4 kg",
    descripcion: "El mismo café que servimos en la barra. Bolsa de 250 g.",
    presentacion: "250 g",
    precio: DEMO[sucursal].precio,
    disponible: true,
    max_por_pedido: 6,
    opciones: [
      {
        id: "molienda",
        nombre: "Molienda",
        requerida: true,
        valores: [
          { id: "grano", nombre: "En grano" },
          { id: "espresso", nombre: "Molido para espresso" },
          { id: "moka", nombre: "Molido para cafetera italiana" },
          { id: "filtro", nombre: "Molido para filtro (V60, Chemex, goteo)" },
          { id: "prensa", nombre: "Molido para prensa francesa" },
        ],
      },
    ],
  };
}

/** Catálogo inicial (o después de un reset) de la sucursal simulada. */
export function catalogoDemo(sucursal: SucursalId): Catalogo {
  const d = DEMO[sucursal];
  return {
    version: CONTRATO_VERSION,
    venta_habilitada: true,
    mensaje: null,
    productos: [productoDemo(sucursal)],
    pago: {
      alias: d.alias,
      cbu: d.cbu,
      titular: "La Vieja Escuela (DEMO)",
      banco: "Banco Demo",
      cuit: null,
    },
    whatsapp: d.whatsapp,
    retiro: {
      direccion: getSucursal(sucursal).direccion,
      horario: "DEMO · de lunes a sábado (horario a confirmar)",
      indicaciones: "Pedilo en la barra con tu código.",
    },
    vencimiento_horas: 48,
  };
}
