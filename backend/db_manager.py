import os, sys
import mysql.connector
from datetime import datetime

# Configuración de conexion a MariaDb
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '12345',
    'database': 'octo_db',
    'port': 3306
}

def obtener_conexion():
    return mysql.connector.connect(**DB_CONFIG, use_pure=True)

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

    try:
        datos, resumen = obtener_inventario_completo(), obtener_resumen_ventas()
        print(f"Fecha analisis: {datos['fecha_analisis']}\nTotal productos: {len(datos['productos'])}")
        print(f"Total Ventas registradas: {resumen['total_ventas']}\nIngresos totales: {resumen['ingresos_totales']:,.2f}\n\nproductos:")

        for p in datos["productos"]:
            sena = "x" if p["stock_actual"] < p["stock_minimo"] else "...."
            print(f"{sena} {p['nombre']:25} stock={p['stock_actual']:>3} min={p['stock_minimo']:>3} vendidos_30d={p['vendidos_30d']:>3} precio= {p['precio_venta']:,.2f}")

    except Exception as e:
        print(f"Error al consultar los datos: {e}")


# ==========================================
# MÓDULO DASHBOARD & IA
# ==========================================

def obtener_kpis_dashboard():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total_ventas, COALESCE(SUM(total), 0) AS ingresos_totales FROM ventas")
    ventas_kpi = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) AS total_clientes FROM clientes")
    clientes_kpi = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) AS total_productos FROM productos")
    productos_kpi = cursor.fetchone()

    cursor.execute('''
        SELECT p.nombre, SUM(dv.cantidad) AS total_vendido
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
        GROUP BY p.id
        ORDER BY total_vendido DESC
        LIMIT 5
    ''')
    top_productos = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "total_ventas": ventas_kpi["total_ventas"],
        "ingresos_totales_colones": float(ventas_kpi["ingresos_totales"]),
        "total_clientes": clientes_kpi["total_clientes"],
        "total_productos": productos_kpi["total_productos"],
        "top_productos": top_productos
    }

def obtener_datos_para_asistente_ia():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id, nombre, stock, stock_minimo FROM productos")
    inventario = cursor.fetchall()

    cursor.execute('''
        SELECT p.nombre, SUM(dv.cantidad) as unidades_vendidas
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
        GROUP BY p.id
    ''')
    ventas_resumen = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "inventario": inventario,
        "ventas_resumen": ventas_resumen
    }

def obtener_detalles_dashboard():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)

    try: 
        cursor.execute("""
        SELECT 
            v.id AS id,
            dv.id AS detalleId,
            DATE_FORMAT(v.fecha, '%d/%m/%Y') AS fecha,
            dv.producto_id AS productoId,
            dv.cantidad AS cantidad,
            dv.cantidad * dv.precio_unitario AS subtotal,
            dv.precio_unitario AS precioUnitario
            FROM ventas v JOIN detalle_ventas dv ON dv.venta_id = v.id 
            ORDER BY v.fecha, v.id, dv.id
            """)

        return cursor.fetchall()

    finally: 
        cursor.close()
        conn.close()

        
def obtener_productos():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM productos")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
