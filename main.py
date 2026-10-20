from decimal import Decimal

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, model_validator

from models import TiposOperativos, Operativo, Control, TipoLugar, Parroquia, Muestra, CaracteristicasOrganolepticas, ResultadoCualitativo, AnalisisCampo, Decomiso, TipoNotificacion, EstadoNotificacion, Notificacion, Provincia, Canton, Parroquia
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError


from dataset import get_session
from datetime import date, datetime

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParroquiaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre : str
    canton_id : int

class CantonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre : str
    provincia_id : int

class ProvinciaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str

class CreateNotificacion(BaseModel):
    tipo : TipoNotificacion
    estado : EstadoNotificacion
    numero_documento : str | None = None
    fecha : date | None = None 
    observaciones : str | None = None



class NotiResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    control_id : int
    tipo : TipoNotificacion
    estado : EstadoNotificacion
    numero_documento : str | None = None
    fecha : date | None = None 
    observaciones : str | None = None
    created_at : datetime
    updated_at : datetime



class DecomisoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    control_id: int
    motivo : str
    destino : str
    numero_acta_decomiso : str | None = None
    numero_acta_destruccion : str | None = None
    created_at : datetime
    updated_at : datetime

class CreateDecomiso(BaseModel):
    motivo : str
    numero_acta_decomiso : str | None = None
    numero_acta_destruccion : str | None = None

class CreateAnalisis(BaseModel):
    temperatura_c : Decimal | None = None
    densidad_corregida : Decimal | None = None
    acidez : Decimal | None = None  
    ph : Decimal | None = None
    caracteristicas_organolepticas : CaracteristicasOrganolepticas | None = None
    estabilidad_proteica : ResultadoCualitativo | None = None
    antibiotico_beta_tetra_sulfa : ResultadoCualitativo | None = None
    antibiotico_aminoglucosidos : ResultadoCualitativo | None = None
    aflatoxinas : ResultadoCualitativo | None = None
    neutralizantes : ResultadoCualitativo | None = None
    peroxido : ResultadoCualitativo | None = None
    cloruros : ResultadoCualitativo | None = None
    observaciones : str | None = None

class AnalisisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id : int
    muestra_id : int
    temperatura_c : Decimal | None = None
    densidad_corregida : Decimal | None = None
    acidez : Decimal | None = None  
    ph : Decimal | None = None
    caracteristicas_organolepticas : CaracteristicasOrganolepticas | None = None
    estabilidad_proteica : ResultadoCualitativo | None = None
    antibiotico_beta_tetra_sulfa : ResultadoCualitativo | None = None
    antibiotico_aminoglucosidos : ResultadoCualitativo | None = None
    aflatoxinas : ResultadoCualitativo | None = None
    neutralizantes : ResultadoCualitativo | None = None
    peroxido : ResultadoCualitativo | None = None
    cloruros : ResultadoCualitativo | None = None
    observaciones : str | None = None
    created_at : datetime
    updated_at : datetime

class CreateMuestra(BaseModel):
    codigo : str
    
class MuestraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    control_id: int
    codigo: str
    created_at: datetime
    updated_at: datetime

class CreateOp(BaseModel):
    numero: int
    tipo_operativo : TiposOperativos
    fecha : date

class OpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id : int
    numero: int
    tipo_operativo : TiposOperativos
    fecha : date
    created_at : datetime
    updated_at : datetime

class CreateControl(BaseModel):
    parroquia_id : int
    litros_controlados : Decimal
    litros_inocuos : Decimal 
    litros_decomisados : Decimal
    observaciones : str | None = None
    sector : str | None = None
    propietario : str
    tipo_lugar : TipoLugar
    numero_registro : str | None = None
    nombre_lugar_muestreado : str | None = None
    @model_validator(mode="after")
    def validar_litros(self):
        if (
            self.litros_controlados < 0 or
            self.litros_inocuos < 0 or
            self.litros_decomisados < 0 
        ):
            raise ValueError('Los litros no pueden ser negativos')
        if self.litros_controlados != (
            self.litros_inocuos + self.litros_decomisados
        ):
            ValueError('Litros controlados debe ser igual a litros inocuos + litros decomisados')
        return self 


