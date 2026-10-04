/**
 * Íconos dibujados a mano con tiza, como los de las historias destacadas de
 * @laviejaescuelatuc (trazo blanco irregular sobre verde botella).
 *
 * - Trazo en currentColor: el color lo pone quien los usa (text-tiza, text-sol...).
 * - Cada trazo se dibuja dos veces: el principal y un "polvo" fino corrido medio
 *   píxel, así se ve a tiza aunque no esté montado <FiltrosTiza /> (filter="url(#tiza)").
 * - Con `titulo` son role="img" con <title>; sin `titulo` son decorativos (aria-hidden).
 */
import { useId, type ReactNode } from "react";

export type IconoTizaProps = {
  className?: string;
  titulo?: string;
};

type TrazosProps = IconoTizaProps & {
  /** Los `d` de cada trazo, en un viewBox de 64×64 */
  trazos: readonly string[];
  /** Detalles que no llevan "polvo" (puntitos, migas) */
  extra?: ReactNode;
  /** Giro del dibujo completo, en grados */
  giro?: number;
};

function IconoTiza({ className, titulo, trazos, extra, giro = 0 }: TrazosProps) {
  const idTitulo = useId();
  const transform = giro ? `rotate(${giro} 32 32)` : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(titulo
        ? { role: "img", "aria-labelledby": idTitulo }
        : { "aria-hidden": true, focusable: false })}
    >
      {titulo ? <title id={idTitulo}>{titulo}</title> : null}
      <g filter="url(#tiza)" transform={transform}>
        <g strokeWidth={2.7} strokeOpacity={0.95}>
          {trazos.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g strokeWidth={1.1} strokeOpacity={0.4} transform="translate(0.7 0.5)">
          {trazos.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {extra}
      </g>
    </svg>
  );
}

const TAZA = [
  // cuerpo
  "M14.2 27.6C14 26.8 15 26.3 16 26.4L44.2 26.1C45.4 26.1 45.9 26.9 45.7 28.1L43.4 44C42.6 49.6 38.5 52.6 33 52.8L26.4 52.9C21 52.8 17 49.7 16.2 44.2Z",
  // manija
  "M45.4 31.4C51 30.5 54.5 33.4 53.7 37.6C53 41.5 48.8 43.1 43.8 42.2",
  // platito
  "M8.6 56.6C20 58.8 40.4 58.9 55.4 55.8",
  // vapor
  "M24.2 21C21.6 18 26.6 15.6 24.1 12.2C22.7 10.3 24.4 8.1 25.5 7",
  "M32.8 21.4C30.2 18 35.2 15.4 32.6 11.6C31.4 9.8 33 7.6 34.2 6.4",
  "M41.2 21C39.2 18.6 43.2 16.4 41.4 13.4",
] as const;

export function IconoTaza(props: IconoTizaProps) {
  return <IconoTiza {...props} trazos={TAZA} />;
}

const PAN = [
  // hogaza
  "M8.2 40C6.6 30 16 21.6 32 21.2C48.6 21 58.1 29.6 56.2 40.3C55.6 44.4 52.4 46.6 48 46.8L16.4 47C11.8 46.8 8.7 44.4 8.2 40Z",
  // cortes
  "M19.8 28.4C21.8 31 22.6 33.7 22.3 36.7",
  "M30.2 26.6C32.1 29.5 32.9 32.6 32.4 35.9",
  "M40.6 27.5C42.2 30 42.9 32.6 42.4 35.6",
  // tabla
  "M5.8 52.2C24 53.8 42 53.6 58.2 51.6",
] as const;

export function IconoPan(props: IconoTizaProps) {
  return (
    <IconoTiza
      {...props}
      trazos={PAN}
      extra={
        <g strokeWidth={2.4}>
          <path d="M14 57.2l.7.3" />
          <path d="M22.6 58.4l.5.2" />
          <path d="M49.6 57l.6.3" />
        </g>
      }
    />
  );
}

const CUBIERTOS = [
  // tenedor
  "M16 8.2C15.6 15 15.6 20 16.4 24C17.4 28.4 26.6 28.6 27.6 24C28.4 20 28.4 14 28 8",
  "M22 8.6L22.1 22.4",
  "M22 29.6C21.5 38 21.4 46.4 21.9 57.2",
  // cuchillo
  "M42.2 32C40.6 31.6 39.8 30 39.8 27C39.6 18 41.6 11 46.6 7.2C47.6 6.6 48.2 7.2 48.2 8.4L47.8 31C47.6 32.4 45 32.8 42.2 32Z",
  "M43.6 33.2C43.1 41 42.9 48.8 43.4 57.2",
] as const;

export function IconoCubiertos(props: IconoTizaProps) {
  return <IconoTiza {...props} trazos={CUBIERTOS} />;
}

const RELOJ = [
  // esfera (cierra un poquito pasada, como a mano alzada)
  "M32 8.5C45.6 8.2 56 18.6 55.6 32.4C55.2 45.6 44.8 55.8 31.6 55.4C18.4 55 8.2 44.6 8.6 31.4C9 18.6 19.4 8.8 33.4 8.9",
  // agujas
  "M32 32.2L31.4 18.2",
  "M32 32.2L42 37.8",
  // marcas
  "M32 12.6L32.1 15.4",
  "M51.4 31.8L48.6 32",
  "M32.2 51.4L32 48.6",
  "M12.6 32.2L15.4 32",
] as const;

export function IconoReloj(props: IconoTizaProps) {
  return (
    <IconoTiza
      {...props}
      trazos={RELOJ}
      extra={<path d="M31.6 32.1l.9.1" strokeWidth={4} />}
    />
  );
}

const GRANO = [
  "M32 8C44 8.4 52 19 51.2 33C50.4 46.8 42 56.4 31 56C19.6 55.6 12.4 45 13 31.6C13.6 18 21 7.6 33.4 8.4",
  "M33.6 9.2C27.6 17 36.4 26 31 34C26.6 40.6 33.4 48.6 30.4 55.2",
] as const;

export function IconoGrano(props: IconoTizaProps) {
  return <IconoTiza {...props} trazos={GRANO} giro={-24} />;
}

const FLECHA = [
  "M7.6 38.6C17.6 26.4 32 23.8 52.4 30",
  "M43.4 22.2C46.8 25.4 49.9 27.9 53.4 30.2C49.8 32.6 46.7 35.4 44.2 39.2",
] as const;

export function IconoFlecha(props: IconoTizaProps) {
  return <IconoTiza {...props} trazos={FLECHA} />;
}
