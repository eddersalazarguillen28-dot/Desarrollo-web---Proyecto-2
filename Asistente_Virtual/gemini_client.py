import os
from dotenv import load_dotenv
from google import genai

# Carga variables
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError(
        "No se encontró GEMINI_API_KEY en el archivo .env"
    )

client = genai.Client(
    api_key=API_KEY
)
def analizar_inventario(datos):
    prompt = f"""
Eres un asistente inteligente de ventas e inventario
para un sistema ERP.

Analiza los siguientes datos reales obtenidos de una
base de datos empresarial:

{datos}

Tu objetivo es ayudar al encargado de inventario.

Analiza:
Qué productos necesitan reabastecimiento.
Cuáles tienen mayor demanda.
Cuáles tienen riesgo de quedarse sin inventario.
La cantidad recomendada de reabastecimiento.
Explica brevemente por qué recomiendas cada acción.

IMPORTANTE:
No inventes productos.
No inventes cantidades.
Utiliza únicamente los datos proporcionados.
Si un producto tiene stock suficiente, indícalo.
Responde en español.
Utiliza un lenguaje profesional pero fácil de entender.

Organiza la respuesta de esta manera:
RESUMEN GENERAL
PRODUCTOS QUE NECESITAN REABASTECIMIENTO
PRODUCTOS CON MAYOR DEMANDA
RECOMENDACIONES
CONCLUSIÓN
"""
    try:
        chat = client.chats.create(model="gemini-3.8-flash")
        respuesta = chat.send_message(prompt)
        return respuesta.text

    except Exception as e:
        return f" Error al consultar Gemini: {e}"

def responder_chat(mensaje_usuario, datos_inventario):
    prompt = f"""
Eres un asistente inteligente de ventas e inventario para el ERP Octo.
Aquí tienes los datos actuales del inventario y su análisis:

{datos_inventario}

El usuario (encargado de inventario) te ha dicho/preguntado lo siguiente:
"{mensaje_usuario}"

REGLAS DE RESPUESTA:
Consultas de inventario/productos: Utiliza ÚNICAMENTE los datos proporcionados arriba. No inventes productos ni cantidades.
Preguntas generales o cálculos (ej. matemáticas): Responde la pregunta con normalidad, exactitud y amabilidad. Puedes funcionar como calculadora para el usuario.
Saludos y cortesía: Devuelve el saludo amablemente y ofrécete a ayudar con el sistema.
Formato CRÍTICO: Utiliza formato HTML básico (<b> para negritas, <br> para saltos de línea, <ul><li> para listas). No uses Markdown (**). Responde en español y de forma profesional.
"""
    try:
        chat = client.chats.create(model="gemini-3.8-flash")
        respuesta = chat.send_message(prompt)
        return respuesta.text
        
    except Exception as e:
        return f"Error al consultar Gemini: {e}"