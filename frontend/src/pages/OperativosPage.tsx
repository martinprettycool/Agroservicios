import { useEffect, useState } from 'react';
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

  return (
    <section aria-labelledby="page-title">
      <div className="page-heading">
        <h1 id="page-title">Operativos</h1>
        <p>Consulta de operativos registrados</p>
      </div>

      <div className="panel" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <p className="state-message" role="status">Cargando operativos...</p>
        )}
        {state.status === 'error' && (
          <p className="state-message error-message" role="alert">
            No fue posible cargar los operativos.
          </p>
        )}
        {state.status === 'success' && state.operativos.length === 0 && (
          <p className="state-message" role="status">
            No existen operativos registrados.
          </p>
        )}
        {state.status === 'success' && state.operativos.length > 0 && (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Listado de operativos">
            <table>
              <caption className="sr-only">Operativos registrados</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Número</th>
                  <th scope="col">Tipo de operativo</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {state.operativos.map((operativo) => (
                  <tr key={operativo.id}>
                    <td>{operativo.id}</td>
                    <td>{operativo.numero}</td>
                    <td>{tipos[operativo.tipo_operativo]}</td>
                    <td><time dateTime={operativo.fecha}>{formatFecha(operativo.fecha)}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
