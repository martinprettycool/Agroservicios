from datetime import datetime, timezone

from sqlalchemy import func, select

from main import get_operativo_detalle
from models import Control, Operativo


def test_detalle_operativo_sin_controles(test_client, operativo_id):
    response = test_client.get(f"/operativos/{operativo_id}/detalle")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == operativo_id
    assert data["numero"] == 1001
    assert data["controles"] == []


def test_detalle_control_sin_muestra(test_client, operativo_id, control_id):
    response = test_client.get(f"/operativos/{operativo_id}/detalle")

    assert response.status_code == 200
    [control] = response.json()["controles"]
    assert control["id"] == control_id
    assert control["operativo_id"] == operativo_id
    assert control["muestra"] is None
    assert control["decomiso"] is None
    assert control["notificaciones"] == []
    assert control["parroquia"]["nombre"] == "San Andres"
    assert control["parroquia"]["canton"]["nombre"] == "Penellaro"
    assert control["parroquia"]["canton"]["provincia"]["nombre"] == "Latacunga"


def test_detalle_muestra_sin_analisis(test_client, operativo_id, control_id):
    muestra = test_client.post(
        f"/controles/{control_id}/muestra", json={"codigo": "DETALLE-001"}
    )
    assert muestra.status_code == 201

    response = test_client.get(f"/operativos/{operativo_id}/detalle")

    assert response.status_code == 200
    saved = response.json()["controles"][0]["muestra"]
    assert saved["id"] == muestra.json()["id"]
    assert saved["control_id"] == control_id
    assert saved["codigo"] == "DETALLE-001"
    assert saved["analisis_campo"] is None


def test_detalle_operativo_completo(test_client, operativo_id, control_id):
    muestra = test_client.post(
        f"/controles/{control_id}/muestra", json={"codigo": "DETALLE-002"}
    )
    assert muestra.status_code == 201
    muestra_id = muestra.json()["id"]
    analisis = test_client.post(
        f"/muestras/{muestra_id}/analisis-campo",
        json={"ph": "6.7", "estabilidad_proteica": "NEGATIVO"},
    )
    assert analisis.status_code == 201

    response = test_client.get(f"/operativos/{operativo_id}/detalle")

    assert response.status_code == 200
    [control] = response.json()["controles"]
    assert control["id"] == control_id
    assert control["muestra"]["id"] == muestra_id
    nested = control["muestra"]["analisis_campo"]
    assert nested["id"] == analisis.json()["id"]
    assert nested["muestra_id"] == muestra_id
    assert nested["ph"] == "6.7"
    assert nested["estabilidad_proteica"] == "NEGATIVO"
    assert nested["aflatoxinas"] is None
    assert control["decomiso"] is None
    assert control["notificaciones"] == []


def test_detalle_operativo_inexistente(test_client, get_test_session):
    missing_id = (get_test_session.scalar(select(func.max(Operativo.id))) or 0) + 1

    response = test_client.get(f"/operativos/{missing_id}/detalle")

    assert response.status_code == 404
    assert response.json()["detail"] == "Este operativo no existe"


def test_detalle_conserva_controles_y_ordena_por_creacion(
    test_client, get_test_session, operativo_id, control_id, control_payload
):
    second = test_client.post(
        f"/operativos/{operativo_id}/controles", json=control_payload
    )
    assert second.status_code == 201
    second_id = second.json()["id"]
    # El orden se basa en created_at, no solo en la secuencia de IDs.
    get_test_session.get(Control, control_id).created_at = datetime(2026, 1, 2, tzinfo=timezone.utc)
    get_test_session.get(Control, second_id).created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    get_test_session.flush()

    data = test_client.get(f"/operativos/{operativo_id}/detalle").json()
    assert [control["id"] for control in data["controles"]] == [second_id, control_id]

    get_test_session.get(Control, control_id).created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    get_test_session.flush()
    data = test_client.get(f"/operativos/{operativo_id}/detalle").json()
    assert [control["id"] for control in data["controles"]] == [control_id, second_id]


def test_detalle_incluye_acciones_existentes(test_client, operativo_id, control_id):
    decomiso = test_client.post(
        f"/controles/{control_id}/decomiso", json={"motivo": "Prueba de serialización"}
    )
    notificacion = test_client.post(
        f"/controles/{control_id}/notificaciones",
        json={"tipo": "ARCSA", "estado": "PENDIENTE"},
    )
    assert decomiso.status_code == 201
    assert notificacion.status_code == 201

    response = test_client.get(f"/operativos/{operativo_id}/detalle")

    assert response.status_code == 200
    [control] = response.json()["controles"]
    assert control["decomiso"]["id"] == decomiso.json()["id"]
    assert control["notificaciones"][0]["id"] == notificacion.json()["id"]
    assert control["notificaciones"][0]["tipo"] == "ARCSA"


def test_detalle_serializado_no_depende_de_session(get_test_session, control_id, operativo_id):
    # Una identidad ORM nueva evita que las fixtures oculten cargas diferidas.
    get_test_session.expunge_all()
    detalle = get_operativo_detalle(operativo_id, get_test_session)
    get_test_session.expunge_all()

    data = detalle.model_dump(mode="json")
    assert data["controles"][0]["id"] == control_id
    assert data["controles"][0]["parroquia"]["canton"]["provincia"]["nombre"] == "Latacunga"
