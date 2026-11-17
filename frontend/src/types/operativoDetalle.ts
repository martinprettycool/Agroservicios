import type { Operativo } from './operativo';
import type { Control } from './control';
import type { Muestra } from './muestra';
import type { AnalisisCampo } from './analisisCampo';
import type { Provincia, Canton, Parroquia } from './geografia';

interface CantonDetalle extends Canton {
  provincia: Provincia;
}
interface ParroquiaDetalle extends Parroquia {
  canton: CantonDetalle;
}
interface MuestraDetalle extends Muestra {
  analisis_campo: AnalisisCampo | null;
}
interface DecomisoDetalle {
  id: number;
  control_id: number;
  motivo: string;
  destino: string;
  numero_acta_decomiso: string | null;
  numero_acta_destruccion: string | null;
  created_at: string;
  updated_at: string;
}
interface NotificacionDetalle {
  id: number;
  control_id: number;
  tipo: 'INDUSTRIA_LACTEA' | 'ARCSA';
  estado: 'PENDIENTE' | 'EMITIDA';
  numero_documento: string | null;
  fecha: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}
export interface ControlDetalle extends Control {
  parroquia: ParroquiaDetalle;
  muestra: MuestraDetalle | null;
  decomiso: DecomisoDetalle | null;
  notificaciones: NotificacionDetalle[];
}
export interface OperativoDetalle extends Operativo {
  // Contrato del GET: ordenados por created_at, luego id.
  controles: ControlDetalle[];
}
