from flask import Flask, request, jsonify
from flask_cors import CORS
from db_reader import obtener_datos_ia
from asistente import analizar_productos 
from gemini_client import responder_chat

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

@app.route('/chat', methods=['POST'])
def chat():
    datos_peticion = request.json
    mensaje_usuario = datos_peticion.get("mensaje", "")

    # 1. Obtener y analizar datos frescos de MariaDB
    productos_crudos = obtener_datos_ia()
    if not productos_crudos:
        return jsonify({"respuesta": "No pude conectar a la base de datos o está vacía."})

    analisis = analizar_productos(productos_crudos)

    # 2. Enviar mensaje a Gemini
    respuesta_ia = responder_chat(mensaje_usuario, analisis)

    return jsonify({"respuesta": respuesta_ia})

if __name__ == '__main__':
    app.run(debug=True)