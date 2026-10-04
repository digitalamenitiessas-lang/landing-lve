import Link from "next/link";
import { INSTAGRAM_URL } from "@/config/sucursales";
import HojaCuaderno from "@/components/ticket/HojaCuaderno";
import { IconoInstagram } from "@/components/ticket/iconos";

export default function TicketNoEncontrado() {
  return (
    <HojaCuaderno etiqueta="Ticket no encontrado">
      <p className="a-mano mt-5 text-2xl text-tinta-suave">Tomando lista…</p>
      <h1 className="titulo-afiche mt-2 text-4xl text-rojo-oscuro sm:text-5xl">
        Este ticket faltó a clase
      </h1>
      <p className="mt-3 text-base">
        El link no corresponde a ningún pedido. Puede que se haya cortado al copiarlo: abrí el
        link completo que te quedó al hacer el pedido.
      </p>
      <p className="mt-2 text-base">
        Si ya transferiste y no lo encontrás, escribinos por Instagram y lo buscamos.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/#cafe" className="boton boton-rojo w-full sm:w-auto">
          Hacer un pedido
        </Link>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-tinta w-full bg-papel-claro sm:w-auto"
        >
          <IconoInstagram className="size-5" />
          Escribinos
          <span className="sr-only"> por Instagram (se abre en otra pestaña)</span>
        </a>
      </div>
    </HojaCuaderno>
  );
}
