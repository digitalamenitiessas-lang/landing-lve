"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { copiarTexto } from "./copiar";

type Props = {
  /** Texto a copiar (o función que lo calcula al hacer clic, p. ej. la URL completa). */
  valor: string | (() => string);
  /** Texto visible del botón: "Copiar", "Copiar monto"… */
  etiqueta: string;
  /** Qué se copia, para lectores de pantalla: "el alias", "el CBU"… */
  que?: string;
  variante?: "tinta" | "verde" | "rojo";
  /** Ocupa todo el ancho (botones principales en mobile). */
  ancho?: boolean;
  className?: string;
};

type Resultado = "nada" | "copiado" | "error";

export default function BotonCopiar({
  valor,
  etiqueta,
  que,
  variante = "tinta",
  ancho = false,
  className,
}: Props) {
  const [resultado, setResultado] = useState<Resultado>("nada");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copiar() {
    const texto = typeof valor === "function" ? valor() : valor;
    const ok = await copiarTexto(texto);
    setResultado(ok ? "copiado" : "error");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setResultado("nada"), ok ? 2200 : 5000);
  }

  const copiado = resultado === "copiado";

  return (
    <span className={clsx("inline-flex flex-col gap-1", ancho && "w-full", className)}>
      <button
        type="button"
        onClick={copiar}
        aria-label={que ? `${etiqueta}: ${que}` : undefined}
        className={clsx(
          "boton min-h-11 shrink-0 px-4 py-2 text-base",
          ancho && "w-full",
          variante === "verde" && "boton-verde",
          variante === "rojo" && "boton-rojo",
          variante === "tinta" &&
            (copiado ? "border-2 border-verde bg-verde text-white" : "boton-tinta bg-papel-claro"),
        )}
      >
        {copiado ? (
          <Check className="size-5" aria-hidden="true" strokeWidth={3} />
        ) : (
          <Copy className="size-5" aria-hidden="true" />
        )}
        <span>{copiado ? "¡Copiado!" : etiqueta}</span>
      </button>
      <span role="status" aria-live="polite" className="min-h-0 text-sm font-semibold">
        {resultado === "copiado" ? (
          <span className="sr-only">¡Copiado{que ? `: ${que}` : ""}!</span>
        ) : resultado === "error" ? (
          <span className="text-rojo-oscuro">
            No se pudo copiar solo: mantené apretado el texto y elegí «Copiar».
          </span>
        ) : null}
      </span>
    </span>
  );
}
