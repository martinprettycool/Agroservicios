# AgroServicios

## Project

Backend for automating agricultural regulatory workflows currently managed manually.

Current stack:

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy 2.x
- Pydantic

Prefer small, focused changes. Do not perform unrelated refactors.

## SQLAlchemy

Use SQLAlchemy 2.x typed mappings:

- `Mapped[...]`
- `mapped_column(...)`
- explicit `ForeignKey`
- explicit `relationship(..., back_populates=...)` when useful

Model class names should be singular.

Examples:

- `Operativo`
- `Control`
- `Provincia`
- `Canton`
- `Parroquia`

Before introducing a new table or relationship, briefly explain its purpose and cardinality.

## Current domain model

An `Operativo` can contain many `Control` records.

```text
Operativo 1:N Control
```

Therefore:

```text
Control.operativo_id -> Operativo.id
```

Geographic hierarchy:

```text
Provincia
   ↓ 1:N
Canton
   ↓ 1:N
Parroquia
```

When appropriate, `Control` should reference only `parroquia_id`; canton and province can be derived through relationships.

Do not create a `Sector` table unless a real catalog or business requirement justifies it.

## Database design

Do not reproduce the Excel structure directly as database tables.

Before adding a field, determine whether it is:

- an entity,
- an attribute,
- a relationship,
- an enum/catalog,
- or a derived value.

Use enums for small, stable sets of values.

Use catalog tables when values have relationships or additional attributes.

Keep database responsibilities separate:

- PostgreSQL constraints protect data integrity.
- SQLAlchemy maps the relational model.
- Pydantic validates API requests.
- Business rules belong in the appropriate application layer.

Do not introduce Pydantic validators or decorators unless the task specifically concerns validation.

## Dates

Use `Date` for business dates such as `Operativo.fecha`.

Use timezone-aware `DateTime` for audit fields such as:

- `created_at`
- `updated_at`

## Verification

After changing models, verify:

- foreign-key targets,
- `back_populates`,
- imports,
- application startup,
- and relevant tests when available.

Do not declare a change complete if the modification introduced an unresolved error.

## Safety

Do not:

- delete tables or columns without explicit instruction,
- rewrite migrations unnecessarily,
- expose secrets or `.env` contents,
- add unrelated dependencies.

Keep changes scoped to the requested task.

## Project documentation

For changes that affect the domain model, database entities, or relationships:

- Read `docs/product_context.md`.
- Read `docs/architecture.md` if it exists.
- Inspect the current SQLAlchemy models before making changes.
- Briefly explain the affected entities and relationship cardinality before implementation.
- Keep the change limited to the requested scope.
