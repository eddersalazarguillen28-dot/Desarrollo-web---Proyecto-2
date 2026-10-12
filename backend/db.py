import os
import psycopg2


def obtener_conexion():
    """
    Crea una conexión con PostgreSQL en Render.
    """
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "No se encontró la variable de entorno DATABASE_URL."
        )

    return psycopg2.connect(database_url)


def inicializar_bd():
    """
    Crea las tablas de OCTO ERP y actualiza columnas necesarias
    sin borrar los datos existentes.
    """
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:

            # ==========================================
            # PRODUCTOS
            # ==========================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS productos (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    precio NUMERIC(10, 2) NOT NULL,
                    stock INTEGER NOT NULL DEFAULT 0,
                    categoria VARCHAR(100) NOT NULL DEFAULT 'General',
                    stock_minimo INTEGER NOT NULL DEFAULT 5
                );
            """)

            # Compatibilidad con bases de datos existentes.
            cursor.execute("""
                ALTER TABLE productos
                    ADD COLUMN IF NOT EXISTS
                        categoria VARCHAR(100)
                        NOT NULL DEFAULT 'General',
                    ADD COLUMN IF NOT EXISTS
                        stock_minimo INTEGER
                        NOT NULL DEFAULT 5;
            """)

            # ==========================================
            # CLIENTES
            # ==========================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clientes (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    correo VARCHAR(150) UNIQUE,
                    telefono VARCHAR(50)
                );
            """)

            # ==========================================
            # VENTAS
            # ==========================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ventas (
                    id SERIAL PRIMARY KEY,
                    cliente_id INTEGER,
                    total NUMERIC(10, 2) NOT NULL,
                    fecha TIMESTAMP NOT NULL
                        DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cliente_id)
                        REFERENCES clientes(id)
                        ON DELETE SET NULL
                );
            """)

            # Permite ventas sin cliente y conserva
            # el historial si se elimina un cliente.
            cursor.execute("""
                ALTER TABLE ventas
                ALTER COLUMN cliente_id DROP NOT NULL;
            """)

            # ==========================================
            # DETALLE DE VENTAS
            # ==========================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detalle_ventas (
                    id SERIAL PRIMARY KEY,
                    venta_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    cantidad INTEGER NOT NULL,
                    precio_unitario NUMERIC(10, 2) NOT NULL,
                    subtotal NUMERIC(10, 2) NOT NULL,
                    FOREIGN KEY (venta_id)
                        REFERENCES ventas(id),
                    FOREIGN KEY (producto_id)
                        REFERENCES productos(id)
                );
            """)

        conexion.commit()

        print(
            "Base de datos de OCTO ERP inicializada "
            "correctamente en PostgreSQL."
        )
        return True

    except Exception as e:
        if conexion is not None:
            conexion.rollback()

        print(f"Error al inicializar la base de datos: {e}")
        return False

    finally:
        if conexion is not None:
            conexion.close()


if __name__ == "__main__":
    inicializar_bd()