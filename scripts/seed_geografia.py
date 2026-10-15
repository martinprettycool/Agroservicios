"""Carga manual de Tungurahua: 1 provincia, 9 cantones y 63 parroquias.

Ejecutar desde la raíz: uv run python scripts/seed_geografia.py
No crea tablas; el esquema debe estar migrado con Alembic.

Fuentes oficiales consultadas el 2026-10-14:
- INEC, Clasificador Geográfico Estadístico 2026 (corte 2025-12-31), p. 41:
  https://aplicaciones2.ecuadorencifras.gob.ec/SIN/descargas/cge2026.pdf
- INEC, clasificador 2024, p. 42 (contraste de los cantones restantes):
  https://aplicaciones2.ecuadorencifras.gob.ec/SIN/descargas/cge2024.pdf
- Catálogos vigentes del Gobierno Provincial y CONAGOPARE Tungurahua:
  https://www.tungurahua.gob.ec/cantones/
  https://www.conagoparetungurahua.gob.ec/parroquias/

Se incluyen parroquias urbanas y rurales. Las cabeceras con subdivisiones
urbanas (Ambato, Pelileo, Píllaro) no se agregan como otra parroquia.
Se omiten las notas de ubicación de cabeceras '(CAB. EN ...)'. Las variantes
locales verificadas se reconocen al buscar, sin renombrar datos existentes.
"""

import sys
import unicodedata
from pathlib import Path

# La ejecución por ruta pone scripts/, no la raíz, en sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, SQLAlchemyError
from sqlalchemy.orm import Session


GEOGRAFIA = {
    "Ambato": (
        "Atocha – Ficoa", "Celiano Monge", "Huachi Chico", "Huachi Loreto",
        "La Merced", "La Península", "Matriz", "Pishilata", "San Francisco",
        "Ambatillo", "Atahualpa", "Augusto N. Martínez", "Constantino Fernández",
        "Huachi Grande", "Izamba", "Juan Benigno Vela", "Montalvo", "Pasa",
        "Picaihua", "Pilagüín", "Quisapincha", "San Bartolomé de Pinllo",
        "San Fernando", "Santa Rosa", "Totoras", "Cunchibamba", "Unamuncho",
    ),
    "Baños de Agua Santa": ("Baños", "Lligua", "Río Negro", "Río Verde", "Ulba"),
    "Cevallos": ("Cevallos",),
    "Mocha": ("Mocha", "Pinguilí"),
    "Patate": ("Patate", "El Triunfo", "Los Andes", "Sucre"),
    "Quero": ("Quero", "Rumipamba", "Yanayacu-Mochapata"),
    "San Pedro de Pelileo": (
        "Pelileo", "Pelileo Grande", "Benítez", "Bolívar", "Cotaló", "Chiquicha",
        "El Rosario", "García Moreno", "Guambaló", "Salasaca",
    ),
    "Santiago de Píllaro": (
        "Ciudad Nueva", "Píllaro", "Baquerizo Moreno", "Emilio María Terán",
        "Marcos Espinel", "Presidente Urbina", "San Andrés", "San José de Poaló",
        "San Miguelito",
    ),
    "Tisaleo": ("Tisaleo", "Quinchicoto"),
}

ALIAS_CANTONES = {
    "San Pedro de Pelileo": ("Pelileo",),
    "Santiago de Píllaro": ("Píllaro",),
    "Baños de Agua Santa": ("Baños",),
}
ALIAS_PARROQUIAS = {
    ("Ambato", "Matriz"): ("La Matriz",),
    ("Ambato", "Augusto N. Martínez"): ("Augusto Martínez",),
    ("Ambato", "Juan Benigno Vela"): ("Juan B. Vela",),
    ("Ambato", "Montalvo"): ("Juan Montalvo",),
    ("Ambato", "Pilagüín"): ("Pilahuín", "Pilahuin"),
    ("Ambato", "San Bartolomé de Pinllo"): ("San Bartolomé Pinllo",),
    ("Quero", "Yanayacu-Mochapata"): ("Yanayacu",),
    ("San Pedro de Pelileo", "Guambaló"): ("Huambaló",),
    ("San Pedro de Pelileo", "Salasaca"): ("Salasaka",),
    ("Santiago de Píllaro", "Presidente Urbina"): ("Urbina",),
}


def normalizar(nombre: str) -> str:
    """Compara sin diferencias de caja, tildes, espacios o tipo de guion."""
    nombre = nombre.replace("–", "-").replace("—", "-")
    nombre = "".join(
        letra for letra in unicodedata.normalize("NFD", nombre.casefold())
        if not unicodedata.combining(letra)
    )
    return " ".join(nombre.split())


