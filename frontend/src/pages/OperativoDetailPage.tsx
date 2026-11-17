import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SummaryCard } from '../components/SummaryCard';
import { ControlCard } from '../components/operativos/ControlCard';
import { ApiError, getOperativoDetalle } from '../services/api';
import type { OperativoDetalle } from '../types/operativoDetalle';
import { tiposOperativo } from '../types/operativo';
import { getPasoControl, getRegistroInicial } from '../utils/registroOperativo';
import { formatFecha } from '../utils/format';

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; detalle: OperativoDetalle }
  | { status: 'error' | 'not-found' };

export function OperativoDetailPage() {
  const { operativoId = '' } = useParams();
  return <OperativoDetailLoader key={operativoId} operativoId={operativoId} />;
}

function OperativoDetailLoader({ operativoId }: { operativoId: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!/^\d+$/.test(operativoId) || !Number.isSafeInteger(Number(operativoId)) || Number(operativoId) < 1) {
      setState({ status: 'not-found' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    void getOperativoDetalle(Number(operativoId), controller.signal).then((detalle) => {
      if (!controller.signal.aborted) setState({ status: 'success', detalle });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: error instanceof ApiError && error.status === 404 ? 'not-found' : 'error' });
    });
    return () => controller.abort();
  }, [operativoId, retry]);

  if (state.status === 'success') return <OperativoDetailContent detalle={state.detalle} />;

  return (
    <section className="operativo-detail" aria-labelledby="page-title">
      <Link className="detail-back" to="/operativos">← Volver a Operativos</Link>
      <div className="page-heading"><h1 id="page-title">Detalle del operativo</h1></div>
      <div className="panel state-message" role={state.status === 'loading' ? 'status' : 'alert'}>
        <span className="state-icon" aria-hidden="true">{state.status === 'loading' ? '···' : '!'}</span>
        <h2>{state.status === 'loading' ? 'Cargando operativo…' : state.status === 'not-found' ? 'El operativo solicitado no existe.' : 'No fue posible cargar la información del operativo.'}</h2>
        <p>{state.status === 'loading' ? 'Consultando sus datos y controles asociados.' : state.status === 'not-found' ? 'Revisa el enlace o selecciona un operativo desde el listado.' : 'Comprueba la conexión e intenta consultar nuevamente.'}</p>
        {state.status === 'error' && <div className="recovery-actions"><button className="button-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar consulta</button></div>}
      </div>
    </section>
  );
}

export function OperativoDetailContent({ detalle }: { detalle: OperativoDetalle }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const initial = getRegistroInicial(detalle);
  const total = detalle.controles.length;
  const complete = detalle.controles.filter((control) => getPasoControl(control) === 4).length;
  const pending = total - complete;
  const resumeUrl = `/operativos/${detalle.id}/registro`;
  const nextStep = initial.step === 1 ? 'Control' : initial.step === 2 ? 'Muestra' : 'Análisis de campo';

  useEffect(() => { titleRef.current?.focus(); }, [detalle.id]);

  return (
    <section className="operativo-detail" aria-labelledby="page-title">
      <Link className="detail-back" to="/operativos">← Volver a Operativos</Link>
      <header className="page-heading detail-heading">
        <div><p className="detail-eyebrow">Ficha del operativo · ID {detalle.id}</p><h1 ref={titleRef} id="page-title" tabIndex={-1}>Operativo N.º {detalle.numero}</h1><p>Información general y seguimiento de sus controles.</p></div>
        <span className={`badge ${initial.step === 4 ? 'badge-agency' : 'badge-joint'}`}>{initial.step === 4 ? 'Registro inicial completo' : 'Registro inicial incompleto'}</span>
      </header>

      <section className="panel detail-general" aria-label="Datos generales del operativo">
        <dl className="detail-facts">
          <div><dt>Número de operativo</dt><dd>{detalle.numero}</dd></div>
          <div><dt>Tipo de operativo</dt><dd>{tiposOperativo[detalle.tipo_operativo]}</dd></div>
          <div><dt>Fecha del operativo</dt><dd><time dateTime={detalle.fecha}>{formatFecha(detalle.fecha)}</time></dd></div>
        </dl>
      </section>
      <dl className="summary-grid" aria-label="Resumen de controles">
        <SummaryCard label="Controles registrados" value={total} description="Asociados a este operativo" />
        <SummaryCard label="Controles completos" value={complete} description="Con muestra y análisis de campo" variant="agency" />
        <SummaryCard label="Controles pendientes" value={pending} description="Sin muestra o sin análisis de campo" variant="joint" />
      </dl>

      {initial.step < 4 ? <aside className="detail-progress" aria-label="Registro inicial pendiente">
        <div><strong>Este registro aún no está completo.</strong><p>Continúa desde {nextStep}{initial.control ? `, en el control #${initial.control.id}` : ''}. Los pasos guardados se conservan.</p></div>
        <Link className="button-primary" to={resumeUrl}>Continuar registro <span aria-hidden="true">→</span></Link>
      </aside> : pending > 0 && <p className="workflow-note">El registro inicial está completo. Hay otros controles pendientes; su continuación individual todavía no está disponible en el asistente actual.</p>}

      <section aria-labelledby="controls-title">
        <div className="detail-section-heading"><div><h2 id="controls-title">Controles</h2><p>Controles asociados a este operativo</p></div><span className="resource-count" aria-label={`${total} controles registrados`}>{total}</span></div>
        {total === 0 ? <div className="panel state-message">
          <span className="state-icon" aria-hidden="true">≡</span>
          <h3>Este operativo todavía no tiene controles registrados.</h3>
          <p>Continúa el registro inicial para guardar su primer control.</p>
          <div className="recovery-actions"><Link className="button-primary" to={resumeUrl}>Continuar registro</Link></div>
        </div> : <div className="control-list">{detalle.controles.map((control) => <ControlCard key={control.id} control={control} canResume={initial.control?.id === control.id && initial.step < 4} />)}</div>}
      </section>
    </section>
  );
}
