import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormField } from '../components/operativos/FormField';
import { GeographyFields } from '../components/operativos/GeographyFields';
import { ApiError, getOperativoDetalle, createOperativo, createControl, createMuestra, createAnalisisCampo } from '../services/api';
import { tiposOperativo } from '../types/operativo';
import type { CreateOperativo } from '../types/operativo';
import { tiposLugar } from '../types/control';
import type { CreateControl } from '../types/control';
import { parametrosFisicoquimicos, pruebasCualitativas, resultadosCualitativos, caracteristicasOrganolepticas } from '../types/analisisCampo';
import type { CreateAnalisisCampo } from '../types/analisisCampo';

import type { OperativoDetalle } from '../types/operativoDetalle';
import { getRegistroInicial } from '../utils/registroOperativo';

const steps = ['Operativo', 'Control', 'Muestra', 'Análisis de campo', 'Resumen'];
const descriptions = [
  'Identifica el operativo y su fecha de ejecución.',
  'Registra el lugar de control, su propietario y el volumen de leche.',
  'Identifica la muestra obtenida en este control.',
  'Registra los parámetros y resultados obtenidos en campo.',
];
const fieldLabels: Record<string, string> = {
  numero: 'Número de operativo', tipo_operativo: 'Tipo de operativo', fecha: 'Fecha',
  parroquia_id: 'Parroquia', propietario: 'Propietario', tipo_lugar: 'Tipo de lugar',
  sector: 'Sector', numero_registro: 'Número de registro', nombre_lugar_muestreado: 'Nombre del lugar muestreado',
  litros_controlados: 'Litros controlados', litros_inocuos: 'Litros inocuos', litros_decomisados: 'Litros decomisados',
  observaciones: 'Observaciones', codigo: 'Código de muestra', caracteristicas_organolepticas: 'Características organolépticas',
  ...parametrosFisicoquimicos, ...pruebasCualitativas,
};

function EnumOptions({ options }: { options: Record<string, string> }) {
  return <>{Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</>;
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children ?? 'Sin registrar'}</dd></div>;
}

function getError(error: unknown, step: number): { message: string; fields: string[] } {
  if (!(error instanceof ApiError)) return { message: 'No fue posible guardar. Inténtalo nuevamente.', fields: [] };
  if (error.status === 409) return {
    message: step === 0 ? 'El número de operativo ya existe. Revisa el número antes de continuar.'
      : step === 2 ? 'Este control ya tiene una muestra registrada. No se ha creado otra muestra.'
        : 'Esta muestra ya tiene un análisis de campo registrado. No se ha creado otro análisis.',
    fields: step === 0 ? ['numero'] : [],
  };
  if (error.status === 400 && step === 1) return { message: 'No fue posible crear el control. Revisa que los litros controlados sean la suma de inocuos y decomisados, y que el número de registro corresponda al tipo de lugar.', fields: [] };
  if (error.status === 400 && step === 3) return { message: 'No fue posible guardar el análisis. Revisa el pH (0 a 14), la densidad y la acidez (no negativas).', fields: [] };
  if (error.status === 404) return { message: 'No se encontró el registro asociado o la ubicación seleccionada. Revisa los datos antes de continuar.', fields: [] };
  return { message: error.message, fields: error.fields };
}

export function NuevoOperativoPage() {
  const { operativoId } = useParams();
  // Cambiar de operativo o iniciar uno nuevo descarta solo el formulario local.
  return <RegistroOperativo key={operativoId ?? 'nuevo'} operativoId={operativoId} />;
}

