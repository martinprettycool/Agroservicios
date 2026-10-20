// Contrato JSON de OpResponse en main.py; fechas serializadas por FastAPI.
export interface Operativo {
  id: number;
  numero: number;
  tipo_operativo: 'AGENCIA' | 'INTERINSTITUCIONAL';
  fecha: string;
  created_at: string;
  updated_at: string;
}
