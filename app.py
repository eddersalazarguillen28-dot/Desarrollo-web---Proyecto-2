import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(_name_)
CORS(app)

def obtener_conexion():
    # Render inyecta la variable DATABASE_URL automáticamente
    database_url = os.getenv('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

@app.route('/api/registro', methods=['POST'])
def registro():
    datos = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    try:
        # En PostgreSQL se usa 'RETURNING id' para obtener el ID recién insertado
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

if _name_ == '_main_':
    # En producción (Render), Gunicorn se encarga de arrancar la app.
    # Esta línea permite que siga funcionando si lo ejecutas de forma local.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
