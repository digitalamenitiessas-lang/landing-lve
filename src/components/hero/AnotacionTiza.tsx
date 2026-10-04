/**
 * "tarea para el hogar: ¼ kg de café", escrito a mano con tiza al lado de la
 * taza. Es texto HTML real (Caveat), decorativo: la bajada del hero ya dice lo
 * mismo, por eso va aria-hidden. La flecha vive en TazaTiza (mismo viewBox).
 *
 * Cada renglón se "escribe" de izquierda a derecha: el Hero anima el
 * clip-path de los [data-renglon].
 *
 * El tamaño de letra usa unidades cqw: se escala con el cuadro del arte
 * (que es un @container), no con la ventana.
 */

export default function AnotacionTiza() {
  return (
    <div
      data-entra="anotacion"
      aria-hidden="true"
      className="a-mano pointer-events-none absolute top-[45.5%] left-[1%] w-[44%] -rotate-[4deg] select-none"
    >
      <span
        data-renglon=""
        className="block w-max text-[clamp(1rem,4.9cqw,1.85rem)] text-tiza/90"
      >
        tarea para el hogar:
      </span>
      <span
        data-renglon=""
        className="mt-[0.1em] ml-[6%] block w-max text-[clamp(1.3rem,6.6cqw,2.5rem)] text-sol"
      >
        ¼ kg de café
      </span>
    </div>
  );
}
