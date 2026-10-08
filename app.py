import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

def obtener_conexion():
    database_url = os.getenv('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

# Función para verificar y crear todas las tablas requeridas en PostgreSQL
def crear_tablas():
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # 1. Tabla de usuarios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            correo VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
        """)

        # 2. Tabla de productos
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS productos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            precio NUMERIC(10, 2) NOT NULL,
            stock INTEGER NOT NULL
        );
        """)

        # 3. Tabla de clientes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            correo VARCHAR(150) UNIQUE,
            telefono VARCHAR(50)
        );
        """)

        # 4. Tabla de ventas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ventas (
            id SERIAL PRIMARY KEY,
            cliente_id INTEGER NOT NULL,
            total NUMERIC(10, 2) NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        );
        """)

        # 5. Tabla de detalle_ventas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS detalle_ventas (
            id SERIAL PRIMARY KEY,
            venta_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            subtotal NUMERIC(10, 2) NOT NULL,
            FOREIGN KEY (venta_id) REFERENCES ventas(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );
        """)

        # Insertar productos de prueba iniciales si la tabla está vacía
        cursor.execute("SELECT COUNT(*) AS total FROM productos;")
        if cursor.fetchone()['total'] == 0:
            cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (%s, %s, %s)", ('Laptop HP', 335000.00, 10))
            cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (%s, %s, %s)", ('Mouse Inalambrico', 8000.00, 25))
            cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (%s, %s, %s)", ('Teclado Mecanico', 23000.00, 8))

        conn.commit()
        cursor.close()
        conn.close()
        print("Estructura de la base de datos verificada y creada correctamente.")
    except Exception as e:
        print("Error al inicializar la base de datos:", e)

# Ejecutamos la creación de estructura al arrancar el servidor
crear_tablas()

@app.route('/api/registro', methods=['POST'])
def registro():
    datos = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        query = "INSERT INTO usuarios (nombre, correo, password) VALUES (%s, %s, %s) RETURNING id;"
        cursor.execute(query, (datos['nombre'], datos['correo'], datos['password']))
        usuario_id = cursor.fetchone()['id']
        conn.commit()
        return jsonify({"status": "ok", "usuario_id": usuario_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)})
    finally:
        cursor.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    datos = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        query = "SELECT id, nombre, correo FROM usuarios WHERE correo = %s AND password = %s;"
        cursor.execute(query, (datos['correo'], datos['password']))
        usuario = cursor.fetchone()
        if usuario:
            return jsonify({"status": "ok", "usuario": usuario})
        return jsonify({"status": "error", "message": "Credenciales incorrectas"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
    finally:
        cursor.close()
        conn.close()

@app.route('/api/dashboard', methods=['GET'])
def obtener_dashboard():
    conn = None
    cursor = None

    try:
        conn = obtener_conexion()
        cursor = conn.cursor()

        cursor.execute("""SELECT id, nombre, precio, stock
        FROM productos
        ORDER BY id
        """)

        productos = []

        for p in cursor.fetchall():
            productos.append({
                "id": p["id"],
                "nombre": p["nombre"],
                "precio": float(p["precio"]),
                "stock": p["stock"],
                "stockMinimo": 5
            })

        cursor.execute("""
            SELECT
                v.id,
                TO_CHAR(v.fecha, 'DD/MM/YYYY)
                AS fecha,
                dv.producto_id AS producto_id,
                dv.cantidad, 
                dv.subtotal FROM ventas v INNER JOIN detalle_ventas dv ON v.id = dv.venta_id 
                ORDER BY v.fecha DESC, v.id DESC
            """)

        ventas = []

        for v in cursor.fetchall():
            cantidad = int(v["cantidad"])
            subtotal = float(v["subtotal"])

            ventas.append({
                "id": v["id"],
                "fecha": v["fecha"],
                "productoId": v["producto_id"],
                "cantidad": cantidad,
                "precioUnitario": subtotal / cantidad
                if cantidad > 0 else 0, "subtotal": subtotal
            })

            return jsonify({
                "productos": productos,
                "ventas": ventas
            })

    except Exception:
        app.logger.exception("Error al consultar dashboard")
        return jsonify({
            "error": "No se pudieron cargar los datos"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
        