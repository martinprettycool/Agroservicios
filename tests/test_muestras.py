from fastapi import status

from models import Control
from tests.test_controles import _id_inexistente


def test_crear_muestra_valida(test_client, control_id):
    # Arrange
    payload = {"codigo": "MUE-001"}
    url = f"/controles/{control_id}/muestra"

    # Act
    response = test_client.post(url, json=payload)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["control_id"] == control_id
    assert data["codigo"] == payload["codigo"]


def test_crear_muestra_control_inexistente(test_client, get_test_session):
    # Arrange
    control_id = _id_inexistente(get_test_session, Control)
    payload = {"codigo": "MUE-001"}

    # Act
    response = test_client.post(f"/controles/{control_id}/muestra", json=payload)

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_crear_segunda_muestra_mismo_control(test_client, control_id):
    # Arrange
    url = f"/controles/{control_id}/muestra"
    primera_response = test_client.post(url, json={"codigo": "MUE-001"})
    assert primera_response.status_code == status.HTTP_201_CREATED

    # Act
    response = test_client.post(url, json={"codigo": "MUE-002"})

    # Assert
    assert response.status_code == status.HTTP_409_CONFLICT


def test_crear_muestra_sin_codigo(test_client, control_id):
    # Arrange
    url = f"/controles/{control_id}/muestra"
    payload = {}

    # Act
    response = test_client.post(url, json=payload)

    # Assert
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
