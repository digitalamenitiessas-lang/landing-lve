/**
 * Datos fijos de cada sucursal (lo que no cambia seguido).
 * Precio, alias, CBU, WhatsApp y horario de retiro NO van acá: los carga cada
 * sucursal en su propio sistema y llegan por el contrato (ver lib/tienda/contrato.ts).
 */

export type SucursalId = "santa-fe" | "24-de-septiembre";

export type Sucursal = {
  id: SucursalId;
  /** Nombre corto para chips y selects */
  nombre: string;
  /** Dirección tal como figura en los afiches */
  direccion: string;
  ciudad: string;
  /** Apodo para el tono de la marca */
  apodo: string;
  descripcion: string;
  mapsUrl: string;
  /**
   * Prefijo de las variables de entorno de esta sucursal:
   * SUCURSAL_<envKey>_API_URL y SUCURSAL_<envKey>_API_SECRET
   */
  envKey: string;
  /** Repo del sistema interno, solo como referencia para quien mantenga esto */
  sistema: string;
};

const CIUDAD = "San Miguel de Tucumán";

const maps = (consulta: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;

export const SUCURSALES: readonly Sucursal[] = [
  {
    id: "santa-fe",
    nombre: "Santa Fe",
    direccion: "Santa Fe 746",
    ciudad: CIUDAD,
    apodo: "La original",
    descripcion: "Donde empezó todo: mesas rojas, platos de estaño y el primer café de la mañana.",
    mapsUrl: maps(`La Vieja Escuela, Santa Fe 746, ${CIUDAD}`),
    envKey: "SANTA_FE",
    sistema: "sala-de-profes-LVE",
  },
  {
    id: "24-de-septiembre",
    nombre: "24 de Septiembre",
    direccion: "24 de Septiembre y Chacabuco",
    ciudad: CIUDAD,
    apodo: "El nuevo punto de encuentro",
    descripcion: "La misma escuela, un aula nueva. Guardate esta dirección.",
    mapsUrl: maps(`24 de Septiembre y Chacabuco, ${CIUDAD}`),
    envKey: "24",
    sistema: "sala-de-profes-24",
  },
] as const;

export function esSucursalId(valor: string): valor is SucursalId {
  return SUCURSALES.some((s) => s.id === valor);
}

export function getSucursal(id: SucursalId): Sucursal {
  const s = SUCURSALES.find((x) => x.id === id);
  if (!s) throw new Error(`Sucursal desconocida: ${id}`);
  return s;
}

export const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/laviejaescuelatuc/";
