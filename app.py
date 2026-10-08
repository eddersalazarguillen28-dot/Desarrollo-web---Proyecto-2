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

        # 5. Insertar usuario de prueba si no existe alguno
        cursor.execute("SELECT COUNT(*) AS total FROM usuarios;")
        if cursor.fetchone()['total'] == 0:
            cursor.execute(
                "INSERT INTO usuarios (nombre, correo, password) VALUES (%s, %s, %s);",
                ('Usuario Demo', 'admin@octo.com', '12345678')
            )
            print("Usuario de prueba creado.")

        conn.commit()
        cursor.close()
        conn.close()
        print("Tablas y datos iniciales verificados correctamente.")
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

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)



@app.route('/api/dashboard', methods=['GET'])
def obtener_dashboard():
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        # Calcular total de ventas, cantidad de ventas e ingresos promedio
        query = """
        SELECT 
            COALESCE(SUM(total), 0) AS ventas_periodo,
            COUNT(id) AS cantidad_ventas,
            COALESCE(AVG(total), 0) AS ticket_promedio
        FROM ventas;
        """
        cursor.execute(query)
        resumen = cursor.fetchone()
        
        return jsonify({
            "status": "ok",
            "ventas_periodo": float(resumen['ventas_periodo']),
            "cantidad_ventas": int(resumen['cantidad_ventas']),
            "ticket_promedio": float(resumen['ticket_promedio'])
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
    finally:
        cursor.close()
        conn.close()

@app.route('/')
def inicio():
    return jsonify({
        "status": "ok",
        "message": "Servidor OCTO ERP corriendo correctamente en Render"
    })




# Insertar un usuario de prueba si la tabla está vacía
    cursor.execute("SELECT COUNT(*) AS total FROM usuarios;")
    if cursor.fetchone()['total'] == 0:
            cursor.execute(
                "INSERT INTO usuarios (nombre, correo, password) VALUES (%s, %s, %s);",
                ('Usuario Demo', 'admin@octo.com', '123456')
            )
            print("Usuario de prueba (admin@octo.com) creado exitosamente.")
            conn.commit()



@app.route('/api/crear-admin-forzado')
def crear_admin_forzado():
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Elimina si existía conflicto y lo crea limpio
        cursor.execute("DELETE FROM usuarios WHERE correo = 'admin@octo.com';")
        cursor.execute(
            "INSERT INTO usuarios (nombre, correo, password) VALUES (%s, %s, %s);",
            ('Usuario Demo', 'admin@octo.com', '123456')
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "ok", "message": "Usuario admin@octo.com creado exitosamente"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})




@app.route('/api/reset-admin')
def reset_admin():
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Borra el usuario si existía con datos incorrectos
        cursor.execute("DELETE FROM usuarios WHERE LOWER(correo) = 'admin@octo.com';")
        
        # Inserta el usuario de prueba limpio
        cursor.execute(
            "INSERT INTO usuarios (nombre, correo, password) VALUES (%s, %s, %s);",
            ('Usuario Demo', 'admin@octo.com', '123456')
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "ok", "message": "Usuario admin@octo.com listo con clave 123456"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})