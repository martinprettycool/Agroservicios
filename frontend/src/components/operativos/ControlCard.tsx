import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ControlDetalle } from '../../types/operativoDetalle';
import { tiposLugar } from '../../types/control';
import { parametrosFisicoquimicos, pruebasCualitativas, resultadosCualitativos, caracteristicasOrganolepticas } from '../../types/analisisCampo';
import { getPasoControl } from '../../utils/registroOperativo';
import { formatFecha, formatDecimal } from '../../utils/format';

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children ?? 'Sin registrar'}</dd></div>;
}

export function ControlCard({ control, canResume }: { control: ControlDetalle; canResume: boolean }) {
  const { muestra, decomiso, notificaciones, parroquia } = control;
  const analisis = muestra?.analisis_campo ?? null;
  const step = getPasoControl(control);
  const progressLabel = step === 2 ? 'Pendiente de muestra' : step === 3 ? 'Pendiente de análisis' : 'Registro completo';
  const resumeUrl = `/operativos/${control.operativo_id}/registro`;

  return (
    <article className="panel control-card" aria-labelledby={`control-${control.id}-title`}>
      <header className="control-card-heading">
        <div>
          <p className="control-reference">Control #{control.id}</p>
          <h3 id={`control-${control.id}-title`}>{control.propietario}</h3>
          <p className="control-place">{tiposLugar[control.tipo_lugar]}{control.nombre_lugar_muestreado && <> · {control.nombre_lugar_muestreado}</>}</p>
        </div>
        <span className={`badge ${step === 4 ? 'badge-agency' : 'badge-joint'}`}>{progressLabel}</span>
      </header>

      <div className="control-card-body">
        <dl className="detail-facts control-location">
          <Info label="Ubicación">{parroquia.nombre}, {parroquia.canton.nombre}, {parroquia.canton.provincia.nombre}</Info>
          <Info label="Sector">{control.sector}</Info>
          {control.numero_registro && <Info label="Número de registro">{control.numero_registro}</Info>}
        </dl>
        <dl className="control-volumes" aria-label="Volumen de leche">
          <Info label="Litros controlados">{formatDecimal(control.litros_controlados)} <span>L</span></Info>
          <Info label="Litros inocuos">{formatDecimal(control.litros_inocuos)} <span>L</span></Info>
          <Info label="Litros decomisados">{formatDecimal(control.litros_decomisados)} <span>L</span></Info>
        </dl>
        {control.observaciones && <p className="detail-observations"><strong>Observaciones del control</strong>{control.observaciones}</p>}

        <div className="control-resources">
          <section className="control-resource" aria-labelledby={`sample-${control.id}-title`}>
            <div className="resource-heading"><h4 id={`sample-${control.id}-title`}>Muestra</h4>{muestra && <span className="badge badge-agency">Registrada</span>}</div>
            {muestra ? <dl className="detail-facts"><Info label="Código de muestra"><span className="sample-code">{muestra.codigo}</span></Info><Info label="Identificador">#{muestra.id}</Info></dl> : <>
              <p className="resource-empty">Muestra pendiente</p>
              {canResume && <Link className="button-secondary" to={resumeUrl}>Continuar registro <span aria-hidden="true">→</span></Link>}
            </>}
          </section>
          <section className="control-resource" aria-labelledby={`analysis-${control.id}-title`}>
            <div className="resource-heading"><h4 id={`analysis-${control.id}-title`}>Análisis de campo</h4>{analisis && <span className="badge badge-agency">Registrado</span>}</div>
            {analisis ? <>
              <h5 className="resource-subtitle">Parámetros físico-químicos</h5>
              <dl className="detail-facts analysis-parameters">{Object.entries(parametrosFisicoquimicos).map(([name, label]) => <Info key={name} label={label}>{formatDecimal(analisis[name as keyof typeof parametrosFisicoquimicos])}</Info>)}</dl>
              <details className="qualitative-results">
                <summary>Resultados cualitativos</summary>
                <dl className="detail-facts">
                  <Info label="Características organolépticas">{analisis.caracteristicas_organolepticas ? caracteristicasOrganolepticas[analisis.caracteristicas_organolepticas] : 'Sin resultado'}</Info>
                  {Object.entries(pruebasCualitativas).map(([name, label]) => {
                    const value = analisis[name as keyof typeof pruebasCualitativas];
                    return <Info key={name} label={label}>{value ? resultadosCualitativos[value] : 'Sin resultado'}</Info>;
                  })}
                </dl>
              </details>
              {analisis.observaciones && <p className="detail-observations"><strong>Observaciones del análisis</strong>{analisis.observaciones}</p>}
            </> : <>
              <p className="resource-empty">Análisis pendiente</p>
              {canResume && muestra && <Link className="button-secondary" to={resumeUrl}>Continuar registro <span aria-hidden="true">→</span></Link>}
            </>}
          </section>
          <section className="control-resource" aria-labelledby={`seizure-${control.id}-title`}>
            <div className="resource-heading"><h4 id={`seizure-${control.id}-title`}>Decomiso</h4>{decomiso && <span className="badge badge-joint">Registrado</span>}</div>
            {decomiso ? <dl className="detail-facts">
              <Info label="Motivo">{decomiso.motivo}</Info>
              <Info label="Destino">{decomiso.destino}</Info>
              {decomiso.numero_acta_decomiso && <Info label="Acta de decomiso">{decomiso.numero_acta_decomiso}</Info>}
              {decomiso.numero_acta_destruccion && <Info label="Acta de destrucción">{decomiso.numero_acta_destruccion}</Info>}
            </dl> : <p className="resource-empty">Sin decomiso registrado</p>}
          </section>
          <section className="control-resource" aria-labelledby={`notifications-${control.id}-title`}>
            <div className="resource-heading"><h4 id={`notifications-${control.id}-title`}>Notificaciones</h4><span className="resource-count" aria-label={`${notificaciones.length} notificaciones`}>{notificaciones.length}</span></div>
            {notificaciones.length > 0 ? <ul className="notification-list">{notificaciones.map((notification) => <li key={notification.id}>
              <div className="notification-heading"><strong>{notification.tipo === 'INDUSTRIA_LACTEA' ? 'Industria láctea' : 'ARCSA'}</strong><span className={`badge ${notification.estado === 'EMITIDA' ? 'badge-agency' : 'badge-neutral'}`}>{notification.estado === 'EMITIDA' ? 'Emitida' : 'Pendiente'}</span></div>
              <dl className="detail-facts">
                {notification.numero_documento && <Info label="Documento">{notification.numero_documento}</Info>}
                {notification.fecha && <Info label="Fecha"><time dateTime={notification.fecha}>{formatFecha(notification.fecha)}</time></Info>}
              </dl>
              {notification.observaciones && <p className="detail-observations">{notification.observaciones}</p>}
            </li>)}</ul> : <p className="resource-empty">Sin notificaciones registradas</p>}
          </section>
        </div>
      </div>
      {step < 4 && !canResume && <footer className="control-card-footer">El asistente actual continúa únicamente el primer control del operativo. Este control conserva sus datos; su continuación individual aún no está disponible.</footer>}
    </article>
  );
}
