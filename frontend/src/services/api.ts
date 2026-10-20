import type { Operativo } from '../types/operativo';

const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');

export async function getOperativos(signal?: AbortSignal): Promise<Operativo[]> {
  if (!apiUrl) {
    throw new Error('Falta configurar VITE_API_URL.');
  }

  const response = await fetch(`${apiUrl}/operativos`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`La consulta de operativos falló (HTTP ${response.status}).`);
  }

  return response.json();
}
