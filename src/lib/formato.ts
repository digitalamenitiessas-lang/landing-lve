const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** 9500 → "$ 9.500" */
export function formatPesos(monto: number): string {
  return pesos.format(Math.round(monto));
}

/** 9500 → "9500" (lo que se pega en la app del banco) */
export function montoParaTransferir(monto: number): string {
  return Number.isInteger(monto) ? String(monto) : monto.toFixed(2).replace(".", ",");
}

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Tucuman",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** ISO → "lunes 6 de octubre, 18:30" (hora de Tucumán) */
export function formatFechaHora(iso: string): string {
  return fechaHora.format(new Date(iso));
}

/** "Juan Pérez" → "Juan" */
export function nombreDePila(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
