import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

class Base(DeclarativeBase):
    pass

engine = create_engine(os.environ["DB_URL"])

SessionLocal = sessionmaker(
    bind=engine
)

def get_session():
    with SessionLocal() as session:
        yield session