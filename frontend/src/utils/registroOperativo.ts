import type { ControlDetalle, OperativoDetalle } from '../types/operativoDetalle';

// Regla compartida por el wizard y la ficha; no implica conformidad sanitaria.
export function getPasoControl(control: Pick<ControlDetalle, 'muestra'> | null) {
  return !control ? 1 : !control.muestra ? 2 : !control.muestra.analisis_campo ? 3 : 4;
}

// El estado de este flujo inicial se deriva de relaciones, nunca se persiste.
export function getRegistroInicial(detalle: OperativoDetalle | null) {
  const control = detalle?.controles[0] ?? null;
  const muestra = control?.muestra ?? null;
  const analisis = muestra?.analisis_campo ?? null;
  const step = !detalle ? 0 : getPasoControl(control);
  const parroquia = control?.parroquia;
  const location = parroquia
    ? `${parroquia.nombre}, ${parroquia.canton.nombre}, ${parroquia.canton.provincia.nombre}`
    : '';
  return { operativo: detalle, control, muestra, analisis, step, location };
}
