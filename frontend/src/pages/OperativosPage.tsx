import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SummaryCard } from '../components/SummaryCard';
import { getOperativos } from '../services/api';
import type { Operativo } from '../types/operativo';

type PageState =
  | { status: 'loading' }
  | { status: 'success'; operativos: Operativo[] }
  | { status: 'error' };

const tipos: Record<Operativo['tipo_operativo'], string> = {
  AGENCIA: 'Agencia',
  INTERINSTITUCIONAL: 'Interinstitucional',
};

function formatFecha(fecha: string): string {
  // Es una fecha de negocio, no un instante: no convertir a zona horaria.
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

export function OperativosPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadOperativos() {
      try {
        const operativos = await getOperativos(controller.signal);
        if (!controller.signal.aborted) {
          setState({ status: 'success', operativos });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: 'error' });
        }
      }
    }

    void loadOperativos();
    return () => controller.abort();
  }, []);

  const operativos = state.status === 'success' ? state.operativos : null;

  return (
    <section aria-labelledby="page-title">
      <p className="page-eyebrow">Operaciones <span aria-hidden="true">/</span> Operativos</p>
      <div className="page-heading">
        <h1 id="page-title">Operativos</h1>
        <p>Gestión y seguimiento de operativos registrados</p>
      </div>

      <dl className="summary-grid" aria-label="Resumen de operativos">
        <SummaryCard label="Total de operativos" value={operativos?.length ?? null} description="Registros en el sistema" />
        <SummaryCard label="Operativos Agencia" value={operativos?.filter((item) => item.tipo_operativo === 'AGENCIA').length ?? null} description="Operativos de la Agencia" variant="agency" />
        <SummaryCard label="Operativos Interinstitucionales" value={operativos?.filter((item) => item.tipo_operativo === 'INTERINSTITUCIONAL').length ?? null} description="Coordinación entre instituciones" variant="joint" />
      </dl>

      <section className="panel" aria-labelledby="records-title">
        <div className="panel-heading">
          <div>
            <h2 id="records-title">Operativos registrados</h2>
            <p>Consulta el número, tipo y fecha de cada operativo.</p>
          </div>
          <div className="panel-action">
            <Link className="button-primary" to="/operativos/nuevo"><span aria-hidden="true">+</span> Nuevo operativo</Link>
          </div>
        </div>
        <div aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && (
            <div className="state-message" role="status">
              <span className="state-icon loading-icon" aria-hidden="true">···</span>
              <h3>Cargando operativos</h3>
              <p>Estamos consultando los registros del sistema.</p>
            </div>
          )}
          {state.status === 'error' && (
            <div className="state-message error-message" role="alert">
              <span className="state-icon" aria-hidden="true">!</span>
              <h3>No fue posible cargar los operativos</h3>
              <p>Verifica la conexión y vuelve a cargar la página para intentarlo de nuevo.</p>
            </div>
          )}
          {operativos?.length === 0 && (
            <div className="state-message" role="status">
              <span className="state-icon" aria-hidden="true">≡</span>
              <h3>Aún no hay operativos</h3>
              <p>No existen operativos registrados todavía. Aquí podrás consultar los registros cuando estén disponibles.</p>
            </div>
          )}
          {operativos !== null && operativos.length > 0 && (
            <>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Listado de operativos">
                <table>
                  <caption className="sr-only">Operativos registrados</caption>
                  <thead><tr><th scope="col">ID</th><th scope="col">Número</th><th scope="col">Tipo</th><th scope="col">Fecha</th><th scope="col">Acciones</th></tr></thead>
                  <tbody>
                    {operativos.map((operativo) => (
                      <tr key={operativo.id}>
                        <td className="record-id">{operativo.id}</td>
                        <td className="record-number">{operativo.numero}</td>
                        <td><span className={`badge ${operativo.tipo_operativo === 'AGENCIA' ? 'badge-agency' : 'badge-joint'}`}>{tipos[operativo.tipo_operativo]}</span></td>
                        <td><time dateTime={operativo.fecha}>{formatFecha(operativo.fecha)}</time></td>
                        <td><Link className="record-action" to={`/operativos/${operativo.id}`} aria-label={`Ver el operativo ${operativo.numero}`}>Ver <span aria-hidden="true">→</span></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel-footer">{operativos.length} {operativos.length === 1 ? 'operativo registrado' : 'operativos registrados'}</div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}
