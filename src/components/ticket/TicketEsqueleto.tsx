import HojaCuaderno from "./HojaCuaderno";

/** Lo que se ve mientras se busca el ticket (y el render del servidor). */
export default function TicketEsqueleto({ codigo }: { codigo?: string }) {
  return (
    <HojaCuaderno etiqueta="Cargando el ticket">
      <div className="mt-5" aria-busy="true">
        <p className="text-sm font-semibold tracking-wide text-tinta-suave uppercase">
          Tu código
        </p>
        {codigo ? (
          <p className="titulo-afiche mt-1 text-[clamp(2.4rem,12vw,4.25rem)] break-all text-tinta">
            {codigo}
          </p>
        ) : (
          <div className="mt-2 h-14 w-3/4 animate-pulse rounded bg-tinta/10" />
        )}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="size-8 animate-pulse rounded-full bg-tinta/10" />
              <div className="h-3 w-14 animate-pulse rounded bg-tinta/10" />
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          <div className="h-5 w-2/3 animate-pulse rounded bg-tinta/10" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-tinta/10" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-tinta/10" />
        </div>
        <p role="status" className="a-mano mt-6 text-xl text-tinta-suave">
          Buscando tu ticket en el cuaderno…
        </p>
      </div>
    </HojaCuaderno>
  );
}
