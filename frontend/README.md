# AgroServicios — Frontend MVP

Aplicación React + TypeScript + Vite con layout institucional compartido.

## Desarrollo

Requiere Node.js compatible con Vite 7 (20.19+ o 22.12+).

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

`VITE_API_URL` configura la URL base del backend. Reiniciar Vite después de cambiarla.
Las variables `VITE_*` son públicas: no colocar secretos en ellas.

```powershell
npm run build
```

Comprueba TypeScript y genera `dist/`.

## Pantallas

- `/`: redirige a `/operativos`.
- `/operativos`: listado real, resumen por tipo y acceso a Nuevo operativo.
- `/operativos/nuevo`: primer paso para crear un operativo.
- `/operativos/:operativoId`: ficha de consulta con todos sus controles y recursos asociados.
- `/operativos/:operativoId/registro`: consulta y continuación del registro inicial.

El hosting debe servir `index.html` al abrir directamente estas rutas (fallback
para React Router). El backend ya permite los orígenes locales de Vite.

El listado ofrece «Ver» y abre la ficha, sin consultar un detalle por cada fila.
La ficha reutiliza el GET agregado y muestra todos los controles, sus muestras,
análisis, decomisos y notificaciones. Si el registro inicial está incompleto,
ofrece «Continuar registro» hacia el asistente existente.
No permite crear nuevos controles, decomisos o notificaciones desde esta ficha.

## Registro guiado reanudable

1. **Operativo**: `POST /operativos`, schema `CreateOp`.
   Al recibir 201, se reemplaza la URL por `/operativos/{id}/registro`.
2. **Control**: `POST /operativos/{op_id}/controles`, schema `CreateControl`.
3. **Muestra**: `POST /controles/{control_id}/muestra`, schema `CreateMuestra`.
4. **Análisis de campo**: `POST /muestras/{muestra_id}/analisis-campo`, schema `CreateAnalisis`.
5. **Resumen**: presenta las relaciones guardadas y permite volver al listado.

`GET /operativos/{operativo_id}/detalle` devuelve 200 con los campos del Operativo
y todos sus controles, ordenados por `created_at` e `id`. Devuelve 404 si no existe.
Cada Control incluye la jerarquía geográfica, `muestra` con `analisis_campo`,
`decomiso` y `notificaciones`. Las relaciones escalares ausentes se representan
con null; las colecciones, con listas vacías. Los POST existentes no cambian.

El GET usa selectinload para colecciones y joinedload para relaciones escalares.
Materializa los schemas Pydantic dentro de la Session y bloquea cargas diferidas
no declaradas. No añade tablas, columnas ni estados persistidos.

El primer Control de esa lista es el del flujo inicial. Los demás se conservan,
pero su avance no cambia el paso de este wizard. El helper `getRegistroInicial`
deriva el paso exclusivamente de las relaciones recuperadas:

- Sin Control: Control.
- Control sin Muestra: Muestra.
- Muestra sin Análisis: Análisis de campo.
- Análisis existente: Resumen, flujo inicial completo.

Al abrir o refrescar la ruta se reconstruye el estado desde el GET. Antes de cada
POST posterior al Operativo se vuelve a consultar: si el flujo ya avanzó, se usa
el estado guardado sin repetir el POST. Después de guardar se consulta de nuevo.
No se utiliza localStorage. Los valores de campos aún no guardados se pierden al
salir o refrescar; los recursos persistidos permanecen y se pueden reanudar.

## Contratos y validación

La ubicación usa los catálogos reales de provincias, cantones y parroquias.
Cambiar un padre limpia las selecciones dependientes y cancela consultas anteriores.
Solo `parroquia_id` se envía en el Control.

Los decimales se envían como texto para conservar precisión, admitido por Pydantic.
Las fechas de negocio usan YYYY-MM-DD y se muestran como DD/MM/YYYY, sin convertir
zonas horarias. Los enums mantienen sus valores del backend con etiquetas legibles.

Los volúmenes deben ser no negativos y los litros controlados deben igualar la
suma de inocuos y decomisados. PostgreSQL protege el balance. El número de registro
solo se ofrece para centro de acopio y medio de transporte, según la restricción SQL.
Los resultados de análisis son opcionales; vacío se envía como null, nunca como
un resultado negativo implícito.

## Errores y límites de concurrencia

Los errores mantienen los campos del paso actual. Se presentan mensajes propios
para 400, 404 y 409; los 422 identifican campos sin mostrar JSON ni trazas.
Una carga de detalle fallida bloquea los formularios y permite reintentar la consulta.
No se reintentan escrituras automáticamente. Ante conflictos o respuestas inciertas,
se intenta consultar de nuevo el estado antes de presentar el error.

El backend no ofrece claves de idempotencia. La consulta previa evita repetir
recursos que ya existen, pero no convierte GET + POST en una operación atómica:
dos pestañas que creen el primer Control exactamente a la vez podrían crear dos,
pues Operativo admite varios controles. Esto requeriría un contrato de idempotencia
adicional y no se modifica en esta iteración. Si se pierde la primera respuesta de
creación del Operativo, se puede localizar y reabrir desde el listado.

## Verificación

```powershell
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

Ejecutar desde la raíz del repositorio. Usa la configuración existente de
`TEST_DB_URL`, protegida para apuntar a `agroservicios_test`.

Con el backend local actualizado y los catálogos disponibles:

```powershell
cd frontend
node scripts/smoke-operativo.mjs --write
```

**Crea un único conjunto de registros persistentes**, identificado como
PRUEBA REANUDACION MVP. No los elimina. Sin `--write` no ejecuta escrituras.
Usa VITE_API_URL, las funciones reales de `api.ts` y `getRegistroInicial`.
Reconstruye desde nuevas consultas los escenarios A (sin Control), B (sin Muestra),
C (sin Análisis) y el resumen completo; verifica IDs, decimales, null y errores.
Es una prueba HTTP del servicio y la derivación de progreso, no un refresh visual
ni una prueba de interacción del navegador.

## Verificación de la ficha (sin escrituras)

```powershell
cd frontend
node scripts/verify-operativo-detail.mjs
node scripts/verify-operativo-detail.mjs --live
```

La primera opción renderiza los componentes reales con fixtures de prueba: sin
controles, muestra pendiente, análisis pendiente, completo, varios controles y
actuaciones opcionales. También verifica que solo el primer Control incompleto
tenga acceso al wizard, que null no se interprete como negativo y que los decimales
no se redondeen. Usa React DOM Server y Vite ya instalados, con caché separada del
desarrollo. No instala dependencias ni añade datos de ejemplo a la aplicación.

`--live` añade consultas GET con VITE_API_URL y renderiza fichas reales, además de
verificar un 404. No ejecuta POST. Esta verificación no sustituye la inspección
visual ni las interacciones en un navegador.

Los conteos de completos/pendientes describen la presencia de Muestra y Análisis,
no una evaluación de conformidad sanitaria. Decomiso y Notificaciones son acciones
opcionales. Los controles posteriores al primero se muestran con su avance real,
pero todavía no tienen un flujo individual de continuación.
