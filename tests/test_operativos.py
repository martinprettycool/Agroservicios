from fastapi import status

def test_crear_operativo(test_client):
    operativo = {
        "numero": 9999,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026-10-15"
    }
    response = test_client.post("/operativos", json = operativo)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()

    assert data['numero'] == operativo['numero']
    assert data['tipo_operativo'] == operativo['tipo_operativo']
    assert data['fecha'] == operativo['fecha']

def test_crear_operativo_duplicado(test_client):
    operativo = {
        "numero" : 9999,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026-10-15"
    }
    response = test_client.post('/operativos', json = operativo)
    assert response.status_code == status.HTTP_201_CREATED

    operativo_duplicado = {
        "numero" : 9999,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026-10-15"
    }
    response_duplicated = test_client.post("/operativos", json = operativo_duplicado)
    assert response_duplicated.status_code == status.HTTP_409_CONFLICT

def test_crear_operativo_numero_invalido(test_client):
    operativo_numero = {
        'numero': "pornovich",
        'tipo_operativo': 'AGENCIA',
        'fecha': '2026-10-15'
    }
    response = test_client.post("/operativos", json = operativo_numero)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

def test_crear_operativo_tipo_invalido(test_client):
    operativo_tipo = {
        'numero': 1,
        "tipo_operativo": 'MANUAL',
        'fecha': '2026-10-19'
    }
    response_type = test_client.post("/operativos", json = operativo_tipo)
    assert response_type.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

def test_crear_operativo_fecha_invalido(test_client):
    operativo_date= {
        'numero': 1,
        "tipo_operativo": 'AGENCIA',
        'fecha': '29'
    }
    response_date = test_client.post("/operativos", json = operativo_date)
    assert response_date.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

def test_empty_value_operativo(test_client):
    operativo_empty = {
        "numero": 1,
        "tipo_operativo": "AGENCIA",
    }
    response = test_client.post("/operativos", json = operativo_empty)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

def test_retrieve_operativo(test_client):
    operativo = {
        "numero" : 9999,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026-10-15"
    }
    response = test_client.post("/operativos", json = operativo)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()

    get_response = test_client.get(f"/operativos/{data['id']}")
    assert get_response.status_code == status.HTTP_200_OK

    retrived = get_response.json()
    assert retrived["numero"] == operativo["numero"]

def test_retrieve_unexistent_operativo(test_client):
    get_response = test_client.get(f"/operativos/333")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND

def test_get_list_operativos(test_client):
    operativo_a = {
        "numero": 9999,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026-10-15"
    }
    response_a = test_client.post("/operativos", json = operativo_a)
    assert response_a.status_code == status.HTTP_201_CREATED
    operativo_b = {
        "numero": 1,
        "tipo_operativo" : "AGENCIA",
        "fecha": "2026-11-15"
    }
    response_b = test_client.post("/operativos", json=operativo_b)
    assert response_b.status_code == status.HTTP_201_CREATED

    get_response = test_client.get("/operativos")
   
    assert get_response.status_code == status.HTTP_200_OK

    data = get_response.json()
    assert isinstance(data, list)

    numeros = {operativo["numero"] for operativo in data }

    assert operativo_a["numero"] in numeros
    assert operativo_b["numero"] in numeros
   

    
    

