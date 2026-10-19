import os
import pytest

from dotenv import load_dotenv
from fastapi.testclient import TestClient
from fastapi import status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import make_url

from dataset import get_session
from main import app
from models import Canton, Parroquia, Provincia, TipoLugar, TiposOperativos


load_dotenv()

TEST_DB_URL = os.environ["TEST_DB_URL"]

test_url = make_url(TEST_DB_URL)

if test_url.database != 'agroservicios_test':
    raise RuntimeError('Warning : El test no esta apuntado a la database correspondiente') 


test_engine = create_engine(TEST_DB_URL)

TestSessionLocal = sessionmaker(join_transaction_mode='create_savepoint')

@pytest.fixture
def operativo_id(test_client):
    response = test_client.post(
        "/operativos",
        json={
            "numero": 1001,
            "tipo_operativo": TiposOperativos.AGENCIA.value,
            "fecha": "2026-10-19",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()["id"]


@pytest.fixture
def parroquia_id(get_test_session):
    provincia = Provincia(nombre="Latacunga")
    canton = Canton(nombre="Penellaro", provincia=provincia)
    parroquia = Parroquia(nombre="San Andres", canton=canton)
    get_test_session.add(parroquia)
    get_test_session.flush()
    return parroquia.id


@pytest.fixture
def control_payload(parroquia_id):
    return {
        "parroquia_id": parroquia_id,
        "propietario": "Propietario de prueba",
        "tipo_lugar": TipoLugar.CENTRO_ACOPIO.value,
        "litros_controlados": "100.50",
        "litros_inocuos": "80.25",
        "litros_decomisados": "20.25",
    }


@pytest.fixture
def control_id(test_client, operativo_id, control_payload):
    response = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()["id"]


@pytest.fixture
def get_test_session():
    connection = test_engine.connect()
    transaction = connection.begin()

    session = TestSessionLocal(bind=connection) 

    try:
        yield session

    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def test_client(get_test_session):
    def override_get_session():
        yield get_test_session
    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()



