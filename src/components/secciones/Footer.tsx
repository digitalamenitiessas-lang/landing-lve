import { MapPin } from "lucide-react";
import Image from "next/image";
import SolDeMayo from "@/components/marca/SolDeMayo";
import { INSTAGRAM_URL, SUCURSALES } from "@/config/sucursales";
import IconoInstagram from "./IconoInstagram";

export default function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-pizarra-noche text-tiza">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr] md:pt-16">
        <div>
          <Image
            src="/marca/logo-blanco.png"
            alt="La Vieja Escuela"
            width={117}
            height={80}
            className="h-20 w-auto"
          />
          <p className="a-mano mt-4 flex items-center gap-2 text-2xl">
            Buenas costumbres y rico café.
            <span aria-hidden className="inline-flex size-8 shrink-0 text-sol">
              <SolDeMayo className="size-8" trazo="currentColor" girar />
            </span>
          </p>
        </div>

        <nav aria-labelledby="footer-sucursales">
          <h2
            id="footer-sucursales"
            className="font-display text-lg tracking-[0.14em] text-celeste-claro uppercase"
          >
            Sucursales
          </h2>
          <ul className="mt-3 space-y-1">
            {SUCURSALES.map((s) => (
              <li key={s.id}>
                <a
                  href={s.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-start gap-2 py-1.5"
                >
                  <MapPin className="mt-0.5 size-5 shrink-0 text-rojo" aria-hidden />
                  <span>
                    <span className="block font-semibold underline-offset-4 group-hover:underline">
                      {s.direccion}
                    </span>
                    <span className="block text-sm text-tiza/70">{s.apodo}</span>
                    <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg tracking-[0.14em] text-celeste-claro uppercase">
            Seguinos
          </h2>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-4 hover:underline"
          >
            <IconoInstagram className="size-6" />
            Instagram
            <span className="sr-only"> de La Vieja Escuela (se abre en otra pestaña)</span>
          </a>
          <p className="mt-2 text-sm text-tiza/70">
            Ahí están la carta, las novedades y las historias del día.
          </p>
        </div>
      </div>

      <div className="border-t border-tiza/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-tiza/70 sm:flex-row sm:justify-between sm:px-6">
          <p>Neobodegón norteño · San Miguel de Tucumán</p>
          <p>© {anio} La Vieja Escuela</p>
        </div>
      </div>
    </footer>
  );
}
