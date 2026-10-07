import os, sys
from datetime import datetime

RUTA_RAIZ = os.path.abspath(os.path.join(os.path.dirname(_file_), ".."))
if RUTA_RAIZ not in sys.path: sys.path.insert(0, RUTA_RAIZ)

from backend.db_manager import obtener_conexion

def calcular_stock_minimo(vendidos_30d, stock_minimo_bd=None):
    if stock_minimo_bd and stock_minimo_bd > 0: return int(stock_minimo_bd)
    return 2 if vendidos_30d == 0 else max(2, round((vendidos_30d / 30) * 7))

def obtener_inventario_completo():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    
    # Consulta optimizada (1 sola query en lugar de N+1)
    cursor.execute("""
        SELECT p.id, p.nombre, p.precio, p.stock, p.stock_minimo,
               COALESCE(SUM(dv.cantidad), 0) AS vendidos_30d
        FROM productos p
        LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
        LEFT JOIN ventas v ON v.id = dv.venta_id AND v.fecha >= NOW() - INTERVAL 30 DAY
        GROUP BY p.id, p.nombre, p.precio, p.stock, p.stock_minimo
    """)
    productos_raw = cursor.fetchall()
    cursor.close(); conn.close()

    productos = [{
        "id": p["id"], "nombre": p["nombre"],
        "stock_actual": int(p["stock"]),
        "stock_minimo": calcular_stock_minimo(int(p["vendidos_30d"]), p.get("stock_minimo")),
        "precio_compra": round(float(p["precio"]) * 0.6, 2),
        "precio_venta": float(p["precio"]),
        "vendidos_30d": int(p["vendidos_30d"])
    } for p in productos_raw]

    return {"fecha_analisis": datetime.now().strftime("%Y-%m-%d"), "productos": productos}

def obtener_resumen_ventas():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS ingresos FROM ventas")
    f = cursor.fetchone()
    cursor.close(); conn.close()
    return {"total_ventas": int(f["total"]) if f else 0, "ingresos_totales": float(f["ingresos"]) if f else 0.0}

if __name__ == "__main__":
    print("=" * 60 + "\nLectura de Inventario\n" + "=" * 60 + "\n")
    print(f"ruta calculada: {os.path.abspath(RUTA_RAIZ)}\nEXISTE: {os.path.exists(RUTA_RAIZ)}")

    try:
        datos, resumen = obtener_inventario_completo(), obtener_resumen_ventas()
        print(f"Fecha analisis: {datos['fecha_analisis']}\nTotal productos: {len(datos['productos'])}")
        print(f"Total Ventas registradas: {resumen['total_ventas']}\nIngresos totales: {resumen['ingresos_totales']:,.2f}\n\nproductos:")

        for p in datos["productos"]:
            sena = "x" if p["stock_actual"] < p["stock_minimo"] else "...."
            print(f"{sena} {p['nombre']:25} stock={p['stock_actual']:>3} min={p['stock_minimo']:>3} vendidos_30d={p['vendidos_30d']:>3} precio= {p['precio_venta']:,.2f}")

    except Exception as e:
        print(f"X Error inesperado: {e}")