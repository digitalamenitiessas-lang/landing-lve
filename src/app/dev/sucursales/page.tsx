/**
 * /dev/sucursales — panel de las sucursales simuladas (solo modo demo).
 * Hace de "Sala de Profes" de cada sucursal para probar el ciclo completo:
 * pedido en la landing → marcar pagado → marcar retirado → el ticket se actualiza solo.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SUCURSALES } from "@/config/sucursales";
import { mockHabilitado } from "@/lib/tienda/cliente";
import { panelMock } from "@/lib/tienda/mock/store";
import { PanelSucursal } from "../PanelSucursal";

export const metadata: Metadata = {
  title: "Sucursales simuladas (demo)",
  robots: { index: false, follow: false },
};

export default async function SucursalesSimuladasPage() {
  // Leer el entorno en cada request, nunca en el build.
  await connection();
  if (!mockHabilitado()) notFound();

  return (
    <div className="papel min-h-dvh">
      <p
        role="note"
        className="bg-rojo-oscuro px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white"
      >
        Modo demo — sucursales simuladas (esto NO existe en producción)
      </p>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Image
              src="/marca/logo-verde.png"
              alt="La Vieja Escuela"
              width={607}
              height={416}
              priority
              className="h-auto w-28"
            />
            <h1 className="titulo-afiche mt-4 text-5xl text-verde sm:text-6xl">
              Sala de profes <span className="text-rojo-oscuro">de mentira</span>
            </h1>
            <p className="a-mano mt-2 text-2xl text-tinta">Acá hacés de cajero de cada sucursal.</p>
          </div>
          <Link href="/" className="boton boton-tinta self-start sm:self-auto">
            Volver a la landing
          </Link>
        </header>

        <ol className="mt-6 grid gap-2 rounded-2xl border-2 border-dashed border-tinta/40 p-4 text-sm sm:grid-cols-3 sm:gap-4">
          <li>
            <strong className="titulo-afiche mr-1 text-lg text-rojo-oscuro">1.</strong>
            Hacé un pedido en la landing y quedate con el ticket abierto.
          </li>
          <li>
            <strong className="titulo-afiche mr-1 text-lg text-rojo-oscuro">2.</strong>
            Volvé acá y tocá <em>Marcar pagado</em> (y después <em>Marcar retirado</em>).
          </li>
          <li>
            <strong className="titulo-afiche mr-1 text-lg text-rojo-oscuro">3.</strong>
            Mirá cómo el ticket cambia solo. Precios, alias y CBU son de prueba.
          </li>
        </ol>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          {SUCURSALES.map((s) => (
            <PanelSucursal
              key={s.id}
              sucursal={s.id}
              nombre={s.nombre}
              direccion={s.direccion}
              apodo={s.apodo}
              inicial={panelMock(s.id)}
            />
          ))}
        </div>

        <p className="mt-10 text-xs text-tinta-suave">
          Todo vive en la memoria del servidor: se borra al reiniciarlo. Se activa con{" "}
          <code className="rounded bg-papel-oscuro px-1">TIENDA_MOCK=1</code> y nunca en producción.
        </p>
      </main>
    </div>
  );
}
