// Prueba opt-in contra el backend real. Crea UN conjunto de registros y no lo elimina.
// Uso: node scripts/smoke-operativo.mjs --write
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadEnv } from 'vite';

if (!process.argv.includes('--write')) {
  console.log('No se han creado datos. Usa --write para probar la reanudación con un solo conjunto de registros.');
  process.exit(0);
}

const frontendDir = fileURLToPath(new URL('../', import.meta.url));
const apiUrl = process.env.VITE_API_URL ?? loadEnv('development', frontendDir, 'VITE_').VITE_API_URL;
assert.ok(apiUrl, 'Se requiere VITE_API_URL.');
async function loadSource(relativePath, replaceEnv = false) {
  let source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  if (replaceEnv) source = source.replace('import.meta.env.VITE_API_URL', JSON.stringify(apiUrl));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
// Ejecuta servicio y derivación de progreso reales; no reemplaza fetch.
const api = await loadSource('../src/services/api.ts', true);
const { getRegistroInicial } = await loadSource('../src/utils/registroOperativo.ts');
const openapi = await fetch(`${apiUrl.trim().replace(/\/+$/, '')}/openapi.json`).then((response) => response.json());
assert.ok(openapi.paths['/operativos/{operativo_id}/detalle'], 'El backend debe publicar GET detalle antes de crear datos.');
const records = await api.getOperativos();
const provincias = await api.getProvincias();
let parroquia;
for (const provincia of provincias) {
  for (const canton of await api.getCantones(provincia.id)) {
    [parroquia] = await api.getParroquias(canton.id);
    if (parroquia) break;
  }
  if (parroquia) break;
}
assert.ok(parroquia, 'Se necesita una parroquia real del catálogo antes de crear datos.');
await assert.rejects(api.createOperativo({ numero: 'invalido', tipo_operativo: 'AGENCIA', fecha: '2026-10-20' }),
  (error) => error instanceof api.ApiError && error.status === 422 && error.fields.includes('numero'));

let numero = 2_000_000_000 + (Date.now() % 100_000_000);
while (records.some((record) => record.numero === numero)) numero++;
const opPayload = { numero, tipo_operativo: 'AGENCIA', fecha: '2026-10-20' };
const operativo = await api.createOperativo(opPayload);
assert.ok(Number.isInteger(operativo.id));
assert.equal(operativo.numero, numero);
console.log(`CREADO: operativo_id=${operativo.id}, numero=${numero}`);
// Cada consulta reconstruye el flujo sin reutilizar el estado React anterior.
const resume = async () => getRegistroInicial(await api.getOperativoDetalle(operativo.id));
let resumed = await resume();
assert.equal(resumed.step, 1);
assert.equal(resumed.operativo.id, operativo.id);
assert.equal(resumed.control, null);
assert.equal((await resume()).step, 1);
console.log('PASS A: reabrir tras crear Operativo continúa en Control.');
await assert.rejects(api.createOperativo(opPayload), (error) => error instanceof api.ApiError && error.status === 409);

const controlPayload = {
  parroquia_id: parroquia.id, propietario: 'PRUEBA REANUDACION MVP', tipo_lugar: 'CENTRO_ACOPIO',
  sector: null, numero_registro: 'PRUEBA-MVP', nombre_lugar_muestreado: 'Prueba de reanudación del wizard',
  litros_controlados: '10.50', litros_inocuos: '10.25', litros_decomisados: '0.25',
  observaciones: 'Registro de prueba técnica. No corresponde a un control real.',
};
await assert.rejects(api.createControl(operativo.id, { ...controlPayload, litros_controlados: '11' }),
  (error) => error instanceof api.ApiError && error.status === 400);
const control = await api.createControl(operativo.id, controlPayload);
assert.equal(control.operativo_id, operativo.id);
assert.equal(control.parroquia_id, parroquia.id);
assert.equal(Number(control.litros_controlados), 10.5);
console.log(`CREADO: control_id=${control.id}`);
resumed = await resume();
assert.equal(resumed.step, 2);
assert.equal(resumed.control.id, control.id);
assert.equal(resumed.muestra, null);
assert.equal(resumed.control.decomiso, null);
assert.deepEqual(resumed.control.notificaciones, []);
assert.ok(resumed.location);
assert.equal((await resume()).control.id, control.id);
console.log('PASS B: reabrir tras guardar Control continúa en Muestra y conserva la ubicación.');

const muestra = await api.createMuestra(control.id, { codigo: `PRUEBA-REANUDAR-${operativo.id}` });
assert.equal(muestra.control_id, control.id);
console.log(`CREADO: muestra_id=${muestra.id}, codigo=${muestra.codigo}`);
resumed = await resume();
assert.equal(resumed.step, 3);
assert.equal(resumed.muestra.id, muestra.id);
assert.equal(resumed.analisis, null);
assert.equal((await resume()).muestra.id, muestra.id);
console.log('PASS C: reabrir tras guardar Muestra continúa en Análisis.');
await assert.rejects(api.createMuestra(control.id, { codigo: muestra.codigo }),
  (error) => error instanceof api.ApiError && error.status === 409);

const analisis = await api.createAnalisisCampo(muestra.id, {
  temperatura_c: '4.5', densidad_corregida: '1.03', acidez: '0.15', ph: '6.7',
  caracteristicas_organolepticas: 'CUMPLE', estabilidad_proteica: 'NEGATIVO',
  antibiotico_beta_tetra_sulfa: 'NEGATIVO', antibiotico_aminoglucosidos: null,
  aflatoxinas: null, neutralizantes: null, peroxido: null, cloruros: null,
  observaciones: 'PRUEBA REANUDACION MVP: campos sin resultado en null.',
});
assert.equal(analisis.muestra_id, muestra.id);
assert.equal(Number(analisis.ph), 6.7);
assert.equal(analisis.antibiotico_beta_tetra_sulfa, 'NEGATIVO');
assert.equal(analisis.antibiotico_aminoglucosidos, null);
console.log(`CREADO: analisis_id=${analisis.id}`);
resumed = await resume();
assert.equal(resumed.step, 4);
assert.equal(resumed.analisis.id, analisis.id);
assert.equal((await resume()).analisis.id, analisis.id);
console.log('PASS: un registro completo reabre en Resumen.');
await assert.rejects(api.createAnalisisCampo(muestra.id, {}),
  (error) => error instanceof api.ApiError && error.status === 409);

const updated = await api.getOperativos();
assert.equal(updated.filter((record) => record.numero === numero).length, 1);
const finalDetail = await api.getOperativoDetalle(operativo.id);
assert.equal(finalDetail.controles.length, 1);
assert.equal(finalDetail.controles[0].id, control.id);
assert.equal(finalDetail.controles[0].muestra.id, muestra.id);
assert.equal(finalDetail.controles[0].muestra.analisis_campo.id, analisis.id);
console.log('PASS: un operativo, un control, una muestra y un análisis; reconstrucción A/B/C y errores 400/409/422 verificados.');
console.log('La prueba verifica HTTP y la derivación usada por el wizard; no simula un refresh visual de navegador.');
