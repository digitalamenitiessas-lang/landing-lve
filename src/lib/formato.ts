const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Para montos con centavos: siempre dos decimales, igual que montoParaTransferir. */
const pesosConCentavos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Redondeado a centavos (evita 9500.499999… y similares). */
const aCentavos = (monto: number) => Math.round(monto * 100) / 100;

/** 9500 → "$ 9.500"; 9500.5 → "$ 9.500,50" (nunca redondea a pesos enteros) */
export function formatPesos(monto: number): string {
  const m = aCentavos(monto);
  return Number.isInteger(m) ? pesos.format(m) : pesosConCentavos.format(m);
}

/** 9500 → "9500"; 9500.5 → "9500,50" (lo que se pega en la app del banco) */
export function montoParaTransferir(monto: number): string {
  const m = aCentavos(monto);
  return Number.isInteger(m) ? String(m) : m.toFixed(2).replace(".", ",");
}

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Tucuman",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  // 24 h como se usa en Argentina; además evita el "p. m." que choca con el punto final de una oración
  hourCycle: "h23",
});

/** ISO → "lunes, 6 de octubre, 18:30" (hora de Tucumán) */
export function formatFechaHora(iso: string): string {
  return fechaHora.format(new Date(iso));
}

/** "Juan Pérez" → "Juan" */
export function nombreDePila(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
