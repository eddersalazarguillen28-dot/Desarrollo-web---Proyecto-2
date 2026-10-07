import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Cargar variables de entorno
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# URL de conexión para MariaDB
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Crear el motor de conexión
engine = create_engine(DATABASE_URL, echo=False)

# Crear el generador de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def inicializar_esquema(schema_file_path="schema.sql"):
    """
    Lee y ejecuta el archivo schema.sql en MariaDB para crear la estructura.
    """
    if not os.path.exists(schema_file_path):
        print(f" El archivo '{schema_file_path}' no fue encontrado.")
        return

    with open(schema_file_path, "r", encoding="utf-8") as file:
        sql_commands = file.read()

    # MariaDB / MySQL permite múltiples sentencias separadas por ';'
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Dividir por instrucciones SQL para ejecutarlas una por una
            for statement in sql_commands.split(";"):
                stmt = statement.strip()
                if stmt:
                    connection.execute(text(stmt))
            trans.commit()
            print("Esquema SQL ejecutado e inicializado correctamente en MariaDB.")
        except Exception as e:
            trans.rollback()
            print(f"Error al ejecutar schema.sql: {e}")

def get_db():
    """
    Función generadora para obtener la sesión de base de datos.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Inicializar esquema al ejecutar este script directamente
if __name__ == "__main__":
    inicializar_esquema()