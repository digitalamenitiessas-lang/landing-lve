/**
 * Límite de frecuencia por clave (p. ej. IP) con ventana deslizante en memoria.
 *
 * Es BEST-EFFORT: el Map vive en la memoria de la instancia del servidor. En
 * serverless (Vercel) cada instancia tiene su propio Map y se vacía cuando la
 * instancia se recicla, así que un cliente insistente repartido entre varias
 * instancias puede pasar más veces que `max`. Alcanza para frenar el spam
 * casual; la defensa fuerte está del lado de cada sucursal (límite de pedidos
 * pendientes por teléfono). Si algún día hace falta algo estricto, reemplazar
 * por un store compartido (Upstash/Redis) manteniendo esta misma firma.
 */

type Registro = {
  /** Marcas de tiempo (ms) de los intentos aceptados dentro de la ventana. */
  marcas: number[];
  /** Ventana con la que se registró, para poder limpiarlo sin conocerla de afuera. */
  ventanaMs: number;
};

type EstadoLimite = {
  registros: Map<string, Registro>;
  ultimaLimpieza: number;
};

const CLAVE_GLOBAL = "__lveLimiteTienda";
/** Cada cuánto barrer entradas vencidas. */
const LIMPIEZA_CADA_MS = 60_000;
/** Tope de claves en memoria: si se supera, se descartan las más viejas. */
const MAX_CLAVES = 10_000;

const g = globalThis as typeof globalThis & { [CLAVE_GLOBAL]?: EstadoLimite };

function estado(): EstadoLimite {
  g[CLAVE_GLOBAL] ??= { registros: new Map(), ultimaLimpieza: Date.now() };
  return g[CLAVE_GLOBAL];
}

function limpiar(e: EstadoLimite, ahora: number): void {
  if (ahora - e.ultimaLimpieza < LIMPIEZA_CADA_MS && e.registros.size < MAX_CLAVES) return;
  e.ultimaLimpieza = ahora;
  for (const [clave, r] of e.registros) {
    const ultima = r.marcas[r.marcas.length - 1] ?? 0;
    if (ahora - ultima >= r.ventanaMs) e.registros.delete(clave);
  }
  // Si sigue lleno (ataque con muchas claves), soltamos las más antiguas.
  // El Map conserva el orden de inserción.
  if (e.registros.size >= MAX_CLAVES) {
    let sobrante = e.registros.size - Math.floor(MAX_CLAVES * 0.9);
    for (const clave of e.registros.keys()) {
      if (sobrante-- <= 0) break;
      e.registros.delete(clave);
    }
  }
}

/**
 * Registra un intento para `clave` y dice si está permitido: true si hubo menos
 * de `max` intentos aceptados en los últimos `ventanaMs` milisegundos.
 * Los intentos rechazados no cuentan (no alargan el castigo).
 */
export function permitir(clave: string, max: number, ventanaMs: number): boolean {
  const e = estado();
  const ahora = Date.now();
  limpiar(e, ahora);

  const desde = ahora - ventanaMs;
  const r = e.registros.get(clave) ?? { marcas: [], ventanaMs };
  r.ventanaMs = ventanaMs;
  r.marcas = r.marcas.filter((t) => t > desde);

  if (r.marcas.length >= max) {
    e.registros.set(clave, r);
    return false;
  }
  r.marcas.push(ahora);
  // Reinsertar para que el orden del Map refleje la actividad más reciente.
  e.registros.delete(clave);
  e.registros.set(clave, r);
  return true;
}
