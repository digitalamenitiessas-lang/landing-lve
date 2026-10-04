import BolsaCafe from "./BolsaCafe";
import FormularioPedido from "./FormularioPedido";
import PasosCompra from "./PasosCompra";

/** Sección "1/4 de café": explicación, la bolsa y el formulario de pedido. */
export default function SeccionCafe() {
  return (
    <section
      id="cafe"
      aria-labelledby="cafe-titulo"
      className="papel overflow-x-clip px-4 py-20 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        {/* Encabezado tipo afiche */}
        <header className="max-w-3xl">
          <p className="a-mano inline-block -rotate-2 text-2xl text-rojo-oscuro sm:text-3xl">
            Lección del día: el 1/4
          </p>
          <h2
            id="cafe-titulo"
            className="titulo-afiche mt-2 text-[3.4rem] text-verde sm:text-7xl lg:text-8xl"
          >
            Tarea para el hogar
          </h2>
          <div aria-hidden="true" className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-16 bg-rojo" />
            <span className="h-1.5 w-6 bg-verde" />
            <span className="h-1.5 w-3 bg-celeste" />
          </div>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-tinta-suave sm:text-xl">
            Nuestro café, en grano o molido a tu gusto, en bolsa de 1/4 kg. Lo pedís acá, lo pagás
            por transferencia y lo retirás en la sucursal que elijas.
          </p>
        </header>

        <div className="mt-12">
          <PasosCompra />
        </div>

        <div className="mt-14 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14">
          <figure className="mx-auto w-full max-w-[19rem] lg:sticky lg:top-24 lg:max-w-none lg:pt-6">
            <BolsaCafe className="mx-auto w-full max-w-[22rem] lg:max-w-[27rem]" />
            <figcaption className="a-mano mt-3 text-center text-2xl text-tinta-suave">
              1/4 kg = 250 g de buenas costumbres
            </figcaption>
          </figure>

          <FormularioPedido />
        </div>
      </div>
    </section>
  );
}