class ResponseControl(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    operativo_id : int
    parroquia_id : int
    litros_controlados : Decimal
    litros_inocuos : Decimal 
    litros_decomisados : Decimal
    observaciones : str | None = None
    sector : str | None = None
    propietario : str
    tipo_lugar : TipoLugar
    numero_registro : str | None = None
    nombre_lugar_muestreado : str | None = None
    created_at : datetime
    updated_at : datetime



@app.post("/operativos", response_model=OpResponse, status_code=status.HTTP_201_CREATED)
def crear_operativo(op : CreateOp, session : Session = Depends(get_session)):
    new_op = Operativo(
        numero = op.numero,
        tipo_operativo = op.tipo_operativo,
        fecha = op.fecha
    )
    session.add(new_op)
    try:
        session.commit()
        session.refresh(new_op)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            409, detail=f'El operativo {op.numero} ya existe'
        )
    return new_op
    
@app.get("/operativos", response_model=list[OpResponse])
def get_operativos(session: Session = Depends(get_session)):
    stmt = select(Operativo)
    operativos = session.scalars(stmt).all()
    return operativos
    
@app.get("/operativos/{operativo_id}", response_model=OpResponse)
def get_operativo(operativo_id : int, session : Session = Depends(get_session)):
    stmt = select(Operativo).where(Operativo.id == operativo_id)
    operativo = session.scalar(stmt)
    if operativo is None:
        raise HTTPException(404, detail="Este operativo no existe")
    return operativo

@app.post("/operativos/{op_id}/controles", response_model=ResponseControl, status_code=status.HTTP_201_CREATED)
def crear_control(op_id: int, control : CreateControl, session: Session = Depends(get_session)):
    operativo = session.get(Operativo, op_id)
    if operativo is None:
        raise HTTPException(404, detail=f'El operativo {op_id} no existe')

    parroquia = session.get(Parroquia, control.parroquia_id)
    if parroquia is None:
        raise HTTPException(404, detail='La parroquia no existe')        
    new_control = Control(
        operativo_id = op_id,
        parroquia_id = control.parroquia_id,
        litros_controlados = control.litros_controlados,
        litros_inocuos = control.litros_inocuos,
        litros_decomisados = control.litros_decomisados,
        observaciones = control.observaciones,
        sector = control.sector,
        propietario = control.propietario,
        tipo_lugar = control.tipo_lugar,
        numero_registro = control.numero_registro,
        nombre_lugar_muestreado = control.nombre_lugar_muestreado
    )
    session.add(new_control)
    try:
        session.commit()
        session.refresh(new_control)
    except IntegrityError:
        session.rollback()
        raise HTTPException(400, detail='Los datos introducidos violan la integridad de la base de datos')
    return new_control
    
@app.get("/operativos/{operativo_id}/controles", response_model=list[ResponseControl])
def get_control(operativo_id: int, session : Session = Depends(get_session)):
    operativo = session.get(Operativo, operativo_id)
    if operativo is None:
        raise HTTPException(404, detail=f'El operativo {operativo_id} no existe')
    stmt = select(Control).where(operativo_id == Control.operativo_id)
    controles = session.scalars(stmt).all()
    return controles 
    
@app.get("/controles/{control_id}", response_model=ResponseControl)
def get_control(control_id: int, session: Session = Depends(get_session)):
    stmt = select(Control).where(Control.id ==control_id)
    control = session.scalar(stmt)
    if control is None:
        raise HTTPException(404, f'El control {control_id} no existe')
    return control

@app.post("/controles/{control_id}/muestra", response_model=MuestraResponse, status_code=status.HTTP_201_CREATED)
def create_muestra(control_id: int, muestra: CreateMuestra, session: Session = Depends(get_session)):
    control = session.get(Control, control_id)
    if control is None:
        raise HTTPException(404, f'El control {control_id} no exsite')
    if control.muestra is not None:
        raise HTTPException(409, detail=f'El control {control_id} ya tiene una muestra')        
    new_muestra = Muestra(            
        control_id = control_id,
        codigo = muestra.codigo
    )
    session.add(new_muestra)
    try:            
        session.commit()
        session.refresh(new_muestra)
    except IntegrityError:
        session.rollback()
        raise HTTPException(400, detail='No fue posible crear la muestra por una restricción de integridad')
    return new_muestra
    
