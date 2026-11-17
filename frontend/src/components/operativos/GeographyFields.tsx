import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getProvincias, getCantones, getParroquias } from '../../services/api';
import type { Provincia, Canton, Parroquia } from '../../types/geografia';
import { FormField } from './FormField';

type Catalog<T> = { items: T[]; status: 'idle' | 'loading' | 'success' | 'error' };
const emptyCatalog = { items: [], status: 'idle' as const };

async function loadCatalog<T>(load: (signal: AbortSignal) => Promise<T[]>, set: Dispatch<SetStateAction<Catalog<T>>>, signal: AbortSignal) {
  set({ items: [], status: 'loading' });
  try {
    const items = await load(signal);
    if (!signal.aborted) set({ items, status: 'success' });
  } catch {
    if (!signal.aborted) set({ items: [], status: 'error' });
  }
}

export function GeographyFields({ onLocationChange }: { onLocationChange: (label: string) => void }) {
  const [provincias, setProvincias] = useState<Catalog<Provincia>>({ items: [], status: 'loading' });
  const [cantones, setCantones] = useState<Catalog<Canton>>(emptyCatalog);
  const [parroquias, setParroquias] = useState<Catalog<Parroquia>>(emptyCatalog);
  const [provinciaId, setProvinciaId] = useState('');
  const [cantonId, setCantonId] = useState('');
  const [parroquiaId, setParroquiaId] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(getProvincias, setProvincias, controller.signal);
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!provinciaId) return;
    const controller = new AbortController();
    void loadCatalog((signal) => getCantones(Number(provinciaId), signal), setCantones, controller.signal);
    return () => controller.abort();
  }, [provinciaId, retry]);

  useEffect(() => {
    if (!cantonId) return;
    const controller = new AbortController();
    void loadCatalog((signal) => getParroquias(Number(cantonId), signal), setParroquias, controller.signal);
    return () => controller.abort();
  }, [cantonId, retry]);

  const errors = [
    provincias.status === 'error' && 'No fue posible cargar las provincias.',
    cantones.status === 'error' && 'No fue posible cargar los cantones.',
    parroquias.status === 'error' && 'No fue posible cargar las parroquias.',
  ].filter(Boolean);

  return (
    <>
      {errors.length > 0 && <div className="form-feedback" role="alert"><p>{errors.join(' ')}</p><button type="button" className="button-secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar carga</button></div>}
      <div className="form-grid geography-grid">
        <FormField name="provincia" label="Provincia" required>
          <select id="provincia" required value={provinciaId} disabled={provincias.status !== 'success'} onChange={(event) => {
            setProvinciaId(event.target.value);
            setCantonId(''); setParroquiaId('');
            setCantones({ items: [], status: 'idle' }); setParroquias({ items: [], status: 'idle' });
            onLocationChange('');
          }}>
            <option value="">{provincias.status === 'loading' ? 'Cargando provincias…' : 'Selecciona una provincia'}</option>
            {provincias.items.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          {provincias.status === 'success' && provincias.items.length === 0 && <p className="field-hint" role="status">No hay provincias disponibles en el catálogo.</p>}
        </FormField>
        <FormField name="canton" label="Cantón" required>
          <select id="canton" required value={cantonId} disabled={!provinciaId || cantones.status !== 'success'} onChange={(event) => {
            setCantonId(event.target.value); setParroquiaId('');
            setParroquias({ items: [], status: 'idle' }); onLocationChange('');
          }}>
            <option value="">{cantones.status === 'loading' ? 'Cargando cantones…' : 'Selecciona un cantón'}</option>
            {cantones.items.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          {provinciaId && cantones.status === 'success' && cantones.items.length === 0 && <p className="field-hint" role="status">Esta provincia no tiene cantones disponibles.</p>}
        </FormField>
        <FormField name="parroquia_id" label="Parroquia" required>
          <select id="parroquia_id" name="parroquia_id" required value={parroquiaId} disabled={!cantonId || parroquias.status !== 'success'} onChange={(event) => {
            const value = event.target.value;
            setParroquiaId(value);
            const labels = [
              parroquias.items.find((item) => item.id === Number(value))?.nombre,
              cantones.items.find((item) => item.id === Number(cantonId))?.nombre,
              provincias.items.find((item) => item.id === Number(provinciaId))?.nombre,
            ];
            onLocationChange(value ? labels.filter(Boolean).join(', ') : '');
          }}>
            <option value="">{parroquias.status === 'loading' ? 'Cargando parroquias…' : 'Selecciona una parroquia'}</option>
            {parroquias.items.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          {cantonId && parroquias.status === 'success' && parroquias.items.length === 0 && <p className="field-hint" role="status">Este cantón no tiene parroquias disponibles.</p>}
        </FormField>
      </div>
    </>
  );
}
