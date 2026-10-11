# Contexto del producto — AgroServicios

## 1. Propósito

AgroServicios es una aplicación backend orientada a automatizar procesos técnicos y regulatorios agropecuarios que actualmente se gestionan de forma manual mediante matrices, formularios y archivos Excel.

El objetivo es transformar esos procesos manuales en un sistema estructurado, validable y consultable, manteniendo la lógica técnica del proceso pero evitando reproducir directamente la estructura de los archivos Excel en la base de datos.

El primer flujo que se está modelando corresponde al control de leche cruda.

---

## 2. Problema actual

La información del proceso se encuentra actualmente en matrices Excel que combinan en una misma estructura:

- datos del operativo;
- ubicación geográfica;
- información del propietario o actor controlado;
- información del establecimiento o lugar;
- datos de registro;
- información de muestras;
- resultados de análisis de campo;
- resultados de laboratorio;
- decomisos;
- notificaciones;
- observaciones;
- actuaciones administrativas.

Este formato funciona como herramienta de captura y reporte, pero no representa necesariamente un buen modelo relacional.

AgroServicios debe separar estas responsabilidades en entidades y relaciones coherentes.

---

## 3. Objetivo del sistema

El sistema deberá permitir progresivamente:

1. registrar operativos;
2. registrar los controles realizados dentro de cada operativo;
3. asociar cada control con su ubicación geográfica;
4. registrar los actores, establecimientos o lugares controlados;
5. registrar información relacionada con su estado de registro;
6. registrar muestras cuando corresponda;
7. registrar resultados técnicos y científicos;
8. registrar resultados de laboratorio;
9. aplicar reglas de validación e integridad de datos;
10. registrar decomisos, notificaciones u otras actuaciones cuando correspondan;
11. consultar la información almacenada;
12. generar reportes y exportaciones;
13. reducir o reemplazar progresivamente la captura manual mediante matrices Excel.

---

## 4. Estrategia de desarrollo

El proyecto se construirá de forma incremental.

La prioridad actual es comprender y diseñar correctamente el modelo de datos antes de desarrollar el resto del backend.

Roadmap general:

### Fase 1 — Modelo de dominio y base de datos

- identificar entidades;
- definir atributos;
- establecer primary keys;
- establecer foreign keys;
- establecer cardinalidades;
- identificar catálogos y enums;
- definir constraints;
- evitar redundancia innecesaria;
- validar que el modelo represente correctamente el proceso real.

### Fase 2 — Migraciones

Crear y revisar las migraciones necesarias para PostgreSQL una vez que las principales relaciones del dominio estén suficientemente estables.

### Fase 3 — Schemas y validación de API

Crear schemas Pydantic para:

- requests;
- responses;
- normalización de entrada;
- validaciones propias de la API.

### Fase 4 — Lógica de negocio

Implementar reglas que dependan del proceso y no únicamente de la integridad estructural de la base de datos.

### Fase 5 — API

Construir endpoints FastAPI para:

- creación;
- consulta;
- actualización;
- filtrado;
- procesos relacionados.

### Fase 6 — Testing

Implementar pruebas para:

- modelos;
- constraints;
- relaciones;
- reglas de negocio;
- endpoints.

### Fase 7 — Reportes y automatización

Permitir consultas, reportes y exportaciones que reemplacen progresivamente las matrices manuales.

---

## 5. Principio de modelado

Los archivos Excel son una fuente para comprender el dominio, no una plantilla que deba copiarse directamente a PostgreSQL.

Antes de transformar una columna de Excel en una columna SQL, determinar si representa:

- una entidad;
- un atributo;
- una relación;
- un catálogo;
- un enum;
- un estado;
- un valor derivado;
- una medición;
- o una regla de negocio.

Evitar crear una única tabla con todas las columnas de la matriz original.

---

## 6. Separación conceptual de datos

Actualmente se reconocen al menos dos grandes grupos de información.

### Datos operativos o corporativos

Incluyen información relacionada con:

- operativos;
- controles;
- fechas;
- ubicación geográfica;
- propietarios o actores;
- establecimientos;
- tipos de lugar;
- registros;
- notificaciones;
- actuaciones administrativas.

### Datos técnicos y científicos

Incluyen información relacionada con:

- muestras;
- análisis de campo;
- análisis de laboratorio;
- parámetros físicos;
- parámetros químicos;
- parámetros microbiológicos;
- resultados cualitativos;
- resultados cuantitativos.

Estas áreas deben mantenerse conceptualmente separadas aunque posteriormente estén relacionadas mediante foreign keys.

---

## 7. Modelo actualmente acordado

### Operativo

`Operativo` representa el evento general en el que se realizan uno o varios controles.

Relación actual:

```text
Operativo 1:N Control
```

Un operativo puede contener muchos controles.

Cada control pertenece a un único operativo.

La foreign key correspondiente vive en `Control`:

```text
Control.operativo_id -> Operativo.id
```

---

## 8. Ubicación geográfica

La ubicación geográfica debe modelarse mediante relaciones y no mediante enums.

Jerarquía inicial:

```text
Provincia
    |
    | 1:N
    v
Canton
    |
    | 1:N
    v
Parroquia
```

Un cantón pertenece a una provincia.

Una parroquia pertenece a un cantón.

Cuando un control pueda ubicarse mediante una parroquia, se prefiere almacenar:

```text
Control.parroquia_id
```

y obtener cantón y provincia mediante las relaciones correspondientes.

Esto evita almacenar información geográfica redundante o contradictoria.

`Sector` no debe convertirse automáticamente en una tabla catálogo mientras no exista una necesidad real o un catálogo oficial que lo justifique.

---

## 9. Estado actual del desarrollo

El proyecto se encuentra principalmente en la fase de diseño del modelo de datos.

Actualmente se están construyendo y comprendiendo:

- `Operativo`;
- `Control`;
- relaciones uno-a-muchos;
- foreign keys;
- relaciones SQLAlchemy;
- catálogos geográficos;
- enums;
- constraints;
- tipos `Date` y `DateTime`.

No se debe adelantar innecesariamente el desarrollo de endpoints, schemas complejos o lógica científica mientras las entidades centrales todavía estén siendo definidas, salvo que una tarea lo solicite explícitamente.

---

## 10. Principios técnicos actuales

Backend:

- Python;
- FastAPI;
- SQLAlchemy 2.x;
- Pydantic;
- PostgreSQL.

Usar patrones actuales de SQLAlchemy 2.x, incluyendo:

```python
Mapped[...]
mapped_column(...)
```

Las responsabilidades deben mantenerse separadas:

```text
PostgreSQL
→ integridad persistente y constraints

SQLAlchemy
→ modelo relacional y ORM

Pydantic
→ validación de entrada y salida de la API

Lógica de negocio
→ reglas propias del proceso

FastAPI
→ exposición de la API
```

---

## 11. Filosofía de implementación

El proyecto también tiene un objetivo de aprendizaje de ingeniería backend.

La automatización mediante agentes debe utilizarse principalmente para:

- reducir trabajo repetitivo;
- implementar decisiones ya comprendidas;
- inspeccionar código;
- detectar inconsistencias;
- ejecutar verificaciones;
- generar tests;
- facilitar refactors controlados.

El agente no debe sustituir silenciosamente decisiones importantes de arquitectura.

Cuando una decisión tenga impacto relevante en el modelo de datos, debe explicarse brevemente antes de implementarse.

---

## 12. Idioma

El producto está orientado a un contexto de trabajo en español.

La documentación de dominio puede mantenerse en español.

Los nombres técnicos ya definidos en código deben mantener una convención consistente dentro del proyecto.