def buscar_existente(registros, nombre: str, alias: tuple[str, ...] = ()):
    claves = {normalizar(valor) for valor in (nombre, *alias)}
    encontrados = [r for r in registros if normalizar(r.nombre) in claves]
    if len(encontrados) > 1:
        raise ValueError(
            f"Hay varios registros equivalentes a '{nombre}' dentro del mismo "
            "padre. Revisa los duplicados existentes antes de repetir la carga."
        )
    return encontrados[0] if encontrados else None


def cargar_geografia(session: Session) -> dict[str, list[int]]:
    """Añade únicamente faltantes. La transacción pertenece al llamador.

    Cada contador contiene [creados, existentes]. Los nombres se buscan dentro
    de su padre: no se confunden parroquias homónimas de diferentes cantones.
    """
    from models import Canton, Parroquia, Provincia

    resumen = {nivel: [0, 0] for nivel in ("Provincias", "Cantones", "Parroquias")}
    provincia = buscar_existente(session.scalars(select(Provincia)), "Tungurahua")
    if provincia is None:
        provincia = Provincia(nombre="Tungurahua")
        session.add(provincia)
        session.flush()  # Obtiene el id sin confirmar la transacción.
        resumen["Provincias"][0] += 1
    else:
        resumen["Provincias"][1] += 1

    cantones = list(session.scalars(
        select(Canton).where(Canton.provincia_id == provincia.id)
    ))
    for nombre_canton, nombres_parroquias in GEOGRAFIA.items():
        canton = buscar_existente(
            cantones, nombre_canton, ALIAS_CANTONES.get(nombre_canton, ())
        )
        if canton is None:
            canton = Canton(nombre=nombre_canton, provincia=provincia)
            session.add(canton)
            session.flush()
            cantones.append(canton)
            resumen["Cantones"][0] += 1
        else:
            resumen["Cantones"][1] += 1

        parroquias = list(session.scalars(
            select(Parroquia).where(Parroquia.canton_id == canton.id)
        ))
        for nombre in nombres_parroquias:
            parroquia = buscar_existente(
                parroquias, nombre,
                ALIAS_PARROQUIAS.get((nombre_canton, nombre), ()),
            )
            if parroquia is None:
                parroquia = Parroquia(nombre=nombre, canton=canton)
                session.add(parroquia)
                parroquias.append(parroquia)
                resumen["Parroquias"][0] += 1
            else:
                resumen["Parroquias"][1] += 1
    return resumen


def main() -> int:
    try:
        from dataset import engine

        if engine.dialect.name != "postgresql":
            raise ValueError("Esta carga requiere la conexión PostgreSQL del proyecto.")

        # SERIALIZABLE evita que dos cargas concurrentes basadas en las mismas
        # búsquedas puedan confirmar duplicados. Un conflicto aborta una carga;
        # se debe repetir completa. No sustituye constraints para otros clientes.
        conexion_seed = engine.execution_options(isolation_level="SERIALIZABLE")
        with Session(conexion_seed) as session:
            with session.begin():
                resumen = cargar_geografia(session)
        # Se informa éxito solamente después del commit, que también puede fallar.
        print("Carga geográfica completada: Tungurahua.")
        for nivel, (creados, existentes) in resumen.items():
            print(f"{nivel}: {creados} creados; {existentes} ya existían.")
        return 0
    except ValueError as error:
        print(f"Carga cancelada: {error} No se guardaron cambios.", file=sys.stderr)
    except KeyError:
        print("Carga cancelada: falta DB_URL en la configuración. "
              "No se guardaron cambios.", file=sys.stderr)
    except DBAPIError as error:
        codigo = getattr(error.orig, "sqlstate", None)
        if codigo in {"40001", "40P01"}:
            mensaje = "Conflicto entre transacciones; vuelve a ejecutar la carga."
        else:
            mensaje = "Revisa la conexión, permisos y migraciones de Alembic."
        # No imprimir excepciones de conexión: pueden contener credenciales.
        print(f"Carga cancelada: {mensaje} No se guardaron cambios.", file=sys.stderr)
    except (SQLAlchemyError, ImportError):
        print("Carga cancelada: revisa las dependencias y los modelos del proyecto. "
              "No se guardaron cambios.", file=sys.stderr)
    except Exception:
        print("Carga cancelada por un error inesperado. "
              "No se guardaron cambios.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
