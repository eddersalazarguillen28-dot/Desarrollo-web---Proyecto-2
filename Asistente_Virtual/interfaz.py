from flask import Flask, request, jsonify
from flask_cors import CORS

from db_reader import obtener_datos_ia
from asistente import analizar_productos
from gemini_client import responder_chat


# ============================================================
# Configuración de la app Flask
# ============================================================

app = Flask(__name__)

# Permitimos CORS solo en /chat para que el frontend pueda llamarlo
CORS(app, resources={r"/chat": {"origins": "*"}})


# ============================================================
# Endpoint del chat del asistente
# ============================================================
@app.route("/chat", methods=["POST"])
def chat():
    """
    Recibe un mensaje del usuario, arma el contexto con el inventario
    actual + su análisis, y devuelve la respuesta de Gemini.
    """

    # ---------- 1. Validar que el cuerpo sea JSON válido ----------
    datos_peticion = request.get_json(silent=True)

    if not isinstance(datos_peticion, dict):
        return jsonify({
            "respuesta": "La solicitud debe contener JSON válido."
        }), 400

    # ---------- 2. Validar el mensaje del usuario ----------
    mensaje_usuario = datos_peticion.get("mensaje", "")

    if not isinstance(mensaje_usuario, str) or not mensaje_usuario.strip():
        return jsonify({
            "respuesta": "Escribe una pregunta para el asistente."
        }), 400

    # ---------- 3. Obtener los datos actuales de PostgreSQL ----------
    productos_crudos = obtener_datos_ia()

    if not productos_crudos:
        return jsonify({
            "respuesta": (
                "No hay productos disponibles para analizar. "
                "Verifica la conexión con PostgreSQL y que "
                "existan productos registrados."
            )
        }), 503

    try:
        # ---------- 4. Analizar el inventario ----------
        analisis = analizar_productos(productos_crudos)

        # ---------- 5. Armar el contexto que verá Gemini ----------
        contexto = {
            "inventario_actual": productos_crudos,
            "analisis_inventario": analisis
        }

        # ---------- 6. Consultar a Gemini ----------
        respuesta_ia = responder_chat(
            mensaje_usuario.strip(),
            contexto
        )
    
        if not respuesta_ia:
            return jsonify({
                "respuesta": "El asistente no generó una respuesta."
            }), 502

        # ---------- 7. Devolver la respuesta al frontend ----------
        return jsonify({
            "respuesta": respuesta_ia
        }), 200

    except Exception as e:
        # Registramos el error completo en el log del servidor
        app.logger.exception("Error procesando el chat")

        return jsonify({
            "respuesta": (
                "Ocurrió un error al procesar la consulta. "
                "Revisa los registros del servidor."
            )
        }), 500


# ============================================================
# Punto de entrada
# ============================================================
if __name__ == "__main__":
    app.run(debug=False)