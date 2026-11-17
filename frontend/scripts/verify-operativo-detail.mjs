// Verificación de lectura/renderizado. Nunca realiza POST ni crea datos.
// node scripts/verify-operativo-detail.mjs [--live]
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-detail-check',
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});

try {
  const { OperativoDetailContent } = await server.ssrLoadModule('/src/pages/OperativoDetailPage.tsx');
  const { getRegistroInicial, getPasoControl } = await server.ssrLoadModule('/src/utils/registroOperativo.ts');
  const { formatDecimal, formatFecha } = await server.ssrLoadModule('/src/utils/format.ts');
  const render = (detalle) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(OperativoDetailContent, { detalle })));
  const audit = { created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z' };
  const operativo = { id: 42, numero: 32, tipo_operativo: 'AGENCIA', fecha: '2026-10-20', ...audit, controles: [] };
  const control = (id) => ({
    id, operativo_id: 42, parroquia_id: 3, propietario: `Propietario de prueba ${id}`, tipo_lugar: 'CENTRO_ACOPIO',
    litros_controlados: '1234.567890', litros_inocuos: '1234.567890', litros_decomisados: '0',
    sector: null, numero_registro: null, nombre_lugar_muestreado: null, observaciones: null, ...audit,
    parroquia: { id: 3, nombre: 'Parroquia de prueba', canton_id: 2, canton: { id: 2, nombre: 'Cantón de prueba', provincia_id: 1, provincia: { id: 1, nombre: 'Provincia de prueba' } } },
    muestra: null, decomiso: null, notificaciones: [],
  });
  const muestra = (id) => ({ id: id * 10, control_id: id, codigo: `MUE-PRUEBA-${id}`, ...audit, analisis_campo: null });
  const analisis = (muestraId) => ({
    id: muestraId * 10, muestra_id: muestraId, ...audit,
    temperatura_c: '0', densidad_corregida: null, acidez: '0.15', ph: '6.7',
    caracteristicas_organolepticas: 'CUMPLE', estabilidad_proteica: 'NEGATIVO',
    antibiotico_beta_tetra_sulfa: null, antibiotico_aminoglucosidos: null, aflatoxinas: null,
    neutralizantes: null, peroxido: null, cloruros: null, observaciones: null,
  });

  let html = render(operativo);
  assert.ok(html.includes('Este operativo todavía no tiene controles registrados.'));
  assert.ok(html.includes('href="/operativos/42/registro"'));
  assert.equal(getRegistroInicial(operativo).step, 1);
  console.log('PASS: operativo sin controles y continuación desde Control.');

  const first = control(101);
  html = render({ ...operativo, controles: [first] });
  assert.ok(html.includes('Pendiente de muestra'));
  assert.ok(html.includes('Muestra pendiente'));
  assert.ok(html.includes('Análisis pendiente'));
  assert.ok(html.includes('Sin decomiso registrado'));
  assert.ok(html.includes('Sin notificaciones registradas'));
  assert.ok(!html.includes('Registrar decomiso'));
  assert.ok(!html.includes('Registrar notificación'));
  assert.equal(getPasoControl(first), 2);
  console.log('PASS: control incompleto y actuaciones opcionales ausentes.');

  first.muestra = muestra(first.id);
  html = render({ ...operativo, controles: [first] });
  assert.ok(html.includes('Pendiente de análisis'));
  assert.ok(html.includes(first.muestra.codigo));
  assert.equal(getRegistroInicial({ ...operativo, controles: [first] }).step, 3);

  first.muestra.analisis_campo = analisis(first.muestra.id);
  html = render({ ...operativo, controles: [first] });
  assert.ok(html.includes('Registro completo'));
  assert.ok(html.includes('Resultados cualitativos'));
  assert.ok(html.includes('Sin resultado'));
  assert.ok(html.includes('Negativo'));
  assert.ok(html.includes('1.234,567890'));
  assert.ok(!html.includes('Continuar registro'));
  assert.equal(getRegistroInicial({ ...operativo, controles: [first] }).step, 4);
  console.log('PASS: control completo, resultados null y decimales sin redondear.');

  const second = control(102);
  const third = control(103);
  third.muestra = muestra(third.id);
  first.decomiso = { id: 8, control_id: first.id, motivo: 'Motivo de prueba', destino: 'Destino de prueba', numero_acta_decomiso: '0012', numero_acta_destruccion: '0013', ...audit };
  first.notificaciones = [
    { id: 9, control_id: first.id, tipo: 'ARCSA', estado: 'PENDIENTE', numero_documento: 'DOC-PRUEBA', fecha: '2026-10-19', observaciones: null, ...audit },
    { id: 10, control_id: first.id, tipo: 'INDUSTRIA_LACTEA', estado: 'EMITIDA', numero_documento: null, fecha: null, observaciones: null, ...audit },
  ];
  html = render({ ...operativo, controles: [first, second, third] });
  assert.equal([...html.matchAll(/<article\b/g)].length, 3);
  assert.ok(html.includes('control-101-title') && html.includes('control-102-title') && html.includes('control-103-title'));
  assert.ok(/Controles pendientes[\s\S]*?<dd>2<\/dd>/.test(html));
  assert.ok(!html.includes('href="/operativos/42/registro"'), 'No enviar al wizard inicial para continuar otro control.');
  assert.ok(html.includes('Motivo de prueba') && html.includes('Destino de prueba'));
  assert.ok(html.includes('0012') && html.includes('0013') && html.includes('DOC-PRUEBA'));
  assert.ok(html.includes('Industria láctea') && html.includes('Emitida') && html.includes('Pendiente'));
  assert.ok(html.includes('19/10/2026'));
  console.log('PASS: todos los controles, conteos, decomiso y múltiples notificaciones.');

  html = render({ ...operativo, controles: [second, first] });
  assert.ok(html.includes('href="/operativos/42/registro"'));
  assert.equal(getRegistroInicial({ ...operativo, controles: [second, first] }).control.id, second.id);
  assert.equal(getRegistroInicial(null).step, 0);
  assert.equal(formatDecimal('0'), '0');
  assert.equal(formatDecimal(null), 'Sin resultado');
  assert.equal(formatDecimal('12345678901234567890.123456789'), '12.345.678.901.234.567.890,123456789');
  assert.equal(formatFecha('2026-10-20'), '20/10/2026');
  console.log('PASS: progreso compartido con wizard y formatos sin pérdida de precisión.');

  if (process.argv.includes('--live')) {
    const api = await server.ssrLoadModule('/src/services/api.ts');
    const records = await api.getOperativos();
    const selected = [...new Set([records[0]?.id, records.at(-1)?.id].filter((id) => id !== undefined))];
    for (const id of selected) {
      const detail = await api.getOperativoDetalle(id);
      const markup = render(detail);
      assert.equal([...markup.matchAll(/<article\b/g)].length, detail.controles.length);
      console.log(`PASS LIVE: operativo ${id}, ${detail.controles.length} controles renderizados desde la API real.`);
    }
    const missingId = Math.max(0, ...records.map((record) => record.id)) + 1;
    await assert.rejects(api.getOperativoDetalle(missingId), (error) => error instanceof api.ApiError && error.status === 404);
    console.log('PASS LIVE: 404 conservado por la capa API. Sin escrituras.');
  }
} finally {
  await server.close();
}
