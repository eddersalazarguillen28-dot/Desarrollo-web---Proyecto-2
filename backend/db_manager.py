import sqlite3
import os

# Ruta centralizada a la base de datos
DB_PATH = os.path.join('backend', 'octo.db')

def obtener_conexion():
    conexion = sqlite3.connect(DB_PATH)
    conexion.row_factory = sqlite3.Row  # Permite acceder a las columnas por nombre (ej: fila['nombre'])
    return conexion

# ==========================================
# MÓDULO PRODUCTOS (CRUD)
# ==========================================

def obtener_productos():
    conn = obtener_conexion()
    productos = conn.execute("SELECT * FROM productos").fetchall()
    conn.close()
    return [dict(p) for p in productos]

def agregar_producto(nombre, precio, stock):
    conn = obtener_conexion()
    conn.execute("INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)", (nombre, precio, stock))
    conn.commit()
    conn.close()

def actualizar_producto(producto_id, precio, stock):
    conn = obtener_conexion()
    conn.execute("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", (precio, stock, producto_id))
    conn.commit()
    conn.close()

def eliminar_producto(producto_id):
    conn = obtener_conexion()
    conn.execute("DELETE FROM productos WHERE id = ?", (producto_id,))
    conn.commit()
    conn.close()
# ==========================================
# MÓDULO CLIENTES (CRUD)
# ==========================================

def obtener_clientes():
    conn = obtener_conexion()
    clientes = conn.execute("SELECT * FROM clientes").fetchall()
    conn.close()
    return [dict(c) for c in clientes]

def agregar_cliente(nombre, correo, telefono):
    conn = obtener_conexion()
    conn.execute("INSERT INTO clientes (nombre, correo, telefono) VALUES (?, ?, ?)", (nombre, correo, telefono))
    conn.commit()
    conn.close()

def actualizar_cliente(cliente_id, correo, telefono):
    conn = obtener_conexion()
    conn.execute("UPDATE clientes SET correo = ?, telefono = ? WHERE id = ?", (correo, telefono, cliente_id))
    conn.commit()
    conn.close()

def eliminar_cliente(cliente_id):
    conn = obtener_conexion()
    conn.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))
    conn.commit()
    conn.close()
# ==========================================
# MÓDULO VENTAS Y FACTURACIÓN
# ==========================================

def registrar_venta(cliente_id, producto_id, cantidad):
    conn = obtener_conexion()
    cursor = conn.cursor()
    
    # Validar producto y stock
    producto = cursor.execute("SELECT precio, stock FROM productos WHERE id = ?", (producto_id,)).fetchone()
    if not producto or producto['stock'] < cantidad:
        conn.close()
        return False, "Stock insuficiente o producto no encontrado"

    subtotal = producto['precio'] * cantidad

    # Registrar en tabla ventas
    cursor.execute("INSERT INTO ventas (cliente_id, total) VALUES (?, ?)", (cliente_id, subtotal))
    venta_id = cursor.lastrowid
    
    # Registrar en tabla detalle_ventas
    cursor.execute(
        "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, subtotal) VALUES (?, ?, ?, ?)",
        (venta_id, producto_id, cantidad, subtotal)
    )

    # Actualizar stock en la tabla productos
    cursor.execute("UPDATE productos SET stock = stock - ? WHERE id = ?", (cantidad, producto_id))
    
    conn.commit()
    conn.close()
    return True, f"Venta #{venta_id} realizada con éxito"

def obtener_ventas():
    conn = obtener_conexion()
    ventas = conn.execute('''
        SELECT v.id, c.nombre AS cliente, v.total, v.fecha 
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
    ''').fetchall()
    conn.close()
    return [dict(v) for v in ventas]
