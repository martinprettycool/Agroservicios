# AgroServicios — Frontend MVP

Única página: listado de operativos (`/operativos`). `/` redirige al listado.

## Desarrollo

Requiere Node.js compatible con Vite 7 (20.19+ o 22.12+).

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Abrir http://localhost:5173/operativos.
`VITE_API_URL` es la URL base del backend. Reiniciar Vite después de cambiarla.
Las variables `VITE_*` son públicas: no colocar secretos en ellas.

```powershell
npm run build
```

Este comando comprueba TypeScript y genera `dist/`.

## Contrato y presentación

`GET /operativos` devuelve `OpResponse[]` definido en `main.py`:
`id: int`, `numero: int`, `tipo_operativo: AGENCIA | INTERINSTITUCIONAL`,
`fecha: date`, `created_at: datetime`, `updated_at: datetime`.
JSON representa las fechas y los timestamps como strings.
La tabla omite los campos de auditoría y presenta la fecha como DD/MM/YYYY
sin convertir zonas horarias. No realiza escrituras.

`src/services/api.ts` centraliza la URL y rechaza respuestas HTTP no exitosas.
La página muestra mensajes propios para carga, lista vacía y error.

## CORS pendiente en el backend

Actualmente `main.py` no configura CORS. Para consumir la API desde el navegador,
FastAPI debe permitir explícitamente el origen `http://localhost:5173`.
El backend no se modificó como parte de esta tarea.
Abrir Vite desde `127.0.0.1` constituye un origen diferente.

En despliegue, el servidor del frontend debe servir `index.html` al abrir
directamente `/operativos` (fallback para React Router).
