from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import DateTime, Date, Enum as SQLEnum, func, String, ForeignKey, CheckConstraint, Numeric, Text, Boolean, UniqueConstraint, true, create_engine, text
from datetime import date, datetime
from enum import Enum
from decimal import Decimal
import os
from dotenv import load_dotenv

load_dotenv()

class Base(DeclarativeBase):
    pass

engine = create_engine(os.environ["DB_URL"])


class TiposOperativos(str, Enum):
    INTERINSTITUCIONAL = "INTERINSTITUCIONAL"
    AGENCIA = "AGENCIA"

class TipoLugar(str, Enum):
    CENTRO_ACOPIO = "CENTRO_ACOPIO"
    MEDIO_TRANSPORTE = "MEDIO_TRANSPORTE"
    SILO_INDUSTRIA_LACTEA = "SILO_INDUSTRIA_LACTEA"
    UPA_FINCA = "UPA_FINCA"


class ResultadoCualitativo(str, Enum):
    POSITIVO = "POSITIVO"
    NEGATIVO = "NEGATIVO"


class CaracteristicasOrganolepticas(str, Enum):
    CUMPLE = "CUMPLE"
    NO_CUMPLE = "NO_CUMPLE"


class Operativo(Base):
    __tablename__ = "operativo"
    id : Mapped[int] = mapped_column(primary_key=True)
    numero : Mapped[int] = mapped_column(nullable=False)
    tipo_operativo : Mapped[TiposOperativos] = mapped_column(SQLEnum(TiposOperativos, name = "tipo_operativo_enum"), nullable=False)
    fecha : Mapped[date] = mapped_column(Date, nullable=False)
    created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    controles : Mapped[list["Control"]] = relationship(back_populates="operativo")

class Control(Base):
    __tablename__ = "Controles"
    __table_args__ = (
        CheckConstraint(
            "numero_registro IS NULL OR tipo_lugar IN ('CENTRO_ACOPIO', 'MEDIO_TRANSPORTE')",
            name="ck_control_registro_tipo_lugar",
        ),
        CheckConstraint("litros_controlados >= 0", name="ck_control_litros_controlados"),
        CheckConstraint("litros_inocuos >= 0", name="ck_control_litros_inocuos"),
        CheckConstraint("litros_decomisados >= 0", name="ck_control_litros_decomisados"),
        CheckConstraint("litros_controlados = litros_inocuos + litros_decomisados", name="ck_control_balance_litros"),
    )
    id : Mapped[int] = mapped_column(primary_key=True)
    operativo_id : Mapped[int] = mapped_column(ForeignKey("operativo.id"))
    operativo : Mapped["Operativo"] = relationship(back_populates="controles")


    parroquia_id : Mapped[int] = mapped_column(ForeignKey("parroquia.id"), nullable=False)
    parroquia : Mapped["Parroquia"] = relationship(back_populates="controles")

    muestra: Mapped["Muestra | None"] = relationship(back_populates="control", uselist=False)
    decomiso: Mapped["Decomiso | None"] = relationship(back_populates="control", uselist=False)
    notificaciones: Mapped[list["Notificacion"]] = relationship(back_populates="control")

    litros_controlados: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    litros_inocuos: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    litros_decomisados: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    sector: Mapped[str | None] = mapped_column(String, nullable=True)
    propietario: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_lugar: Mapped[TipoLugar] = mapped_column(
        SQLEnum(TipoLugar, name="tipo_lugar_enum"), nullable=False
    )
    numero_registro: Mapped[str | None] = mapped_column(String, nullable=True)
    nombre_lugar_muestreado: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Provincia(Base):
    __tablename__ = "provincia"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    cantones: Mapped[list["Canton"]] = relationship(back_populates="provincia")


class Canton(Base):
    __tablename__ = "canton"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    provincia_id: Mapped[int] = mapped_column(ForeignKey("provincia.id"), nullable=False)
    provincia: Mapped["Provincia"] = relationship(back_populates="cantones")
    parroquias: Mapped[list["Parroquia"]] = relationship(back_populates="canton")


class Parroquia(Base):
    __tablename__ = "parroquia"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    canton_id: Mapped[int] = mapped_column(ForeignKey("canton.id"), nullable=False)
    canton: Mapped["Canton"] = relationship(back_populates="parroquias")
    controles: Mapped[list["Control"]] = relationship(back_populates="parroquia")