@app.post("/muestras/{muestra_id}/analisis-campo", response_model=AnalisisResponse, status_code=status.HTTP_201_CREATED)
def create_anaphlisis_campo(muestra_id : int, analisis : CreateAnalisis, session : Session = Depends(get_session)):
    muestra = session.get(Muestra, muestra_id)
    if muestra is None:
        raise HTTPException(404, detail=f'La muestra {muestra_id} no existe')
    if muestra.analisis_campo is not None:
        raise HTTPException(409, detail=f'La muestra {muestra_id} ya tiene un analisis_campo')
    new_analisis = AnalisisCampo(
        muestra_id = muestra_id,
        temperatura_c = analisis.temperatura_c,
        densidad_corregida = analisis.densidad_corregida,
        acidez = analisis.acidez,
        ph = analisis.ph,
        caracteristicas_organolepticas = analisis.caracteristicas_organolepticas,
        estabilidad_proteica = analisis.estabilidad_proteica,
        antibiotico_beta_tetra_sulfa = analisis.antibiotico_beta_tetra_sulfa,
        antibiotico_aminoglucosidos = analisis.antibiotico_aminoglucosidos,
        aflatoxinas = analisis.aflatoxinas,
        neutralizantes = analisis.neutralizantes,
        peroxido = analisis.peroxido,
        cloruros = analisis.cloruros,
        observaciones = analisis.observaciones
    )
    session.add(new_analisis)
    try:
        session.commit()
        session.refresh(new_analisis)
    except IntegrityError:
        session.rollback()
        raise HTTPException(400, 'No fue posible crear el analisis por una restricción de integridad')
    return new_analisis
    
@app.post("/controles/{control_id}/decomiso", response_model=DecomisoResponse, status_code=status.HTTP_201_CREATED)
def create_decomiso(control_id : int, decomiso : CreateDecomiso, session : Session = Depends(get_session)):
    control = session.get(Control, control_id)
    if control is None:
        raise HTTPException(
            404,
            detail=f'No econtramos el control {control_id}'
        )
    if control.decomiso is not None:
        raise HTTPException(
            409,
            detail=f'El control {control_id} ya contiene un decomiso'
        )
    new_decomiso = Decomiso(
        control_id = control_id,
        motivo = decomiso.motivo,
        numero_acta_decomiso = decomiso.numero_acta_decomiso,
        numero_acta_destruccion = decomiso.numero_acta_destruccion,
    )
    session.add(new_decomiso)
    try:
        session.commit()
        session.refresh(new_decomiso)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            400,
            detail='No fue posible crear el decomiso por una restricción de integridad'
        )
    return new_decomiso

    
@app.post("/controles/{control_id}/notificaciones", response_model=NotiResponse, status_code=status.HTTP_201_CREATED)
def create_notificacion(control_id : int, noti : CreateNotificacion, session : Session = Depends(get_session)):
        control = session.get(Control, control_id)
        if control is None:
            raise HTTPException(
                404,
                detail=f'No econtramos el control {control_id}'
            )
        new_noti = Notificacion(
            control_id = control_id,
            tipo = noti.tipo,
            estado = noti.estado,
            numero_documento = noti.numero_documento,
            fecha = noti.fecha,
            observaciones = noti.observaciones
        )
        session.add(new_noti)
        try:
            session.commit()
            session.refresh(new_noti)
        except IntegrityError:
            session.rollback()
            raise HTTPException(
                409,
                detail='No fue posible crear la notificacion por una restricción de integridad'
            )
        return new_noti

@app.get("/provincias", response_model = list[ProvinciaResponse])
def get_provincia(session: Session = Depends(get_session)):
    stmt = select(Provincia)
    provincias = session.scalars(stmt).all()
    return provincias

@app.get("/provincias/{provincia_id}/cantones", response_model=list[CantonResponse])
def get_cantones(provincia_id : int, session : Session = Depends(get_session)):
    provincia = session.get(Provincia, provincia_id)
    if provincia is None:
        raise HTTPException(404, 'La provincia que buscas no existe')
    stmt = select(Canton).where(Canton.provincia_id == provincia_id)
    cantones = session.scalars(stmt).all()
    return cantones
    
@app.get("/cantones/{canton_id}/parroquias", response_model=list[ParroquiaResponse])
def get_parroquias(canton_id:int, session : Session = Depends(get_session)):
    canton = session.get(Canton, canton_id)
    if canton is None:
        raise HTTPException(404, 'El canton que buscas no existe')
    stmt = select(Parroquia).where(Parroquia.canton_id == canton_id)
    parroquias = session.scalars(stmt).all()
    return parroquias


