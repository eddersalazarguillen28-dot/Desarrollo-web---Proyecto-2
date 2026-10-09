import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv('DATABASE_URL')

def obtener_conexion():
    if not DATABASE_URL:
        raise Exception("Error: No se ha configurado la variable de entorno DATABASE_URL")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def inicializar_bd():
    """Crea la estructura de tablas e inserta datos iniciales si está vacía."""
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()

        # 1. Tabla Usuarios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            correo VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            rol VARCHAR(50) DEFAULT 'vendedor'
        );
        """)

        # 2. Tabla Productos
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS productos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            precio NUMERIC(10, 2) NOT NULL,
            stock INTEGER NOT NULL,
            stock_minimo INTEGER DEFAULT 5
        );
        """)

        # 3. Tabla Clientes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            correo VARCHAR(150) UNIQUE,
            telefono VARCHAR(50)
        );
        """)

        # 4. Tabla Ventas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ventas (
            id SERIAL PRIMARY KEY,
            cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
            total NUMERIC(10, 2) NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 5. Tabla Detalle Ventas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS detalle_ventas (
            id SERIAL PRIMARY KEY,
            venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
            producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
            cantidad INTEGER NOT NULL,
            precio_unitario NUMERIC(10, 2) NOT NULL
        );
        """)

        # Insertar usuario Admin de prueba si no existe
        cursor.execute("SELECT COUNT(*) AS total FROM usuarios;")
        if cursor.fetchone()['total'] == 0:
            cursor.execute(
                "INSERT INTO usuarios (nombre, correo, password, rol) VALUES (%s, %s, %s, %s);",
                ('Admin Sistema', 'admin@octo.com', '123456', 'admin')
            )

        # Insertar datos base si no existen productos
        cursor.execute("SELECT COUNT(*) AS total FROM productos;")
        if cursor.fetchone()['total'] == 0:
            cursor.execute("INSERT INTO productos (nombre, precio, stock, stock_minimo) VALUES (%s, %s, %s, %s)", ('Laptop HP', 335000.00, 15, 5))
            cursor.execute("INSERT INTO productos (nombre, precio, stock, stock_minimo) VALUES (%s, %s, %s, %s)", ('Mouse Inalámbrico', 8000.00, 2, 5))
            cursor.execute("INSERT INTO productos (nombre, precio, stock, stock_minimo) VALUES (%s, %s, %s, %s)", ('Teclado Mecánico', 23000.00, 28, 5))
            cursor.execute("INSERT INTO productos (nombre, precio, stock, stock_minimo) VALUES (%s, %s, %s, %s)", ('Monitor 24"', 95000.00, 8, 5))

        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Base de datos PostgreSQL inicializada correctamente.")
    except Exception as e:
        print("❌ Error al inicializar la base de datos:", e)

# --- OPERACIONES PRODUCTOS ---

def obtener_productos():
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre, precio, stock, stock_minimo FROM productos ORDER BY id;")
        filas = cursor.fetchall()
        return [{
            "id": p["id"],
            "nombre": p["nombre"],
            "precio": float(p["precio"]),
            "stock": p["stock"],
            "stockMinimo": p["stock_minimo"]
        } for p in filas]
    finally:
        cursor.close()
        conn.close()

def agregar_producto(nombre, precio, stock, stock_minimo=5):
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO productos (nombre, precio, stock, stock_minimo) VALUES (%s, %s, %s, %s) RETURNING id;",
            (nombre, precio, stock, stock_minimo)
        )
        prod_id = cursor.fetchone()['id']
        conn.commit()
        return prod_id
    finally:
        cursor.close()
        conn.close()

def actualizar_producto(producto_id, nombre, precio, stock, stock_minimo=5):
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE productos SET nombre = %s, precio = %s, stock = %s, stock_minimo = %s WHERE id = %s;",
            (nombre, precio, stock, stock_minimo, producto_id)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def eliminar_producto(producto_id):
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM productos WHERE id = %s;", (producto_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

# --- OPERACIONES CLIENTES ---

def obtener_clientes():
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM clientes ORDER BY id;")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def agregar_cliente(nombre, correo, telefono):
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO clientes (nombre, correo, telefono) VALUES (%s, %s, %s) RETURNING id;",
            (nombre, correo, telefono)
        )
        c_id = cursor.fetchone()['id']
        conn.commit()
        return c_id
    finally:
        cursor.close()
        conn.close()

def eliminar_cliente(cliente_id):
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM clientes WHERE id = %s;", (cliente_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

# --- OPERACIONES VENTAS ---

def registrar_venta(cliente_id, detalles):
    """
    Registra una venta y sus detalles en una transacción atómica, 
    descontando el stock del producto.
    'detalles' es una lista de dicts: [{'producto_id': 1, 'cantidad': 2, 'precio_unitario': 8000.0}]
    """
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        total_venta = sum(item['cantidad'] * item['precio_unitario'] for item in detalles)
        
        # 1. Insertar Venta
        cursor.execute(
            "INSERT INTO ventas (cliente_id, total) VALUES (%s, %s) RETURNING id;",
            (cliente_id, total_venta)
        )
        venta_id = cursor.fetchone()['id']

        # 2. Insertar Detalle y Descontar Stock
        for item in detalles:
            cursor.execute(
                "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (%s, %s, %s, %s);",
                (venta_id, item['producto_id'], item['cantidad'], item['precio_unitario'])
            )
            cursor.execute(
                "UPDATE productos SET stock = stock - %s WHERE id = %s;",
                (item['cantidad'], item['producto_id'])
            )

        conn.commit()
        return venta_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def obtener_detalles_dashboard():
    conn = obtener_conexion()
    cursor = conn.cursor()
    try: 
        cursor.execute("""
            SELECT 
                v.id AS id,
                dv.id AS "detalleId",
                TO_CHAR(v.fecha, 'DD/MM/YYYY') AS fecha,
                dv.producto_id AS "productoId",
                dv.cantidad AS cantidad,
                (dv.cantidad * dv.precio_unitario) AS subtotal,
                dv.precio_unitario AS "precioUnitario"
            FROM ventas v 
            JOIN detalle_ventas dv ON dv.venta_id = v.id 
            ORDER BY v.fecha, v.id, dv.id;
        """)
        filas = cursor.fetchall()
        return [{
            "id": v["id"],
            "detalleId": v["detalleId"],
            "fecha": v["fecha"],
            "productoId": v["productoId"],
            "cantidad": v["cantidad"],
            "subtotal": float(v["subtotal"]),
            "precioUnitario": float(v["precioUnitario"])
        } for v in filas]
    finally: 
        cursor.close()
        conn.close()