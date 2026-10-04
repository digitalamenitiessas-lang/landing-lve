import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HojaCuaderno from "@/components/ticket/HojaCuaderno";
import { IconoInstagram } from "@/components/ticket/iconos";
import { INSTAGRAM_URL } from "@/config/sucursales";

/**
 * 404 de toda la app (URLs que no existen). Se renderiza solo dentro del root
 * layout, sin el marco de pedido/layout.tsx: trae su propio encabezado.
 * El 404 de un ticket con código inexistente está en pedido/[sucursal]/[codigo]/not-found.tsx.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NoEncontrada() {
  return (
    <div className="papel flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pt-5 pb-4">
        <Link
          href="/"
          className="inline-flex shrink-0 rounded-md"
          aria-label="La Vieja Escuela: ir al inicio"
        >
          <Image
            src="/marca/logo-verde.png"
            alt=""
            width={607}
            height={416}
            priority
            className="h-12 w-auto sm:h-14"
          />
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-tinta-suave hover:text-tinta"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      </header>

      <main id="contenido" className="flex-1 px-4 pb-14">
        <HojaCuaderno etiqueta="Página no encontrada">
          <p className="a-mano mt-5 text-2xl text-tinta-suave">Tomando lista…</p>
          <h1 className="titulo-afiche mt-2 text-4xl text-rojo-oscuro sm:text-5xl">
            Esta página faltó a clase
          </h1>
          <p className="mt-3 text-base">
            La dirección no existe o cambió. Si venías del link de tu pedido, puede que se haya
            cortado al copiarlo: abrí el link completo que te quedó al hacer el pedido.
          </p>
          <p className="mt-2 text-base">
            Si ya transferiste y no lo encontrás, escribinos por Instagram y lo buscamos.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/" className="boton boton-verde w-full sm:w-auto">
              Ir al inicio
            </Link>
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
      </main>
    </div>
  );
}
