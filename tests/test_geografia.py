from fastapi import status

from models import Canton, Parroquia, Provincia
from tests.test_controles import _id_inexistente


def test_listar_provincias(test_client, get_test_session):
    # Arrange
    provincia = Provincia(nombre="Provincia de prueba")
    get_test_session.add(provincia)
    get_test_session.flush()

    # Act
    response = test_client.get("/provincias")

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert {"id": provincia.id, "nombre": provincia.nombre} in data


def test_listar_cantones_de_provincia(test_client, get_test_session):
    # Arrange
    provincia = Provincia(nombre="Provincia de prueba")
    cantones = [
        Canton(nombre="Canton A", provincia=provincia),
        Canton(nombre="Canton B", provincia=provincia),
    ]
    get_test_session.add_all(cantones)
    get_test_session.flush()

    # Act
    response = test_client.get(f"/provincias/{provincia.id}/cantones")

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    for canton in cantones:
        assert {
            "id": canton.id,
            "nombre": canton.nombre,
            "provincia_id": provincia.id,
        } in data
    assert all(canton["provincia_id"] == provincia.id for canton in data)


def test_listar_cantones_provincia_inexistente(test_client, get_test_session):
    # Arrange
    provincia_id = _id_inexistente(get_test_session, Provincia)

    # Act
    response = test_client.get(f"/provincias/{provincia_id}/cantones")

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_listar_parroquias_de_canton(test_client, get_test_session):
    # Arrange
    provincia = Provincia(nombre="Provincia de prueba")
    canton = Canton(nombre="Canton de prueba", provincia=provincia)
    parroquias = [
        Parroquia(nombre="Parroquia A", canton=canton),
        Parroquia(nombre="Parroquia B", canton=canton),
    ]
    get_test_session.add_all(parroquias)
    get_test_session.flush()

    # Act
    response = test_client.get(f"/cantones/{canton.id}/parroquias")

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    for parroquia in parroquias:
        assert {
            "id": parroquia.id,
            "nombre": parroquia.nombre,
            "canton_id": canton.id,
        } in data
    assert all(parroquia["canton_id"] == canton.id for parroquia in data)


def test_listar_parroquias_canton_inexistente(test_client, get_test_session):
    # Arrange
    canton_id = _id_inexistente(get_test_session, Canton)

    # Act
    response = test_client.get(f"/cantones/{canton_id}/parroquias")

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND
