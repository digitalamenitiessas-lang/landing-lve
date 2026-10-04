import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { INSTAGRAM_URL } from "@/config/sucursales";

/**
 * Marco mínimo de los tickets: sin la navegación ni los filtros SVG de la landing.
 * Nada de esto se indexa ni manda referrer (el link lleva el token en el fragmento).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PedidoLayout({ children }: { children: ReactNode }) {
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
        {children}
      </main>

      <footer className="border-t border-tinta/10 px-4 py-6 text-center text-sm text-tinta-suave">
        <p className="a-mano text-xl text-verde">Buenas costumbres y rico café</p>
        <p className="mt-1">
          La Vieja Escuela · Neobodegón norteño ·{" "}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-tinta underline decoration-rojo/60 underline-offset-4 hover:decoration-rojo"
          >
            @laviejaescuelatuc
            <span className="sr-only"> en Instagram (se abre en otra pestaña)</span>
          </a>
        </p>
      </footer>
    </div>
  );
}
