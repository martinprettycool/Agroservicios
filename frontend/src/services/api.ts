import type { OperativoDetalle } from '../types/operativoDetalle';
import type { CreateOperativo, Operativo } from '../types/operativo';
import type { CreateControl, Control } from '../types/control';
import type { Provincia, Canton, Parroquia } from '../types/geografia';
import type { CreateMuestra, Muestra } from '../types/muestra';
import type { CreateAnalisisCampo, AnalisisCampo } from '../types/analisisCampo';

const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: string[] = []) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, fallback: string, options: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new ApiError('No se ha configurado la conexión con el servidor.', 0);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(options.method === 'POST'
      ? 'No se pudo confirmar el guardado. Comprueba la conexión y si el registro se guardó antes de volver a enviarlo.'
      : fallback, 0);
  }

  if (!response.ok) {
    if (response.status === 422) {
      const body: unknown = await response.json().catch(() => null);
      const detail = body && typeof body === 'object' && 'detail' in body ? body.detail : null;
      const fields = Array.isArray(detail) ? detail.flatMap((item: unknown) => {
        if (!item || typeof item !== 'object' || !('loc' in item) || !Array.isArray(item.loc)) return [];
        return typeof item.loc[1] === 'string' ? [item.loc[1]] : [];
      }) : [];
      throw new ApiError('Revisa los campos indicados e intenta guardar de nuevo.', 422, [...new Set(fields)]);
    }
    throw new ApiError(fallback, response.status);
  }
  if (options.method === 'POST' && response.status !== 201) {
    throw new ApiError('El servidor no confirmó la creación del registro. Verifica su estado antes de reenviarlo.', response.status);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new ApiError('No se pudo interpretar la respuesta del servidor. Verifica el registro antes de reenviarlo.', response.status);
  }
}

export function getOperativos(signal?: AbortSignal): Promise<Operativo[]> {
  return request('/operativos', 'No fue posible cargar los operativos.', { signal });
}
export function createOperativo(data: CreateOperativo): Promise<Operativo> {
  return request('/operativos', 'No fue posible crear el operativo.', { method: 'POST', body: JSON.stringify(data) });
}
export function getProvincias(signal?: AbortSignal): Promise<Provincia[]> {
  return request('/provincias', 'No fue posible cargar las provincias.', { signal });
}
export function getCantones(provinciaId: number, signal?: AbortSignal): Promise<Canton[]> {
  return request(`/provincias/${provinciaId}/cantones`, 'No fue posible cargar los cantones.', { signal });
}
export function getParroquias(cantonId: number, signal?: AbortSignal): Promise<Parroquia[]> {
  return request(`/cantones/${cantonId}/parroquias`, 'No fue posible cargar las parroquias.', { signal });
}
export function createControl(operativoId: number, data: CreateControl): Promise<Control> {
  return request(`/operativos/${operativoId}/controles`, 'No fue posible crear el control.', { method: 'POST', body: JSON.stringify(data) });
}
export function createMuestra(controlId: number, data: CreateMuestra): Promise<Muestra> {
  return request(`/controles/${controlId}/muestra`, 'No fue posible crear la muestra.', { method: 'POST', body: JSON.stringify(data) });
}
export function createAnalisisCampo(muestraId: number, data: CreateAnalisisCampo): Promise<AnalisisCampo> {
  return request(`/muestras/${muestraId}/analisis-campo`, 'No fue posible crear el análisis de campo.', { method: 'POST', body: JSON.stringify(data) });
}

export function getOperativoDetalle(operativoId: number, signal?: AbortSignal): Promise<OperativoDetalle> {
  return request(`/operativos/${operativoId}/detalle`, 'No fue posible consultar el estado del operativo.', { signal, cache: 'no-store' });
}
