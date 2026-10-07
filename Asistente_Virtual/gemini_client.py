import os
from dotenv import load_dotenv
from google import genai

#carga variables
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

        respuesta = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt
        )

        return respuesta.text

    except Exception as e:

        return f" Error al consultar Gemini: {e}"