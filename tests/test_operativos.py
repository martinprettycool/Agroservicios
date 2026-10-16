from fastapi import status

def test_crear_operativo(test_client):
    operativo = {
        "numero": 9999,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026/10/15"
    }
    response = test_client.post("/operativos", json = operativo)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()

    assert data['numero'] == operativo['numero']
    assert data['tipo_operativo'] == operativo['tipo_operativo']
    assert data['fecha'] == operativo['fecha']