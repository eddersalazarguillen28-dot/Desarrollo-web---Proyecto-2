import os 
import sqlite3
from datetime import datetime

RUTA_DB = os.path.join(os.path.dirname(__file__), "..", "backend", "octo.db")

def conectar():
    ruta_abs = os.path.abspath(RUTA_DB)
    if not os.path.exists(ruta_abs):
        raise FileExistsError(f"no se encontro la bd en: {ruta_abs}")
    conn = sqlite3.connect(ruta_abs)
    conn.row_factory = sqlite3.Row
    return conn
def obtener_ventanas_ultimos_30d(cursor, producto_id):
    cursor.execute("""
        SELECT COALESCE(SUM(div.cantidad), 0) AS total
        From detalle_ventas dv
        JOIN ventas v ON v.id = dv.venta_id
        WHERE dv.producto_id = ?
            AND v.fecha >= datetime('now', '-30 days')
    """, (producto_id,))
    fila = cursor.fetchone
    return int(fila["total"]) if fila else 0

def calcular_stock_minimo(vendidos_30d):
    if vendidos_30d == 0:
        return 2
    ventas_diarias = vendidos_30d / 30
    return max(2, round(ventas_diarias * 7))

def obtener_inventario_completo():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT id, nombre, precio, stock FROM productos")
    productos_raw = cursor.fetchall()
    productos = []

    for p in productos_raw:
        id_p = p["id"]
        nombre = p["nombre"]
        precio = float(p["precio"])
        stock = int(p["stock"])

        vendidos = obtener_ventanas_ultimos_30d(cursor, id_p)
        stock_min = calcular_stock_minimo(vendidos)

        productos.append({
            "id": id_p,
            "nombre": nombre,
            "stock_actual": stock,
            "stock_minimo": stock_min,
            "precio_compra": round(precio * 0.6, 2),
            "precio_venta": precio,
            "vendidos_30d": vendidos,
        })
    conn.close()

    return{
        "fecha_analisis": datetime.now().strftime("%Y-%m-%d"),
        "productos": productos,
    }
