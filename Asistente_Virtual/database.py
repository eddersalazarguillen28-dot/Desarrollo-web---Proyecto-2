import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


# ============================================================
# Carga de variables de entorno y conexión a la base de datos
# ============================================================

# Cargar variables de entorno desde .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Si no hay una URL completa, la armamos con las variables sueltas
if not DATABASE_URL:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ============================================================
# Inicialización del esquema (lectura de schema.sql)
# ============================================================
def inicializar_esquema(schema_file_path="schema.sql"):
    """
    Lee el archivo schema.sql y ejecuta cada instrucción SQL por separado.
    Si el archivo no existe, avisa y no hace nada.
    """

    if not os.path.exists(schema_file_path):
        print(f" El archivo '{schema_file_path}' no fue encontrado.")
        return

    # Leemos todo el contenido del archivo
    with open(schema_file_path, "r", encoding="utf-8") as file:
        sql_commands = file.read()

    # Ejecutamos los comandos dentro de una transacción
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Separamos por punto y coma para ejecutar una instrucción a la vez
            for statement in sql_commands.split(";"):
                stmt = statement.strip()
                if stmt:
                    connection.execute(text(stmt))
            trans.commit()
            print("Esquema SQL ejecutado e inicializado correctamente.")
        except Exception as e:
            trans.rollback()
            print(f"Error al ejecutar schema.sql: {e}")


# ============================================================
# Sesión de base de datos para usar con FastAPI (o similar)
# ============================================================
def get_db():
    """
    Función generadora para obtener la sesión de base de datos.
    Se usa como dependencia (yield) y se encarga de cerrarla al final.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# Punto de entrada: inicializa el esquema al correr el script
# ============================================================
if __name__ == "__main__":
    inicializar_esquema()