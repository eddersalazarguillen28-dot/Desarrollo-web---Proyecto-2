
from flask import Flask, request, jsonify
from flask_cors import CORS

from db_reader import obtener_datos_ia
from asistente import analizar_productos
from gemini_client import responder_chat

app = Flask(__name__)

CORS(app, resources={r"/chat": {"origins": "*"}})


@app.route("/chat", methods=["POST"])
def chat():
    datos_peticion = request.get_json(silent=True)

    if not isinstance(datos_peticion, dict):
        return jsonify({
            "respuesta": "La solicitud debe contener JSON válido."
        }), 400

    mensaje_usuario = datos_peticion.get("mensaje", "")

    if not isinstance(mensaje_usuario, str) or not mensaje_usuario.strip():
        return jsonify({
            "respuesta": "Escribe una pregunta para el asistente."
        }), 400

    # 1. Obtener los datos actuales de PostgreSQL
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
        # 2. Analizar el inventario
        analisis = analizar_productos(productos_crudos)

        # 3. Enviar a Gemini el inventario y su análisis
        contexto = {
            "inventario_actual": productos_crudos,
            "analisis_inventario": analisis
        }

        respuesta_ia = responder_chat(
            mensaje_usuario.strip(),
            contexto
        )

        if not respuesta_ia:
            return jsonify({
                "respuesta": "El asistente no generó una respuesta."
            }), 502

        # 4. Devolver la respuesta al frontend
        return jsonify({
            "respuesta": respuesta_ia
        }), 200

    except Exception as e:
        app.logger.exception("Error procesando el chat")
        return jsonify({
            "respuesta": (
                "Ocurrió un error al procesar la consulta. "
                "Revisa los registros del servidor."
            )
        }), 500


if __name__ == "__main__":
    app.run(debug=False)
