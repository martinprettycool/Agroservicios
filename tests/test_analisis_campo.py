from decimal import Decimal

import pytest
from fastapi import status
from sqlalchemy import func, select

from models import AnalisisCampo, CaracteristicasOrganolepticas, Muestra, ResultadoCualitativo


@pytest.fixture
def muestra_id(test_client, control_id):
    response = test_client.post(
        f"/controles/{control_id}/muestra", json={"codigo": "MUE-ANALISIS-001"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()["id"]


@pytest.fixture
def analisis_payload():
    return {
        "temperatura_c": "4.5",
        "densidad_corregida": "1.03",
        "acidez": "0.15",
        "ph": "6.7",
        "caracteristicas_organolepticas": CaracteristicasOrganolepticas.CUMPLE.value,
        "estabilidad_proteica": ResultadoCualitativo.NEGATIVO.value,
        "antibiotico_beta_tetra_sulfa": ResultadoCualitativo.NEGATIVO.value,
        "antibiotico_aminoglucosidos": ResultadoCualitativo.NEGATIVO.value,
        "aflatoxinas": ResultadoCualitativo.NEGATIVO.value,
        "neutralizantes": ResultadoCualitativo.NEGATIVO.value,
        "peroxido": ResultadoCualitativo.NEGATIVO.value,
        "cloruros": ResultadoCualitativo.NEGATIVO.value,
    }


def test_crear_analisis_campo_valido(test_client, muestra_id, analisis_payload):
    # Arrange
    url = f"/muestras/{muestra_id}/analisis-campo"

    # Act
    response = test_client.post(url, json=analisis_payload)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["muestra_id"] == muestra_id
    for campo in ("temperatura_c", "densidad_corregida", "acidez", "ph"):
        assert Decimal(str(data[campo])) == Decimal(analisis_payload[campo])
    for campo in ("caracteristicas_organolepticas", "estabilidad_proteica"):
        assert data[campo] == analisis_payload[campo]


def test_crear_analisis_campo_muestra_inexistente(
    test_client, get_test_session, analisis_payload
):
    # Arrange
    muestra_id = (get_test_session.scalar(select(func.max(Muestra.id))) or 0) + 1
    cantidad_previa = get_test_session.scalar(select(func.count()).select_from(AnalisisCampo))

    # Act
    response = test_client.post(
        f"/muestras/{muestra_id}/analisis-campo", json=analisis_payload
    )

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert get_test_session.scalar(
        select(func.count()).select_from(AnalisisCampo)
    ) == cantidad_previa


def test_crear_segundo_analisis_campo_misma_muestra(
    test_client, muestra_id, analisis_payload, get_test_session
):
    # Arrange
    url = f"/muestras/{muestra_id}/analisis-campo"
    primera_response = test_client.post(url, json=analisis_payload)
    assert primera_response.status_code == status.HTTP_201_CREATED

    # Act
    response = test_client.post(url, json=analisis_payload)

    # Assert
    assert response.status_code == status.HTTP_409_CONFLICT
    assert get_test_session.scalars(
        select(AnalisisCampo.id).where(AnalisisCampo.muestra_id == muestra_id)
    ).all() == [primera_response.json()["id"]]


@pytest.mark.parametrize("ph", ["-0.1", "14.1"])
def test_crear_analisis_campo_ph_fuera_de_rango(
    test_client, muestra_id, analisis_payload, ph
):
    # Arrange: el rango se protege mediante CHECK en PostgreSQL.
    analisis_payload["ph"] = ph

    # Act
    response = test_client.post(
        f"/muestras/{muestra_id}/analisis-campo", json=analisis_payload
    )

    # Assert
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_crear_analisis_campo_densidad_negativa(
    test_client, muestra_id, analisis_payload
):
    # Arrange
    analisis_payload["densidad_corregida"] = "-0.01"

    # Act
    response = test_client.post(
        f"/muestras/{muestra_id}/analisis-campo", json=analisis_payload
    )

    # Assert
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_crear_analisis_campo_acidez_negativa(test_client, muestra_id, analisis_payload):
    # Arrange
    analisis_payload["acidez"] = "-0.01"

    # Act
    response = test_client.post(
        f"/muestras/{muestra_id}/analisis-campo", json=analisis_payload
    )

    # Assert
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_crear_analisis_campo_enum_invalido(test_client, muestra_id, analisis_payload):
    # Arrange
    analisis_payload["estabilidad_proteica"] = "RESULTADO_INVALIDO"

    # Act
    response = test_client.post(
        f"/muestras/{muestra_id}/analisis-campo", json=analisis_payload
    )

    # Assert
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert any(
        error["loc"] == ["body", "estabilidad_proteica"]
        and error["type"] == "enum"
        for error in response.json()["detail"]
    )
