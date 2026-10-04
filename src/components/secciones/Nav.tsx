"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import MisPedidosChip from "@/components/ticket/MisPedidosChip";
import { INSTAGRAM_URL } from "@/config/sucursales";
import IconoInstagram from "./IconoInstagram";

const LINKS = [
  { href: "#cafe", texto: "El café" },
  { href: "#sucursales", texto: "Sucursales" },
  { href: "#carta", texto: "Carta" },
] as const;

/** Alto del header en px (h-16 / md:h-[72px]): el umbral para dejar el pizarrón. */
const ALTO_NAV = 72;

/* ---------- ¿Ya pasamos el pizarrón del hero? (store externo: SSR-safe, sin setState en efectos) ---------- */

function suscribirScroll(avisar: () => void) {
  window.addEventListener("scroll", avisar, { passive: true });
  window.addEventListener("resize", avisar);
  return () => {
    window.removeEventListener("scroll", avisar);
    window.removeEventListener("resize", avisar);
  };
}

function pasoElPizarron(): boolean {
  const inicio = document.getElementById("inicio");
  if (inicio) return inicio.getBoundingClientRect().bottom <= ALTO_NAV;
  return window.scrollY > window.innerHeight * 0.8;
}

/** En el servidor (y en la hidratación) el header arranca transparente, sobre el pizarrón. */
const sobreElPizarronEnServidor = () => false;

/* ---------- Componente ---------- */

export default function Nav() {
  const pasado = useSyncExternalStore(suscribirScroll, pasoElPizarron, sobreElPizarronEnServidor);
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Con el menú abierto el header pasa a papel para que se lea bien.
  const solido = pasado || abierto;

  useEffect(() => {
    if (!abierto) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a[href], button")?.focus();

    const cerrar = (devolverFoco: boolean) => {
      setAbierto(false);
      if (devolverFoco) botonRef.current?.focus();
    };

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar(true);
        return;
      }
      if (e.key !== "Tab" || !panel || !botonRef.current) return;
      // Trampa de foco simple: botón del menú + links del panel.
      const enfocables = [
        botonRef.current,
        ...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ];
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;
      if (!enfocables.includes(activo as HTMLElement)) {
        e.preventDefault();
        primero.focus();
      } else if (e.shiftKey && activo === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    const alTocarAfuera = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) cerrar(false);
    };

    const escritorio = window.matchMedia("(min-width: 768px)");
    const alCambiarAncho = () => {
      if (escritorio.matches) cerrar(false);
    };

    document.addEventListener("keydown", alTeclear);
    document.addEventListener("pointerdown", alTocarAfuera);
    escritorio.addEventListener("change", alCambiarAncho);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("pointerdown", alTocarAfuera);
      escritorio.removeEventListener("change", alCambiarAncho);
    };
  }, [abierto]);

  return (
    <header
      ref={headerRef}
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300",
        solido
          ? "border-b border-tinta/10 bg-papel/90 text-tinta shadow-[0_8px_24px_-14px_rgb(30_26_21/0.5)] backdrop-blur-md"
          : // sobre-oscuro: foco ámbar (globals.css), el de tinta no se ve sobre el pizarrón
            "sobre-oscuro bg-gradient-to-b from-pizarra-noche/45 to-transparent text-tiza",
      )}
    >
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6 md:h-[72px]"
      >
        {/* Logo: el blanco sobre el pizarrón, el verde sobre papel (fundido cruzado) */}
        <a
          href="#inicio"
          className="relative -ml-1 inline-flex h-11 shrink-0 items-center rounded-md px-1"
          onClick={() => setAbierto(false)}
        >
          <span className="sr-only">La Vieja Escuela — volver al inicio</span>
          <span className="relative block h-10 w-[59px]">
            <Image
              src="/marca/logo-blanco.png"
              alt=""
              width={59}
              height={40}
              loading="eager"
              className={clsx(
                "absolute inset-0 h-10 w-auto transition-opacity duration-300",
                solido ? "opacity-0" : "opacity-100",
              )}
            />
            <Image
              src="/marca/logo-verde.png"
              alt=""
              width={59}
              height={40}
              className={clsx(
                "absolute inset-0 h-10 w-auto transition-opacity duration-300",
                solido ? "opacity-100" : "opacity-0",
              )}
            />
          </span>
        </a>

        {/* Links de escritorio */}
        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold decoration-2 underline-offset-[6px] hover:underline"
              >
                {l.texto}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de La Vieja Escuela (se abre en otra pestaña)"
            className="hidden size-11 items-center justify-center rounded-full transition-colors hover:bg-current/10 md:inline-flex"
          >
            <IconoInstagram className="size-6" />
          </a>

          <MisPedidosChip variante={solido ? "oscuro" : "claro"} />

          <a
            href="#cafe"
            className="boton boton-rojo hidden min-h-10 px-4 py-2 text-sm lg:inline-flex"
          >
            Pedí tu 1/4
          </a>

          <button
            ref={botonRef}
            type="button"
            aria-expanded={abierto}
            aria-controls={idPanel}
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setAbierto((a) => !a)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-current/10 md:hidden"
          >
            {abierto ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </nav>

      {/* Panel mobile: con poca altura (landscape, zoom 400%) scrollea adentro; el header es fijo */}
      <div
        ref={panelRef}
        id={idPanel}
        hidden={!abierto}
        className="papel absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-tinta/15 text-tinta shadow-[0_18px_30px_-18px_rgb(30_26_21/0.55)] md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-col px-4 pt-2 pb-4">
          {LINKS.map((l) => (
            <li key={l.href} className="border-b border-dashed border-tinta/15 last:border-0">
              <a
                href={l.href}
                onClick={() => setAbierto(false)}
                className="titulo-afiche flex min-h-14 items-center text-3xl text-verde"
              >
                {l.texto}
              </a>
            </li>
          ))}
          <li className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href="#cafe"
              onClick={() => setAbierto(false)}
              className="boton boton-rojo flex-1"
            >
              Pedí tu 1/4
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="boton boton-tinta"
            >
              <IconoInstagram className="size-5" />
              Instagram
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
