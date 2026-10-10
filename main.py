from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import DateTime, Date, Enum as SQLEnum, func, String, create_engine, ForeignKey
from datetime import date, datetime
from enum import Enum

class Base(DeclarativeBase):
    pass

engine = create_engine()

class TiposOperativos(str, Enum):
    INTERINSTITUCIONAL = "INTERINSTITUCIONAL"
    AGENCIA = "AGENCIA"

class Operativos(Base):
    __tablename__ = "operativo"
    id : Mapped[int] = mapped_column(primary_key=True)
    numero : Mapped[int] = mapped_column(nullable=False)
    tipo_operativo : Mapped[TiposOperativos] = mapped_column(SQLEnum(TiposOperativos, name = "tipo_operativo_enum"), nullable=False)
    fecha : Mapped[date] = mapped_column(Date, nullable=False)
    created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    control : Mapped[list["Control"]] = relationship(back_populates="operativo")
class Control(Base):
    __tablename__ = "Controles"
    id : Mapped[int] = mapped_column(primary_key=True)
    
    control_id : Mapped[int] = mapped_column(ForeignKey("operativo.id"))
    operativo : Mapped["Operativos"] = relationship(back_populates="control")
    


