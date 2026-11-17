export const resultadosCualitativos = { POSITIVO: 'Positivo', NEGATIVO: 'Negativo' } as const;
export const caracteristicasOrganolepticas = { CUMPLE: 'Cumple', NO_CUMPLE: 'No cumple' } as const;

export const parametrosFisicoquimicos = {
  temperatura_c: 'Temperatura (°C)',
  densidad_corregida: 'Densidad corregida',
  acidez: 'Acidez',
  ph: 'pH',
} as const;

export const pruebasCualitativas = {
  estabilidad_proteica: 'Estabilidad proteica',
  antibiotico_beta_tetra_sulfa: 'Antibióticos: beta / tetra / sulfa',
  antibiotico_aminoglucosidos: 'Antibióticos: aminoglucósidos',
  aflatoxinas: 'Aflatoxinas',
  neutralizantes: 'Neutralizantes',
  peroxido: 'Peróxido',
  cloruros: 'Cloruros',
} as const;

export interface CreateAnalisisCampo {
  temperatura_c?: string | null;
  densidad_corregida?: string | null;
  acidez?: string | null;
  ph?: string | null;
  caracteristicas_organolepticas?: keyof typeof caracteristicasOrganolepticas | null;
  estabilidad_proteica?: keyof typeof resultadosCualitativos | null;
  antibiotico_beta_tetra_sulfa?: keyof typeof resultadosCualitativos | null;
  antibiotico_aminoglucosidos?: keyof typeof resultadosCualitativos | null;
  aflatoxinas?: keyof typeof resultadosCualitativos | null;
  neutralizantes?: keyof typeof resultadosCualitativos | null;
  peroxido?: keyof typeof resultadosCualitativos | null;
  cloruros?: keyof typeof resultadosCualitativos | null;
  observaciones?: string | null;
}

export interface AnalisisCampo extends Required<CreateAnalisisCampo> {
  id: number;
  muestra_id: number;
  created_at: string;
  updated_at: string;
}
