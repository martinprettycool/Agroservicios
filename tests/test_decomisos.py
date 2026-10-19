import pytest
from fastapi import status
from sqlalchemy import func, select

from models import Control, Decomiso


def test_crear_decomiso_valido_con_destino_default(test_client, control_id):
    # Arrange
    payload = {"motivo": "Leche no apta"}
    destino_default = Decomiso.__table__.c.destino.default.arg

    # Act
    response = test_client.post(f"/controles/{control_id}/decomiso", json=payload)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["control_id"] == control_id
    assert data["motivo"] == payload["motivo"]
    assert data["destino"] == destino_default
    assert data["numero_acta_decomiso"] is None
    assert data["numero_acta_destruccion"] is None


def test_crear_decomiso_control_inexistente(test_client, get_test_session):
    # Arrange
    control_id = (get_test_session.scalar(select(func.max(Control.id))) or 0) + 1
    cantidad_previa = get_test_session.scalar(select(func.count()).select_from(Decomiso))
    payload = {"motivo": "Leche no apta"}

    # Act
    response = test_client.post(f"/controles/{control_id}/decomiso", json=payload)

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert get_test_session.scalar(
        select(func.count()).select_from(Decomiso)
    ) == cantidad_previa


def test_crear_segundo_decomiso_mismo_control(test_client, control_id, get_test_session):
    # Arrange
    url = f"/controles/{control_id}/decomiso"
    payload = {"motivo": "Leche no apta"}
    primera_response = test_client.post(url, json=payload)
    assert primera_response.status_code == status.HTTP_201_CREATED

    # Act
    response = test_client.post(url, json=payload)

    # Assert
    assert response.status_code == status.HTTP_409_CONFLICT
    assert get_test_session.scalars(
        select(Decomiso.id).where(Decomiso.control_id == control_id)
    ).all() == [primera_response.json()["id"]]


@pytest.mark.parametrize("campo", ["numero_acta_decomiso", "numero_acta_destruccion"])
def test_crear_decomiso_acta_valida(test_client, control_id, campo):
    # Arrange
    payload = {"motivo": "Leche no apta", campo: "1234"}

    # Act
    response = test_client.post(f"/controles/{control_id}/decomiso", json=payload)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["control_id"] == control_id
    assert data["motivo"] == payload["motivo"]
    assert data[campo] == payload[campo]


@pytest.mark.parametrize("campo", ["numero_acta_decomiso", "numero_acta_destruccion"])
@pytest.mark.parametrize("acta", ["123", "12A4"])
def test_crear_decomiso_acta_invalida(test_client, control_id, campo, acta):
    # Arrange: el formato se protege mediante CHECK en PostgreSQL.
    payload = {"motivo": "Leche no apta", campo: acta}

    # Act
    response = test_client.post(f"/controles/{control_id}/decomiso", json=payload)

    # Assert
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_crear_decomiso_sin_motivo(test_client, control_id):
    # Arrange
    payload = {}

    # Act
    response = test_client.post(f"/controles/{control_id}/decomiso", json=payload)

    # Assert
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert any(
        error["loc"] == ["body", "motivo"] and error["type"] == "missing"
        for error in response.json()["detail"]
    )
