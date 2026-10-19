from decimal import Decimal

import pytest
from fastapi import status
from sqlalchemy import func, select

from models import  Control, Operativo, Parroquia,  TipoLugar 


def _id_inexistente(session, modelo):
    return (session.scalar(select(func.max(modelo.id))) or 0) + 1


def test_crear_control_valido(test_client, operativo_id, control_payload):
    # Arrange
    url = f"/operativos/{operativo_id}/controles"

    # Act
    response = test_client.post(url, json=control_payload)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["operativo_id"] == operativo_id
    assert data["parroquia_id"] == control_payload["parroquia_id"]
    assert data["propietario"] == control_payload["propietario"]
    assert data["tipo_lugar"] == control_payload["tipo_lugar"]
    for campo in ("litros_controlados", "litros_inocuos", "litros_decomisados"):
        assert Decimal(data[campo]) == Decimal(control_payload[campo])


def test_crear_control_operativo_inexistente(
    test_client, get_test_session, control_payload
):
    # Arrange
    operativo_id = _id_inexistente(get_test_session, Operativo)

    # Act
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_crear_control_parroquia_inexistente(
    test_client, get_test_session, operativo_id, control_payload
):
    # Arrange
    control_payload["parroquia_id"] = _id_inexistente(get_test_session, Parroquia)

    # Act
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_crear_control_litros_desbalanceados(
    test_client, get_test_session, operativo_id, control_payload
):
    # Arrange
    control_payload["litros_controlados"] = "101.50"

    # Act
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )

    # Assert
    assert get_test_session.scalar(
        select(Control.id).where(Control.operativo_id == operativo_id)
    ) is None
    # La regla debe rechazarse en Pydantic, antes de intentar persistir.
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_crear_control_litros_negativos(test_client, operativo_id, control_payload):
    # Arrange: mantener el balance para aislar la validacion de negativos.
    control_payload.update(litros_inocuos="-1", litros_decomisados="101.50")

    # Act
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )

    # Assert
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert isinstance(response.json()["detail"], list)


@pytest.mark.parametrize(
    "tipo_lugar", [TipoLugar.CENTRO_ACOPIO, TipoLugar.MEDIO_TRANSPORTE]
)
def test_crear_control_numero_registro_permitido(
    test_client, operativo_id, control_payload, tipo_lugar
):
    # Arrange
    control_payload.update(tipo_lugar=tipo_lugar.value, numero_registro="REG-001")

    # Act
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["operativo_id"] == operativo_id
    assert data["tipo_lugar"] == tipo_lugar.value
    assert data["numero_registro"] == control_payload["numero_registro"]


@pytest.mark.parametrize(
    "tipo_lugar", [TipoLugar.SILO_INDUSTRIA_LACTEA, TipoLugar.UPA_FINCA]
)
def test_crear_control_numero_registro_no_permitido(
    test_client, operativo_id, control_payload, tipo_lugar
):
    # Arrange
    control_payload.update(tipo_lugar=tipo_lugar.value, numero_registro="REG-001")

    # Act
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )

    # Assert
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_obtener_control_existente(test_client, operativo_id, control_payload):
    # Arrange
    post_response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )
    assert post_response.status_code == status.HTTP_201_CREATED
    creado = post_response.json()

    # Act
    response = test_client.get(f"/controles/{creado['id']}")

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == creado["id"]
    assert data["operativo_id"] == operativo_id
    assert data["parroquia_id"] == control_payload["parroquia_id"]
    assert data["propietario"] == control_payload["propietario"]


def test_obtener_control_inexistente(test_client, get_test_session):
    # Arrange
    control_id = _id_inexistente(get_test_session, Control)

    # Act
    response = test_client.get(f"/controles/{control_id}")

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_listar_controles_operativo(test_client, operativo_id, control_payload):
    # Arrange
    ids_creados = set()
    for propietario in ("Propietario A", "Propietario B"):
        post_response = test_client.post(
            f"/operativos/{operativo_id}/controles",
            json={**control_payload, "propietario": propietario},
        )
        assert post_response.status_code == status.HTTP_201_CREATED
        ids_creados.add(post_response.json()["id"])

    # Act
    response = test_client.get(f"/operativos/{operativo_id}/controles")

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert ids_creados <= {control["id"] for control in data}
    assert all(control["operativo_id"] == operativo_id for control in data)
