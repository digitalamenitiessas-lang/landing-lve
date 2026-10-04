/**
 * Filtros SVG compartidos para el look "tiza sobre pizarrón".
 * Se monta UNA sola vez (en page.tsx). Después cualquier SVG del sitio usa
 * filter="url(#tiza)" o filter="url(#tiza-suave)" sobre el grupo dibujado.
 *
 * - tiza:       temblor leve del trazo (displacement) + erosión granulada (el
 *               polvo que deja la tiza al no apoyar parejo) + una pasada tenue
 *               sin erosionar para que la línea no se corte del todo.
 * - tiza-suave: solo grano, sin deformar el trazo (para textos o rellenos).
 *
 * La región del filtro es relativa a la caja del elemento (objectBoundingBox)
 * con margen holgado, así sirve en cualquier viewBox (también con origen
 * negativo). Ojo: un elemento con caja de alto o ancho 0 (una línea recta
 * perfectamente horizontal o vertical, sola) no se dibuja con filtro; aplicalo
 * al <g> que la contiene junto con otros trazos.
 */

export const FILTRO_TIZA = "tiza";
export const FILTRO_TIZA_SUAVE = "tiza-suave";

export default function FiltrosTiza() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={0}
      height={0}
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter
          id={FILTRO_TIZA}
          filterUnits="objectBoundingBox"
          x="-20%"
          y="-50%"
          width="140%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          {/* 1. Temblor: el pulso de la mano */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves={2}
            seed={4}
            result="temblor"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="temblor"
            scale={2.6}
            xChannelSelector="R"
            yChannelSelector="G"
            result="trazo"
          />
          {/* 2. Erosión: ruido fino convertido en máscara de alfa */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={11}
            result="ruido"
          />
          <feColorMatrix
            in="ruido"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 -0.85"
            result="mascara"
          />
          <feComposite in="trazo" in2="mascara" operator="in" result="erosionado" />
          {/* 3. Una pasada tenue debajo para que el trazo no quede cortado */}
          <feComponentTransfer in="trazo" result="fantasma">
            <feFuncA type="linear" slope={0.32} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="fantasma" />
            <feMergeNode in="erosionado" />
          </feMerge>
        </filter>

        <filter
          id={FILTRO_TIZA_SUAVE}
          filterUnits="objectBoundingBox"
          x="-20%"
          y="-50%"
          width="140%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={23}
            result="ruido"
          />
          <feColorMatrix
            in="ruido"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.2"
            result="mascara"
          />
          <feComposite in="SourceGraphic" in2="mascara" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
