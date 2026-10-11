from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import DateTime, Date, Enum as SQLEnum, func, String, ForeignKey
from datetime import date, datetime
from enum import Enum

class Base(DeclarativeBase):
    pass


class TiposOperativos(str, Enum):
    INTERINSTITUCIONAL = "INTERINSTITUCIONAL"
    AGENCIA = "AGENCIA"

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
    id : Mapped[int] = mapped_column(primary_key=True)
    operativo_id : Mapped[int] = mapped_column(ForeignKey("operativo.id"))
    operativo : Mapped["Operativo"] = relationship(back_populates="controles")
    parroquia_id : Mapped[int] = mapped_column(ForeignKey("parroquia.id"), nullable=False)
    parroquia : Mapped["Parroquia"] = relationship(back_populates="controles")


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
