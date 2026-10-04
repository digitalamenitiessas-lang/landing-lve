/**
 * Indicador de scroll: flechita de tiza + "bajá" a mano, rebotando suave.
 * Decorativo (aria-hidden): no es un control.
 */

import { FILTRO_TIZA } from "@/components/marca/FiltrosTiza";
import styles from "./hero.module.css";

export default function IndicadorScroll({ className }: { className?: string }) {
  return (
    <div
      data-entra="bajar"
      aria-hidden="true"
      className={[
        "pointer-events-none flex flex-col items-center text-tiza/80 select-none",
        className ?? "",
      ].join(" ")}
    >
      <span className={styles.rebote + " flex flex-col items-center"}>
        <span className="a-mano text-xl leading-none">bajá</span>
        <svg
          viewBox="0 0 30 44"
          className="mt-0.5 h-9 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <g filter={`url(#${FILTRO_TIZA})`}>
            <path d="M15 3C13.5 12 16.5 22 14.6 38" />
            <path d="M5.5 28.5C9 32 12 35.4 14.6 38.6C17.6 35 20.6 31.6 24.8 27.6" />
          </g>
        </svg>
      </span>
    </div>
  );
}
