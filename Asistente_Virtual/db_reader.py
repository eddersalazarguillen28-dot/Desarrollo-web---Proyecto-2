from psycopg2.extras import RealDictCursor

from backend.db_manager import obtener_conexion


# ============================================================
# Lectura de datos de inventario para el asistente de IA
# ============================================================
def obtener_datos_ia():
    """
    Obtiene el inventario y las ventas de los últimos 30 días.
    Devuelve una lista de diccionarios con los datos de cada producto.
    """

    conexion = obtener_conexion()

    if conexion is None:
        print("Error: no se pudo conectar con la base de datos.")
        return []

    cursor = None

    try:
        # Usamos RealDictCursor para que cada fila venga como diccionario
        cursor = conexion.cursor(cursor_factory=RealDictCursor)

        # Traemos todos los productos con sus ventas de los últimos 30 días
        consulta = """
            SELECT
                p.id AS producto_id,
                p.nombre,
                p.precio,
                p.stock AS stock_actual,
                p.stock_minimo,
                COALESCE(
                    SUM(dv.cantidad) FILTER (
                        WHERE v.fecha >= CURRENT_TIMESTAMP
                            - INTERVAL '30 days'
                    ),
                    0
                ) AS vendidos_30d

            FROM productos p

            LEFT JOIN detalle_ventas dv
                ON dv.producto_id = p.id

            LEFT JOIN ventas v
                ON v.id = dv.venta_id

            GROUP BY
                p.id,
                p.nombre,
                p.precio,
                p.stock,
                p.stock_minimo

            ORDER BY p.nombre;
        """

        cursor.execute(consulta)
        filas = cursor.fetchall()

        datos = []

        for fila in filas:
            producto = dict(fila)

            # Convertir valores NUMERIC de PostgreSQL a float
            if producto["precio"] is not None:
                producto["precio"] = float(producto["precio"])

            # Aseguramos que las cantidades sean enteras
            # (así la IA las procesa sin líos)
            producto["stock_actual"] = int(
                producto["stock_actual"] or 0
            )
            producto["stock_minimo"] = int(
                producto["stock_minimo"] or 0
            )
            producto["vendidos_30d"] = int(
                producto["vendidos_30d"] or 0
            )

            datos.append(producto)

        print(f"Productos obtenidos para la IA: {len(datos)}")
        return datos

    except Exception as e:
        print(f"Error consultando el inventario para la IA: {e}")
        return []

    finally:
        # Cerramos cursor y conexión siempre, aunque haya error
        if cursor is not None:
            cursor.close()

        conexion.close()


# ============================================================
# Ejecución directa para probar el archivo
# ============================================================
if __name__ == "__main__":
    datos = obtener_datos_ia()

    print("\n========== INVENTARIO PARA LA IA ==========\n")

    for producto in datos:
        print(
            f"{producto['nombre']} | "
            f"Stock: {producto['stock_actual']} | "
            f"Mínimo: {producto['stock_minimo']} | "
            f"Vendidos en 30 días: {producto['vendidos_30d']}"
        )