import { Landmark, MessageCircle, ShoppingBag, Store, type LucideIcon } from "lucide-react";

type Paso = { titulo: string; detalle: string; Icono: LucideIcon };

const PASOS: readonly Paso[] = [
  {
    titulo: "Elegí sucursal y molienda",
    detalle: "En grano o molido para tu cafetera, en la sucursal que te quede cómoda.",
    Icono: Store,
  },
  {
    titulo: "Transferí el monto exacto al alias de la sucursal",
    detalle: "En el ticket te mostramos el alias y el monto, listos para copiar.",
    Icono: Landmark,
  },
  {
    titulo: "Mandanos el comprobante por WhatsApp",
    detalle: "El mensaje ya va armado: solo adjuntás el comprobante.",
    Icono: MessageCircle,
  },
  {
    titulo: "Cuando lo marcamos como pagado, pasá a retirarlo",
    detalle: "Tu ticket se actualiza solo. Pasás con el código del pedido y te lo llevás.",
    Icono: ShoppingBag,
  },
];

/** "Cómo funciona": cuatro pasos escritos con tiza en un pizarrón con marco de madera. */
export default function PasosCompra() {
  return (
    <div className="pizarra rounded-md border-[6px] border-cafe px-5 pt-6 pb-7 shadow-[0_10px_0_-4px_var(--color-cafe-oscuro),0_18px_30px_-12px_rgb(0_0_0/0.45)] sm:px-8">
      <h3 className="a-mano inline-block -rotate-1 text-3xl text-tiza sm:text-4xl">
        Cómo funciona
        <svg
          aria-hidden="true"
          viewBox="0 0 200 10"
          preserveAspectRatio="none"
          className="mt-0.5 block h-2 w-full text-sol/80"
        >
          <path
            d="M2 6 C40 2 80 9 120 5 S180 3 198 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </h3>

      <ol className="mt-6 grid gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
        {PASOS.map(({ titulo, detalle, Icono }, i) => (
          <li key={titulo} className="flex gap-4">
            <div aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <svg viewBox="0 0 56 56" className="absolute inset-0 size-full text-tiza/70">
                <path
                  d="M28 4 C44 3 53 15 52 29 C51 44 40 53 27 52 C13 51 4 41 5 27 C6 14 16 5 30 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  transform={`rotate(${i * 47} 28 28)`}
                />
              </svg>
              <span className="a-mano text-3xl leading-none text-tiza">{i + 1}</span>
            </div>
            <div className="min-w-0">
              <p className="flex items-start gap-2 text-lg leading-snug font-semibold text-tiza">
                <Icono aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sol" strokeWidth={2.2} />
                <span>{titulo}</span>
              </p>
              <p className="mt-1.5 text-base leading-snug text-tiza/80">{detalle}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
