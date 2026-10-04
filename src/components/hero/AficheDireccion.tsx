/**
 * Afiche de papel pegado al pizarrón con cinta, en la dirección de arte de
 * los afiches reales de La Vieja Escuela: papel crema, tipografía condensada
 * bold en verde y rojo, "GUARDATE ESTA DIRECCIÓN".
 *
 * Las direcciones salen tal cual de config/sucursales.ts (que las tiene como
 * figuran en los afiches): no se reescriben acá.
 *
 * Es un link a #sucursales. No fija display ni posición: los pone quien lo usa
 * (el Hero lo muestra solo en pantallas grandes: en mobile prioriza título y
 * CTAs, y las direcciones ya están en la sección Sucursales).
 */

import { getSucursal } from "@/config/sucursales";

const NUEVA = getSucursal("24-de-septiembre");
const ORIGINAL = getSucursal("santa-fe");

export default function AficheDireccion({ className }: { className?: string }) {
  return (
    // El wrapper lo anima GSAP; el <a> tiene su propia transición de hover
    // (no mezclamos transiciones CSS con tweens sobre el mismo elemento).
    <div data-entra="afiche" className={["w-[34%]", className ?? ""].join(" ")}>
      <a
        href="#sucursales"
        className="papel block rotate-[-3.5deg] px-[13%] pt-[12%] pb-[10%] text-left shadow-[0_10px_24px_rgb(0_0_0/0.35)] transition-transform duration-300 ease-tiza hover:rotate-[-1.5deg] focus-visible:rotate-[-1.5deg]"
      >
      {/* Cinta de papel arriba */}
      <span
        aria-hidden="true"
        className="absolute -top-[0.7em] left-1/2 h-[1.5em] w-[42%] -translate-x-1/2 rotate-[3deg] bg-papel-claro/70 shadow-[0_1px_2px_rgb(0_0_0/0.15)]"
      />
      <span className="titulo-afiche block text-[clamp(1rem,4.2cqw,1.6rem)] text-verde">
        Guardate esta dirección
      </span>
      <span className="titulo-afiche mt-[0.35em] block text-[clamp(1.1rem,4.9cqw,1.85rem)] text-rojo-oscuro">
        {NUEVA.direccion}
      </span>
      <span className="mt-[0.5em] block border-t-2 border-dashed border-tinta/25 pt-[0.35em] font-sans text-[clamp(0.8rem,2.6cqw,1rem)] leading-snug font-semibold text-tinta-suave">
        y la de siempre: <span className="whitespace-nowrap text-tinta">{ORIGINAL.direccion}</span>
      </span>
      </a>
    </div>
  );
}