class Muestra(Base):
    __tablename__ = "muestra"

    id: Mapped[int] = mapped_column(primary_key=True)
    control_id: Mapped[int] = mapped_column(
        ForeignKey("Controles.id"), unique=True, nullable=False
    )
    codigo: Mapped[str] = mapped_column(String, nullable=False)
    control: Mapped["Control"] = relationship(back_populates="muestra", uselist=False)
    analisis_campo: Mapped["AnalisisCampo | None"] = relationship(
        back_populates="muestra", uselist=False
    )
    envio_laboratorio: Mapped["EnvioLaboratorio | None"] = relationship(
        back_populates="muestra", uselist=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AnalisisCampo(Base):
    __tablename__ = "analisis_campo"
    __table_args__ = (
        CheckConstraint("ph BETWEEN 0 AND 14", name="ck_analisis_campo_ph"),
        CheckConstraint("densidad_corregida >= 0", name="ck_analisis_campo_densidad"),
        CheckConstraint("acidez >= 0", name="ck_analisis_campo_acidez"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    muestra_id: Mapped[int] = mapped_column(
        ForeignKey("muestra.id"), unique=True, nullable=False
    )
    muestra: Mapped["Muestra"] = relationship(back_populates="analisis_campo", uselist=False)

    temperatura_c: Mapped[Decimal | None] = mapped_column(Numeric, nullable=True)
    densidad_corregida: Mapped[Decimal | None] = mapped_column(Numeric, nullable=True)
    acidez: Mapped[Decimal | None] = mapped_column(Numeric, nullable=True)
    ph: Mapped[Decimal | None] = mapped_column(Numeric, nullable=True)
    caracteristicas_organolepticas: Mapped[CaracteristicasOrganolepticas | None] = mapped_column(
        SQLEnum(CaracteristicasOrganolepticas, name="caracteristicas_organolepticas_enum"),
        nullable=True,
    )
    estabilidad_proteica: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    antibiotico_beta_tetra_sulfa: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    antibiotico_aminoglucosidos: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    aflatoxinas: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    neutralizantes: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    peroxido: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    cloruros: Mapped[ResultadoCualitativo | None] = mapped_column(
        SQLEnum(ResultadoCualitativo, name="resultado_cualitativo_enum"), nullable=True
    )
    observaciones: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )



class TipoNotificacion(str, Enum):
    INDUSTRIA_LACTEA = "INDUSTRIA_LACTEA"
    ARCSA = "ARCSA"


class EstadoNotificacion(str, Enum):
    PENDIENTE = "PENDIENTE"
    EMITIDA = "EMITIDA"


class Decomiso(Base):
    __tablename__ = "decomiso"
    __table_args__ = (
        CheckConstraint(
            "numero_acta_decomiso IS NULL OR numero_acta_decomiso ~ '^[0-9]{4}$'",
            name="ck_decomiso_numero_acta_decomiso",
        ),
        CheckConstraint(
            "numero_acta_destruccion IS NULL OR numero_acta_destruccion ~ '^[0-9]{4}$'",
            name="ck_decomiso_numero_acta_destruccion",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    control_id: Mapped[int] = mapped_column(ForeignKey("Controles.id"), unique=True, nullable=False)
    control: Mapped["Control"] = relationship(back_populates="decomiso", uselist=False)
    motivo: Mapped[str] = mapped_column(String, nullable=False)
    destino: Mapped[str] = mapped_column(
        String, default="ABONO EN POTREROS EN RENOVACION",
        server_default="ABONO EN POTREROS EN RENOVACION", nullable=False,
    )
    numero_acta_decomiso: Mapped[str | None] = mapped_column(String(4), nullable=True)
    numero_acta_destruccion: Mapped[str | None] = mapped_column(String(4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Laboratorio(Base):
    __tablename__ = "laboratorio"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true(), nullable=False)
    envios: Mapped[list["EnvioLaboratorio"]] = relationship(back_populates="laboratorio")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class EnvioLaboratorio(Base):
    __tablename__ = "envio_laboratorio"

    id: Mapped[int] = mapped_column(primary_key=True)
    muestra_id: Mapped[int] = mapped_column(ForeignKey("muestra.id"), unique=True, nullable=False)
    laboratorio_id: Mapped[int] = mapped_column(ForeignKey("laboratorio.id"), nullable=False)
    muestra: Mapped["Muestra"] = relationship(back_populates="envio_laboratorio", uselist=False)
    laboratorio: Mapped["Laboratorio"] = relationship(back_populates="envios")
    fecha_envio: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Notificacion(Base):
    __tablename__ = "notificacion"
    __table_args__ = (
        UniqueConstraint("control_id", "tipo", name="uq_notificacion_control_tipo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    control_id: Mapped[int] = mapped_column(ForeignKey("Controles.id"), nullable=False)
    control: Mapped["Control"] = relationship(back_populates="notificaciones")
    tipo: Mapped[TipoNotificacion] = mapped_column(
        SQLEnum(TipoNotificacion, name="tipo_notificacion_enum"), nullable=False
    )
    estado: Mapped[EstadoNotificacion] = mapped_column(
        SQLEnum(EstadoNotificacion, name="estado_notificacion_enum"),
        default=EstadoNotificacion.PENDIENTE, server_default="PENDIENTE", nullable=False,
    )
    numero_documento: Mapped[str | None] = mapped_column(String, nullable=True)
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

Base.metadata.create_all(engine)
