import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Ticket from "@/components/ticket/Ticket";
import { esSucursalId } from "@/config/sucursales";

type Props = {
  params: Promise<{ sucursal: string; codigo: string }>;
};

/** Códigos humanos tipo "WEB-SF-0042": letras, números, guiones, puntos y guiones bajos. */
const CODIGO_VALIDO = /^[\p{L}\p{N}][\p{L}\p{N}._-]{2,63}$/u;

function decodificarCodigo(crudo: string): string | null {
  let codigo = crudo;
  try {
    codigo = decodeURIComponent(crudo);
  } catch {
    // "%" suelto: lo dejamos como vino y que lo juzgue la validación
  }
  codigo = codigo.trim();
  return CODIGO_VALIDO.test(codigo) ? codigo : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo: crudo } = await params;
  const codigo = decodificarCodigo(crudo);
  return {
    title: codigo ? `Pedido ${codigo}` : "Pedido",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function PaginaPedido({ params }: Props) {
  const { sucursal, codigo: crudo } = await params;
  if (!esSucursalId(sucursal)) notFound();
  const codigo = decodificarCodigo(crudo);
  if (!codigo) notFound();

  return <Ticket sucursal={sucursal} codigo={codigo} />;
}
