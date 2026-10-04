/**
 * Repisa del pizarrón: el listón de madera de abajo, con dos tizas y un
 * borrador apoyados. Decorativo.
 */

export default function RepisaTiza() {
  return (
    <div
      data-entra="repisa"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
    >
      {/* Tizas y borrador apoyados sobre el listón */}
      <svg
        viewBox="0 0 190 44"
        className="absolute right-[6%] bottom-[12px] h-auto w-[132px] sm:w-[164px]"
        focusable="false"
      >
        {/* Tiza blanca, gastada en una punta */}
        <g transform="rotate(-3 40 34)">
          <path
            d="M6 30.5C6 28 7.5 27 10 27L66 27.5C69.5 27.5 71.5 29.5 71.5 32C71.5 34.5 69.5 36.5 66 36.5L10 36.5C7.5 36.5 6 35 6 32.5Z"
            fill="#f5f2ea"
          />
          <path d="M60 27.6C62 30 62 34 60 36.4" stroke="#d8d2c4" strokeWidth={1} fill="none" />
        </g>
        {/* Tiza celeste, más corta */}
        <path
          d="M30 38C30 36.2 31.2 35.2 33 35.2L66 35.6C68.4 35.6 69.6 37 69.6 38.8C69.6 40.6 68.2 41.8 66 41.8L33 41.8C31.2 41.8 30 40.6 30 39Z"
          fill="#d7e8f7"
        />
        {/* Borrador: lomo de madera + fieltro */}
        <g transform="rotate(2 140 30)">
          <path d="M94 15C94 13 95.5 12 97.5 12L180 11C182.5 11 184 12.5 184 14.5L184 30L94 31Z" fill="#c9a678" />
          <path d="M100 18L178 17" stroke="#a8875b" strokeWidth={1.4} strokeLinecap="round" />
          <path d="M94 31L184 30L184 37.5C184 39 183 40 181.5 40L96.5 41C95 41 94 40 94 38.5Z" fill="#4a453f" />
          {/* Polvo de tiza en el fieltro */}
          <path
            d="M100 36.5L122 36M128 37L150 36.5M156 36L176 35.6"
            stroke="#f5f2ea"
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Listón */}
      <div className="h-3 w-full border-t border-kraft/40 bg-linear-to-b from-cafe to-cafe-oscuro shadow-[0_-8px_18px_rgb(0_0_0/0.28)] sm:h-[14px]" />
    </div>
  );
}
