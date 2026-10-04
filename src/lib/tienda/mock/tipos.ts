/**
 * Tipos del panel de sucursales simuladas (compartidos entre la ruta admin y
 * el componente cliente del panel; sin dependencias de servidor).
 */
import type { SucursalId } from "@/config/sucursales";
import type { EstadoVenta } from "../contrato";

export type ConfigMock = {
  venta_habilitada: boolean;
  precio: number;
  disponible: boolean;
  mensaje: string | null;
};

export type VentaPanel = {
  codigo: string;
  estado: EstadoVenta;
  /** Nombre completo: el panel es "la sucursal", no el público. */
  nombre: string;
  total: number;
  /** "2 × Molido para espresso" */
  resumen: string;
  creado_at: string;
  vence_at: string;
  pagado_at: string | null;
  retirado_at: string | null;
  cancelado_at: string | null;
};

export type PanelSucursal = {
  sucursal: SucursalId;
  config: ConfigMock;
  /** Más nuevas primero. */
  ventas: VentaPanel[];
};

export type AccionAdmin =
  | { accion: "estado"; codigo: string; estado: EstadoVenta }
  | {
      accion: "config";
      venta_habilitada?: boolean;
      precio?: number;
      disponible?: boolean;
      mensaje?: string | null;
    }
  | { accion: "reset" };

export type RespuestaAdmin =
  | { ok: true; panel: PanelSucursal }
  | { ok: false; error: string; codigo: string };
