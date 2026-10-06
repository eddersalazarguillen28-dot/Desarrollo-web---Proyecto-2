import mysql.connector

# Configuración de conexion a MariaDb
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Pirko',
    'database': 'octo_db',
    'port': 3306
}

def obtener_conexion():
    return mysql.connector.connect(**DB_CONFIG)

# ==========================================
# MÓDULO PRODUCTOS (CRUD)
# ==========================================

def obtener_productos():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM productos")
    productos = cursor.fetchall()
    cursor.close()
    conn.close()
    return productos

def agregar_producto(nombre, precio, stock,
 categoria='General', stock_minimo=5):
    conn = obtener_conexion()
    cursor = conn.cursor()
    query = "INSERT INTO productos (nombre, precio, stock, categoria, stock_minimo) VALUES (%s, %s, %s, %s, %s)"
    cursor.execute(query, (nombre, precio, stock, categoria, stock_minimo))
    conn.commit()
    prod_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return prod_id

def actualizar_producto(producto_id,precio, stock):
    conn = obtener_conexion()
    cursor = conn.cursor()
    query = "UPDATE productos SET precio = %s, stock = %s WHERE id = %s"
    cursor.execute(query, (precio, stock, producto_id))
    conn.commit()
    cursor.close()
    conn.close()

def eliminar_producto(producto_id):
    conn = obtener_conexion()
    cursor = conn.cursor()
    query = "DELETE FROM productos WHERE id = %s"
    cursor.execute(query, (producto_id,))
    conn.commit()
    cursor.close()
    conn.close()


# ==========================================
# MÓDULO CLIENTES
# ==========================================

def obtener_clientes():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM clientes")
    clientes = cursor.fetchall()
    cursor.close()
    conn.close()
    return clientes

def agregar_cliente(nombre, correo, telefono):
    conn = obtener_conexion()
    cursor = conn.cursor()
    query = "INSERT INTO clientes (nombre, correo, telefono) VALUES (%s, %s, %s)"
    cursor.execute(query, (nombre, correo, telefono))
    conn.commit()
    cliente_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return cliente_id


# ==========================================
# MÓDULO VENTAS Y DEDUCCIÓN DE STOCK
# ==========================================

def registrar_venta(cliente_id, items_venta):
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    
    try:
        total_venta = 0
        detalles_a_insertar = []

        for item in items_venta:
            p_id = item['producto_id']
            cant = item['cantidad']

            cursor.execute("SELECT precio, stock FROM productos WHERE id = %s", (p_id,))
            prod = cursor.fetchone()

            if not prod:
                raise Exception(f"Producto con ID {p_id} no existe.")
            if prod['stock'] < cant:
                raise Exception(f"Stock insuficiente para producto ID {p_id}. Stock actual: {prod['stock']}")

            subtotal = prod['precio'] * cant
            total_venta += subtotal
            detalles_a_insertar.append((p_id, cant, subtotal))

        cursor_write = conn.cursor()
        cursor_write.execute("INSERT INTO ventas (cliente_id, total) VALUES (%s, %s)", (cliente_id, total_venta))
        venta_id = cursor_write.lastrowid

        for p_id, cant, subtotal in detalles_a_insertar:
            cursor_write.execute(
                "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, subtotal) VALUES (%s, %s, %s, %s)",
                (venta_id, p_id, cant, subtotal)
            )
            cursor_write.execute("UPDATE productos SET stock = stock - %s WHERE id = %s", (cant, p_id))

        conn.commit()
        cursor_write.close()
        cursor.close()
        conn.close()
        return {"status": "ok", "venta_id": venta_id, "total": total_venta}

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return {"status": "error", "message": str(e)}


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
    cursor = conn.cursos(dictionary=True)

    try: 
        cursor.execute("""
        SELECT v.id AS id,
        dv.id AS detalleId,
        DATE_FORMAT(V.FECHA, '%d/%m/%Y') AS fecha,
        dv.producto_id AS productoId,
        dv.cantidad AS cantidad,
        dv,subtotal AS subtotal,
        dv.subtotal / NULLIF(dv.cantidad, 0) AS precioUnitario FROM ventas v JOIN detalle_ventas dv ON dv.venta_id = v.id ORDER BY v.fecha, v.id, dv.id
        """)

        return cursor.fetchall()

    finally: 
        cursor.close()
        conn.close()