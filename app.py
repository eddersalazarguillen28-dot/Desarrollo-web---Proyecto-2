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

# Esta función crea la tabla 'usuarios' automáticamente si no existe
def crear_tablas():
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        query = """
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            correo VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
        """
        cursor.execute(query)
        conn.commit()
        cursor.close()
        conn.close()
        print("Tabla 'usuarios' verificada/creada correctamente.")
    except Exception as e:
        print("Error creando la tabla:", e)

# Ejecutamos la función al iniciar la app
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
