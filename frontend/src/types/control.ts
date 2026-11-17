export const tiposLugar = {
  CENTRO_ACOPIO: 'Centro de acopio',
  MEDIO_TRANSPORTE: 'Medio de transporte',
  SILO_INDUSTRIA_LACTEA: 'Silo de industria láctea',
  UPA_FINCA: 'UPA / Finca',
} as const;

// Decimal se envía como texto para conservar la precisión; Pydantic lo acepta.
export interface CreateControl {
  parroquia_id: number;
  propietario: string;
  tipo_lugar: keyof typeof tiposLugar;
  litros_controlados: string;
  litros_inocuos: string;
  litros_decomisados: string;
  sector?: string | null;
  numero_registro?: string | null;
  nombre_lugar_muestreado?: string | null;
  observaciones?: string | null;
}

export interface Control extends Required<CreateControl> {
  id: number;
  operativo_id: number;
  created_at: string;
  updated_at: string;
}
