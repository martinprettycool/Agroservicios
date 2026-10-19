import pytest
from fastapi import status
from sqlalchemy import func, select

from models import Control, EstadoNotificacion, Notificacion, TipoNotificacion


@pytest.fixture
def notificacion_payload():
    return {
        "tipo": TipoNotificacion.INDUSTRIA_LACTEA.value,
        "estado": EstadoNotificacion.PENDIENTE.value,
    }


def test_crear_notificacion_valida(test_client, control_id, notificacion_payload):
    # Arrange
    url = f"/controles/{control_id}/notificaciones"

    # Act
    response = test_client.post(url, json=notificacion_payload)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["control_id"] == control_id
    assert data["tipo"] == notificacion_payload["tipo"]
    assert data["estado"] == notificacion_payload["estado"]


def test_crear_notificacion_control_inexistente(
    test_client, get_test_session, notificacion_payload
):
    # Arrange
    control_id = (get_test_session.scalar(select(func.max(Control.id))) or 0) + 1
    cantidad_previa = get_test_session.scalar(
        select(func.count()).select_from(Notificacion)
    )

    # Act
    response = test_client.post(
        f"/controles/{control_id}/notificaciones", json=notificacion_payload
    )

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert get_test_session.scalar(
        select(func.count()).select_from(Notificacion)
    ) == cantidad_previa


@pytest.mark.parametrize("campo", ["tipo", "estado"])
def test_crear_notificacion_enum_invalido(
    test_client, control_id, notificacion_payload, campo
):
    # Arrange
    notificacion_payload[campo] = "VALOR_INVALIDO"

    # Act
    response = test_client.post(
        f"/controles/{control_id}/notificaciones", json=notificacion_payload
    )

    # Assert
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert any(
        error["loc"] == ["body", campo] and error["type"] == "enum"
        for error in response.json()["detail"]
    )


def test_crear_notificaciones_distintos_tipos_mismo_control(
    test_client, control_id, notificacion_payload, get_test_session
):
    # Arrange
    url = f"/controles/{control_id}/notificaciones"
    payload_arcsa = {**notificacion_payload, "tipo": TipoNotificacion.ARCSA.value}

    # Act
    industria_response = test_client.post(url, json=notificacion_payload)
    arcsa_response = test_client.post(url, json=payload_arcsa)

    # Assert
    assert industria_response.status_code == status.HTTP_201_CREATED
    assert arcsa_response.status_code == status.HTTP_201_CREATED
    industria = industria_response.json()
    arcsa = arcsa_response.json()
    assert industria["control_id"] == arcsa["control_id"] == control_id
    assert industria["tipo"] == TipoNotificacion.INDUSTRIA_LACTEA.value
    assert arcsa["tipo"] == TipoNotificacion.ARCSA.value
    assert industria["id"] != arcsa["id"]
    assert set(get_test_session.scalars(
        select(Notificacion.id).where(Notificacion.control_id == control_id)
    ).all()) == {industria["id"], arcsa["id"]}


def test_crear_notificacion_mismo_tipo_mismo_control(
    test_client, control_id, notificacion_payload, get_test_session
):
    # Arrange
    url = f"/controles/{control_id}/notificaciones"
    primera_response = test_client.post(url, json=notificacion_payload)
    assert primera_response.status_code == status.HTTP_201_CREATED

    # Act
    response = test_client.post(url, json=notificacion_payload)

    # Assert
    assert get_test_session.scalars(
        select(Notificacion.id).where(
            Notificacion.control_id == control_id,
            Notificacion.tipo == TipoNotificacion.INDUSTRIA_LACTEA,
        )
    ).all() == [primera_response.json()["id"]]
    assert response.status_code == status.HTTP_409_CONFLICT


def test_crear_notificacion_con_campos_opcionales(
    test_client, control_id, notificacion_payload
):
    # Arrange
    payload = {
        **notificacion_payload,
        "estado": EstadoNotificacion.EMITIDA.value,
        "numero_documento": "NOT-001",
        "fecha": "2026-10-19",
        "observaciones": "Notificacion remitida a la industria lactea",
    }

    # Act
    response = test_client.post(
        f"/controles/{control_id}/notificaciones", json=payload
    )

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["control_id"] == control_id
    for campo, valor in payload.items():
        assert data[campo] == valor
