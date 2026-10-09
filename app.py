import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai

# Importación directa desde la raíz del proyecto
from backend import db_manager as db

app = Flask(__name__)
CORS(app)

# Intentar inicializar PostgreSQL al arrancar
try:
    db.inicializar_bd()
    print("Base de datos inicializada correctamente al arrancar.")
except Exception as e:
    print("Aviso al inicializar base de datos:", e)

@app.route('/')
def inicio():
    return jsonify({
        "status": "ok",
        "message": "Servidor OCTO ERP corriendo correctamente en Render"
    })

# ==========================================
# RUTA DE INICIALIZACIÓN MANUAL
# ==========================================

@app.route('/api/init-db', methods=['POST', 'GET'])
def inicializar_bd_manual():
    try:
        db.inicializar_bd()
        return jsonify({"mensaje": "Base de datos inicializada y datos cargados con éxito"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# RUTAS DE AUTENTICACIÓN
# ==========================================

@app.route('/api/registro', methods=['POST'])
def registro():
    datos = request.get_json() or {}
    try:
        conn = db.obtener_conexion()
        cursor = conn.cursor()
        query = "INSERT INTO usuarios (nombre, correo, password) VALUES (%s, %s, %s) RETURNING id;"
        cursor.execute(query, (
            datos.get('nombre'), 
            datos.get('correo', '').strip().lower(), 
            datos.get('password')
        ))
        usuario_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "ok", "usuario_id": usuario_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    datos = request.get_json() or {}
    correo = datos.get('correo', '').strip().lower()
    password = datos.get('password', '').strip()

    try:
        conn = db.obtener_conexion()
        cursor = conn.cursor()
        query = "SELECT id, nombre, correo, rol FROM usuarios WHERE LOWER(correo) = %s AND password = %s;"
        cursor.execute(query, (correo, password))
        usuario = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if usuario:
            return jsonify({"status": "ok", "usuario": usuario}), 200
        return jsonify({"status": "error", "message": "Credenciales incorrectas"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==========================================
# RUTAS DE PRODUCTOS (CRUD)
# ==========================================

@app.route('/api/productos', methods=['GET'])
def listar_productos():
    try:
        productos = db.obtener_productos()
        return jsonify({"status": "ok", "productos": productos}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/productos', methods=['POST'])
def crear_producto():
    datos = request.get_json() or {}
    try:
        # Acepta tanto stockMinimo como stock_minimo por compatibilidad
        s_min = datos.get('stockMinimo') if datos.get('stockMinimo') is not None else datos.get('stock_minimo', 5)

        p_id = db.agregar_producto(
            datos.get('nombre'),
            float(datos.get('precio', 0)),
            int(datos.get('stock', 0)),
            int(s_min)
        )
        return jsonify({"status": "ok", "producto_id": p_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/productos/<int:p_id>', methods=['DELETE'])
def borrar_producto(p_id):
    try:
        db.eliminar_producto(p_id)
        return jsonify({"status": "ok", "message": "Producto eliminado"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==========================================
# RUTAS DE DASHBOARD Y VENTAS
# ==========================================

@app.route('/api/dashboard', methods=['GET'])
def obtener_dashboard():
    try:
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()
        return jsonify({
            "productos": productos if productos else [],
            "ventas": ventas if ventas else []
        }), 200
    except Exception as e:
        app.logger.exception("Error al consultar el dashboard")
        return jsonify({"error": f"No se pudieron consultar los datos: {str(e)}"}), 500

@app.route('/api/ventas', methods=['POST'])
def crear_venta():
    datos = request.get_json() or {}
    try:
        venta_id = db.registrar_venta(
            cliente_id=datos.get('cliente_id'),
            detalles=datos.get('detalles', [])
        )
        return jsonify({"status": "ok", "venta_id": venta_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

# ==========================================
# RUTAS DEL ASISTENTE DE VENTAS (IA)
# ==========================================

@app.route('/chat', methods=['POST'])
def chat_asistente():
    datos = request.get_json() or {}
    mensaje_usuario = datos.get('mensaje', '').strip()

    if not mensaje_usuario:
        return jsonify({"respuesta": "Por favor ingresa una pregunta o consulta válida."}), 400

    try:
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()

        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            client = genai.Client(api_key=api_key)
            prompt_contexto = f"""
            Eres el Asistente Virtual Inteligente de OCTO ERP.
            Responde con la siguiente información actual del sistema:
            
            - INVENTARIO ACTUAL: {productos}
            - HISTORIAL RECIENTE DE VENTAS: {ventas}
            
            Pregunta del usuario: "{mensaje_usuario}"
            
            Reglas: Responde de forma concisa, profesional, clara y directa en español.
            """
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_contexto
            )
            return jsonify({"respuesta": response.text}), 200
        
        stock_bajo = [p['nombre'] for p in productos if p.get('stock', 0) <= p.get('stockMinimo', 0)]
        if "stock" in mensaje_usuario.lower() or "inventario" in mensaje_usuario.lower():
            if stock_bajo:
                respuesta = f"Actualmente tienes {len(stock_bajo)} producto(s) con stock bajo: {', '.join(stock_bajo)}."
            else:
                respuesta = "El inventario está en óptimas condiciones."
        else:
            respuesta = f"OCTO ERP conectado. Consulta procesada: '{mensaje_usuario}'."

        return jsonify({"respuesta": respuesta}), 200

    except Exception as e:
        return jsonify({"respuesta": f"Ocurrió un error al procesar tu solicitud: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)