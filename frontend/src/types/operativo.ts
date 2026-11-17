// Contrato de CreateOp y OpResponse en main.py.
export const tiposOperativo = {
  AGENCIA: 'Agencia',
  INTERINSTITUCIONAL: 'Interinstitucional',
} as const;

export interface CreateOperativo {
  numero: number;
  tipo_operativo: keyof typeof tiposOperativo;
  fecha: string;
}

export interface Operativo extends CreateOperativo {
  id: number;
  created_at: string;
  updated_at: string;
}
