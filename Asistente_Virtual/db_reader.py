import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def obtener_conexion():
    try:
        database_url = os.getenv("http://octo-erp.onrender.com")

        if not database_url:
            print("Error: No se encontró la variable DATABASE_URL.")
            return None

        conexion = psycopg2.connect(database_url)
        print("Conexión exitosa a PostgreSQL")
        return conexion
    except Exception as e:
        print(f"Error de conexión: {e}")
        return None  

def obtener_datos_ia():
    conexion = obtener_conexion()
    if conexion is None:
        return []
    cursor = conexion.cursor(cursor_factory=RealDictCursor)

    try:
        consulta = """
            SELECT
                p.id AS producto_id,
                p.nombre,
                p.precio,
                p.stock AS stock_actual,
                p.stock_minimo,

                COALESCE(
                    SUM(
                        CASE
                            WHEN v.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                            THEN dv.cantidad
                            ELSE 0
                        END
                    ),
                    0
                ) AS vendidos_30d

            FROM productos p

            LEFT JOIN detalle_ventas dv
                ON p.id = dv.producto_id

            LEFT JOIN ventas v
                ON dv.venta_id = v.id

            GROUP BY
                p.id,
                p.nombre,
                p.precio,
                p.stock,
                p.stock_minimo

            ORDER BY p.nombre;
        """
        cursor.execute(consulta)
        datos = cursor.fetchall()
        return datos
    except Exception as e:
        print(f"Error consultando datos: {e}")
        return []
    finally:
        cursor.close()
        conexion.close()


if __name__ == "__main__":
   datos = obtener_datos_ia()
   print("\n========== DATOS PARA LA IA ==========\n")
   for producto in datos:
        print(
            f"{producto['nombre']} | "
            f"Stock: {producto['stock_actual']} | "
            f"Mínimo: {producto['stock_minimo']} | "
            f"Vendidos 30 días: {producto['vendidos_30d']}"
        )
