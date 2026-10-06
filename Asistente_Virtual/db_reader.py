import os 
import sys
from datetime import datetime

RUTA_RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
if RUTA_RAIZ not in sys.path:
    sys.path.insert(0, RUTA_RAIZ)

from backend.db_manager import obtener_conexion

def obtener_ventas_ultimos_30d(cursor, producto_id):
    cursor.execute("""
        SELECT COALESCE(SUM(dv.cantidad), 0) AS total
        FROM detalle_ventas dv
        JOIN ventas v ON v.id = dv.venta_id
        WHERE dv.producto_id = %s
          AND v.fecha >= NOW() - INTERVAL 30 DAY
    """, (producto_id,))
    fila = cursor.fetchone()
    return int(fila["total"]) if fila and fila.get("total") else 0

def calcular_stock_minimo(vendidos_30d, stock_minimo_bd=None):
    if stock_minimo_bd is not None and stock_minimo_bd > 0:
        return int(stock_minimo_bd)
    if vendidos_30d == 0:
        return 2
    ventas_diarias = vendidos_30d / 30
    return max(2, round(ventas_diarias * 7))

def obtener_inventario_completo():
    conn = obtener_conexion()
    cursor = conn.cursor()

    cursor.execute("SELECT id, nombre, precio, stock FROM productos")
    productos_raw = cursor.fetchall()
    productos = []

    for p in productos_raw:
        id_p = p["id"]
        nombre = p["nombre"]
        precio = float(p["precio"])
        stock = int(p["stock"])

        vendidos = obtener_ventas_ultimos_30d(cursor, id_p)
        stock_min = calcular_stock_minimo(vendidos, p.get("stock_minimo"))

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

def obtener_resumen_ventas():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS ingresos FROM ventas"
    )
    fila = cursor.fetchone()

    cursor.close()
    conn.close()
    
    return{
        "total_ventas": int(fila["total"]),
        "ingresos_totales": float(fila["ingresos"]), 
    }

if __name__ == "__main__":
    print("=" * 60)
    print("Lectura de Inventario")
    print("=" * 60 + "\n")

    #busca la ruta
    print(f"ruta calculada:{os.path.abspath(RUTA_RAIZ)}")
    print(f"EXISTE:{os.path.exists(RUTA_RAIZ)}")

    try:
        datos = obtener_inventario_completo()
        resumen = obtener_resumen_ventas()

        print(f"Fecha analisis: {datos['fecha_analisis']}")
        print(f"Total productos: {len(datos['productos'])}")
        print(f"Total Ventas registradas: {resumen['total_ventas']}")
        print(f"Ingresos totales: {resumen['ingresos_totales']:,.2f}\n")

        print("productos:")
        for p in datos["productos"]:
            sena = "x" if p["stock_actual"] < p["stock_minimo"] else "...."
            print(f"{sena}{p['nombre']:25}" 
                  f"stock={p['stock_actual']:>3}"
                  f"min={p['stock_minimo']:>3} "
                  f"vendidos_30d={p['vendidos_30d']:>3}"
                  f"precio= {p['precio_venta']:,.2f}"
            )

    except Exception as e:
        print(f"X Error inesperado {e}")