function RegistroOperativo({ operativoId }: { operativoId?: string }) {
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<OperativoDetalle | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>(operativoId ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [tipoLugar, setTipoLugar] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fields: string[] } | null>(null);
  const submitting = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const { operativo, control, muestra, analisis, step, location } = getRegistroInicial(detalle);
  const permitsRegistro = tipoLugar === 'CENTRO_ACOPIO' || tipoLugar === 'MEDIO_TRANSPORTE';

  useEffect(() => {
    if (!operativoId) return;
    if (!/^\d+$/.test(operativoId) || !Number.isSafeInteger(Number(operativoId)) || Number(operativoId) < 1) {
      setLoadError('El identificador del operativo no es válido. Abre el registro desde el listado.');
      setLoadStatus('error');
      return;
    }
    const controller = new AbortController();
    setLoadStatus('loading');
    void getOperativoDetalle(Number(operativoId), controller.signal).then((saved) => {
      if (!controller.signal.aborted) { setDetalle(saved); setLoadStatus('ready'); }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setLoadError(error instanceof ApiError && error.status === 404
        ? 'El operativo no existe. Revisa el enlace o vuelve al listado.'
        : 'No fue posible consultar el estado del operativo. No se ha enviado ningún registro.');
      setLoadStatus('error');
    });
    return () => controller.abort();
  }, [operativoId, retry]);

  useEffect(() => { headingRef.current?.focus(); }, [step, loadStatus]);
  useEffect(() => { if (failure) errorRef.current?.focus(); }, [failure]);
  useEffect(() => {
    if (!saving) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [saving]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || loadStatus !== 'ready' || step === 4) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const optional = (name: string) => text(name) || null;
    submitting.current = true;
    setSaving(true); setFailure(null);
    try {
      // Antes de escribir, consultar de nuevo: otro guardado puede haber avanzado.
      let current = getRegistroInicial(detalle);
      if (operativoId) {
        const saved = await getOperativoDetalle(Number(operativoId));
        current = getRegistroInicial(saved);
        setDetalle(saved);
        if (current.step !== step) return;
      }
      if (step === 0 && !current.operativo && !operativoId) {
        const numero = Number(text('numero'));
        if (!Number.isSafeInteger(numero)) throw new ApiError('Introduce un número de operativo entero válido.', 422, ['numero']);
        const created = await createOperativo({ numero, tipo_operativo: text('tipo_operativo') as CreateOperativo['tipo_operativo'], fecha: text('fecha') });
        navigate(`/operativos/${created.id}/registro`, { replace: true });
        return;
      } else if (step === 1 && current.operativo && !current.control) {
        if (!text('parroquia_id') || !selectedLocation) throw new ApiError('Selecciona provincia, cantón y parroquia antes de guardar el control.', 422, ['parroquia_id']);
        await createControl(current.operativo.id, {
          parroquia_id: Number(text('parroquia_id')), propietario: text('propietario'),
          tipo_lugar: text('tipo_lugar') as CreateControl['tipo_lugar'],
          sector: optional('sector'), numero_registro: permitsRegistro ? optional('numero_registro') : null,
          nombre_lugar_muestreado: optional('nombre_lugar_muestreado'), observaciones: optional('observaciones'),
          litros_controlados: text('litros_controlados'), litros_inocuos: text('litros_inocuos'), litros_decomisados: text('litros_decomisados'),
        });
      } else if (step === 2 && current.control && !current.muestra) {
        await createMuestra(current.control.id, { codigo: text('codigo') });
      } else if (step === 3 && current.muestra && !current.analisis) {
        const payload: CreateAnalisisCampo = {
          temperatura_c: optional('temperatura_c'), densidad_corregida: optional('densidad_corregida'),
          acidez: optional('acidez'), ph: optional('ph'), observaciones: optional('observaciones'),
          caracteristicas_organolepticas: optional('caracteristicas_organolepticas') as CreateAnalisisCampo['caracteristicas_organolepticas'],
        };
        for (const name of Object.keys(pruebasCualitativas) as (keyof typeof pruebasCualitativas)[]) {
          payload[name] = optional(name) as CreateAnalisisCampo[typeof name];
        }
        await createAnalisisCampo(current.muestra.id, payload);
      }
      // No avanzar solo por memoria local: reconstruir desde lo persistido.
      if (current.operativo) setDetalle(await getOperativoDetalle(current.operativo.id));
    } catch (error) {
      if (operativoId && error instanceof ApiError && (error.status === 409 || error.status === 0 || error.status === 201 || error.status >= 500)) {
        try {
          const saved = await getOperativoDetalle(Number(operativoId));
          setDetalle(saved);
          if (getRegistroInicial(saved).step !== step) return;
        } catch {
          // Conservar el formulario y el mensaje original; nunca repetir el POST.
        }
      }
      setFailure(getError(error, step));
    } finally {
      submitting.current = false; setSaving(false);
    }
  }

  if (loadStatus !== 'ready') return (
    <section className="wizard-page" aria-labelledby="page-title">
      <div className="page-heading"><h1 id="page-title">Registro del operativo</h1><p>Consulta del progreso guardado en el sistema.</p></div>
      <div className="panel state-message" role={loadStatus === 'loading' ? 'status' : 'alert'}>
        <span className="state-icon" aria-hidden="true">{loadStatus === 'loading' ? '···' : '!'}</span>
        <h2>{loadStatus === 'loading' ? 'Consultando estado del registro' : 'No se pudo abrir el registro'}</h2>
        <p>{loadStatus === 'loading' ? 'Recuperando los pasos guardados para continuar donde lo dejaste.' : loadError}</p>
        {loadStatus === 'error' && <div className="recovery-actions"><button className="button-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar consulta</button><Link className="button-primary" to="/operativos">Volver a Operativos</Link></div>}
      </div>
    </section>
  );

  return (
    <section className="wizard-page" aria-labelledby="page-title">
      <p className="page-eyebrow"><Link to="/operativos">Operativos</Link><span aria-hidden="true">/</span>{operativo ? `Registro #${operativo.numero}` : 'Nuevo operativo'}</p>
      <div className="page-heading">
        <h1 id="page-title">{operativo ? `Operativo #${operativo.numero}` : 'Registrar operativo'}</h1>
        <p>Completa el registro del operativo y su primer control, muestra y análisis de campo.</p>
      </div>
      <ol className="wizard-stepper" aria-label="Estado del registro inicial">
        {steps.map((label, index) => (
          <li key={label} className={index < step ? 'is-complete' : index === step ? 'is-current' : ''} aria-current={index === step ? 'step' : undefined}>
            <span className="step-number" aria-hidden="true">{index < step ? '✓' : index + 1}</span>
            <span><span className="sr-only">Paso {index + 1}: </span>{label}<small>{index < step ? 'Guardado' : index === step ? 'Paso actual' : 'Pendiente'}</small></span>
          </li>
        ))}
      </ol>

      {detalle && detalle.controles.length > 1 && <p className="workflow-note">Este asistente muestra el primer control registrado (ID {control?.id}). Los {detalle.controles.length} controles del operativo se conservan; su gestión individual queda fuera de este flujo inicial.</p>}
      {step < 4 && (
        <>
          <div className="workflow-note">
            <strong>{operativo ? `Continuar registro · Operativo N.º ${operativo.numero}` : 'Un registro, paso a paso'}</strong>
            <p>Cada paso se guarda antes de continuar. Puedes salir y retomar los pasos guardados desde Operativos o desde esta URL. Los campos que aún no hayas guardado no se recuperan.</p>
          </div>
          {control && <p className="wizard-context"><strong>{control.propietario}</strong> · {control.nombre_lugar_muestreado || tiposLugar[control.tipo_lugar]}{muestra && <> · Muestra: <strong>{muestra.codigo}</strong></>}</p>}
          <form className="panel wizard-form" key={step} onSubmit={(event) => void handleSubmit(event)} aria-busy={saving}>
            <div className="panel-heading"><div><p className="step-caption">Paso {step + 1} de 5</p><h2 ref={headingRef} tabIndex={-1}>{steps[step]}</h2><p>{descriptions[step]}</p></div></div>
            <div className="form-body">
              <p className="form-required-note">Los campos marcados con asterisco (*) son obligatorios.</p>
              {failure && <div ref={errorRef} tabIndex={-1} className="form-feedback" role="alert"><strong>No se pudo completar este paso</strong><p>{failure.message}</p>{failure.fields.length > 0 && <ul>{failure.fields.map((name) => <li key={name}>{fieldLabels[name] ? <a href={`#${name}`}>Revisa: {fieldLabels[name]}</a> : 'Revisa los datos del formulario.'}</li>)}</ul>}</div>}
              <fieldset className="form-fields" disabled={saving}>
                <legend className="sr-only">{steps[step]}</legend>
                {step === 0 && <div className="form-grid">
                  <FormField name="numero" label="Número de operativo" required><input id="numero" name="numero" type="number" step="1" required /></FormField>
                  <FormField name="tipo_operativo" label="Tipo de operativo" required><select id="tipo_operativo" name="tipo_operativo" defaultValue="" required><option value="" disabled>Selecciona el tipo</option><EnumOptions options={tiposOperativo} /></select></FormField>
                  <FormField name="fecha" label="Fecha del operativo" required><input id="fecha" name="fecha" type="date" required /></FormField>
                </div>}
                {step === 1 && <>
                  <section className="form-section" aria-labelledby="location-title"><h3 id="location-title">Ubicación del control</h3><p>Selecciona la ubicación del lugar donde se realizó el control.</p><GeographyFields onLocationChange={setSelectedLocation} /><FormField name="sector" label="Sector"><input id="sector" name="sector" type="text" /></FormField></section>
                  <section className="form-section" aria-labelledby="place-title"><h3 id="place-title">Propietario y lugar</h3><div className="form-grid">
                    <FormField name="propietario" label="Propietario" required><input id="propietario" name="propietario" maxLength={255} type="text" required /></FormField>
                    <FormField name="tipo_lugar" label="Tipo de lugar" required><select id="tipo_lugar" name="tipo_lugar" required value={tipoLugar} onChange={(event) => setTipoLugar(event.target.value)}><option value="" disabled>Selecciona el tipo de lugar</option><EnumOptions options={tiposLugar} /></select></FormField>
                    <FormField name="nombre_lugar_muestreado" label="Nombre del lugar muestreado"><input id="nombre_lugar_muestreado" name="nombre_lugar_muestreado" maxLength={255} type="text" /></FormField>
                    {permitsRegistro && <FormField name="numero_registro" label="Número de registro" hint="Disponible para centros de acopio y medios de transporte."><input id="numero_registro" name="numero_registro" type="text" aria-describedby="numero_registro-hint" /></FormField>}
                  </div></section>
                  <section className="form-section volume-section" aria-labelledby="volume-title"><h3 id="volume-title">Volumen de leche</h3><p id="volume-hint">Los litros controlados deben ser iguales a la suma de litros inocuos y decomisados. Todos los valores deben ser cero o mayores.</p><div className="form-grid geography-grid">
                    {(['litros_controlados', 'litros_inocuos', 'litros_decomisados'] as const).map((name) => <FormField key={name} name={name} label={fieldLabels[name]} required><input id={name} name={name} type="number" min="0" step="any" required aria-describedby="volume-hint" /></FormField>)}
                  </div></section>
                  <FormField name="observaciones" label="Observaciones"><textarea id="observaciones" name="observaciones" rows={3} /></FormField>
                </>}
                {step === 2 && <FormField name="codigo" label="Código de muestra" required hint="Ingresa el código que identifica la muestra tomada en este control."><input id="codigo" name="codigo" type="text" required aria-describedby="codigo-hint" /></FormField>}
                {step === 3 && <>
                  <p className="analysis-note">Registra únicamente los resultados disponibles. Los campos sin completar se guardarán sin resultado; no equivalen a un resultado negativo.</p>
                  <section className="form-section" aria-labelledby="parameters-title"><h3 id="parameters-title">Parámetros físico-químicos</h3><div className="form-grid">
                    {Object.entries(parametrosFisicoquimicos).map(([name, label]) => <FormField key={name} name={name} label={label}><input id={name} name={name} type="number" step="any" min={name === 'temperatura_c' ? undefined : 0} max={name === 'ph' ? 14 : undefined} /></FormField>)}
                  </div></section>
                  <section className="form-section" aria-labelledby="results-title"><h3 id="results-title">Resultados cualitativos</h3><div className="form-grid">
                    <FormField name="caracteristicas_organolepticas" label="Características organolépticas"><select id="caracteristicas_organolepticas" name="caracteristicas_organolepticas" defaultValue=""><option value="">Sin resultado</option><EnumOptions options={caracteristicasOrganolepticas} /></select></FormField>
                    {Object.entries(pruebasCualitativas).map(([name, label]) => <FormField key={name} name={name} label={label}><select id={name} name={name} defaultValue=""><option value="">Sin resultado</option><EnumOptions options={resultadosCualitativos} /></select></FormField>)}
                  </div></section>
                  <FormField name="observaciones" label="Observaciones"><textarea id="observaciones" name="observaciones" rows={3} /></FormField>
                </>}
              </fieldset>
            </div>
            <div className="form-actions"><span role="status">{saving ? 'Guardando en el sistema…' : 'El siguiente paso se habilita después de guardar.'}</span><button className="button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : step === 3 ? 'Guardar y finalizar' : 'Guardar y continuar'}<span aria-hidden="true">→</span></button></div>
          </form>
        </>
      )}
      {operativo && control && muestra && analisis && <div className="panel wizard-success">
        <div className="success-heading"><span className="state-icon" aria-hidden="true">✓</span><h2 ref={headingRef} tabIndex={-1}>Registro inicial completo</h2><p>El operativo y su primer control, muestra y análisis de campo están guardados.</p></div>
        <div className="registration-summary">
          <section><h3>Operativo</h3><dl><SummaryItem label="Número">{operativo.numero}</SummaryItem><SummaryItem label="Fecha">{operativo.fecha.split('-').reverse().join('/')}</SummaryItem><SummaryItem label="Tipo">{tiposOperativo[operativo.tipo_operativo]}</SummaryItem></dl></section>
          <section><h3>Control</h3><dl><SummaryItem label="Ubicación">{location}</SummaryItem><SummaryItem label="Sector">{control.sector}</SummaryItem><SummaryItem label="Propietario">{control.propietario}</SummaryItem><SummaryItem label="Lugar">{control.nombre_lugar_muestreado}</SummaryItem><SummaryItem label="Tipo de lugar">{tiposLugar[control.tipo_lugar]}</SummaryItem><SummaryItem label="Número de registro">{control.numero_registro}</SummaryItem><SummaryItem label="Litros controlados">{control.litros_controlados}</SummaryItem><SummaryItem label="Litros inocuos">{control.litros_inocuos}</SummaryItem><SummaryItem label="Litros decomisados">{control.litros_decomisados}</SummaryItem><SummaryItem label="Observaciones">{control.observaciones}</SummaryItem></dl></section>
          <section><h3>Muestra</h3><dl><SummaryItem label="Código">{muestra.codigo}</SummaryItem></dl></section>
          <section><h3>Análisis de campo</h3><dl>
            {Object.entries(parametrosFisicoquimicos).map(([name, label]) => <SummaryItem key={name} label={label}>{analisis[name as keyof typeof parametrosFisicoquimicos]}</SummaryItem>)}
            <SummaryItem label="Características organolépticas">{analisis.caracteristicas_organolepticas ? caracteristicasOrganolepticas[analisis.caracteristicas_organolepticas] : null}</SummaryItem>
            {Object.entries(pruebasCualitativas).map(([name, label]) => { const value = analisis[name as keyof typeof pruebasCualitativas]; return <SummaryItem key={name} label={label}>{value ? resultadosCualitativos[value] : null}</SummaryItem>; })}
            <SummaryItem label="Observaciones">{analisis.observaciones}</SummaryItem>
          </dl></section>
        </div>
        <div className="form-actions"><Link className="button-primary" to="/operativos">Volver a Operativos</Link></div>
      </div>}
    </section>
  );
}
