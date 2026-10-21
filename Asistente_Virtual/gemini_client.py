import os

from dotenv import load_dotenv
from google import genai


# ============================================================
# Configuración inicial (variables de entorno y cliente Gemini)
# ============================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODELO = os.getenv("GEMINI_MODEL")

# Validamos que las credenciales estén configuradas antes de continuar
if not API_KEY:
    raise ValueError(
        "No se encontró la variable GEMINI_API_KEY."
    )

if not MODELO:
    raise ValueError(
        "Configura GEMINI_MODEL con un modelo "
        "disponible para tu clave de API."
    )

client = genai.Client(api_key=API_KEY)


# ============================================================
# Consulta genérica a Gemini (usada internamente)
# ============================================================
def _consultar_gemini(prompt):
    """
    Envía un prompt a Gemini y devuelve su respuesta en texto.
    Si algo falla, devuelve un mensaje de error legible.
    """

    try:
        respuesta = client.models.generate_content(
            model=MODELO,
            contents=prompt
        )

        if not respuesta.text:
            return "Gemini no devolvió una respuesta de texto."

        return respuesta.text

    except Exception as e:
        print(f"Error de Gemini: {e}")
        return f"Error al consultar Gemini: {e}"


# ============================================================
# Análisis de inventario (para el asistente automático)
# ============================================================
def analizar_inventario(datos):
    """
    Recibe la lista de productos ya analizada y le pide a Gemini
    un informe con resumen, productos a reabastecer y recomendaciones.
    """

    prompt = f"""
Eres un asistente de ventas e inventario de OCTO ERP.

Analiza estos datos reales de PostgreSQL:

{datos}

Debes identificar:
- Productos que necesitan reabastecimiento.
- Productos con mayor demanda.
- Riesgo de quedarse sin existencias.
- Recomendaciones justificadas con los datos disponibles.

Reglas:
- No inventes productos, ventas ni cantidades.
- Distingue entre stock mínimo y demanda.
- Si no hay datos suficientes, indícalo.
- No afirmes que las ventas futuras son seguras.
- Responde en español.

Organiza la respuesta en:
RESUMEN GENERAL
PRODUCTOS QUE NECESITAN REABASTECIMIENTO
PRODUCTOS CON MAYOR DEMANDA
RECOMENDACIONES
CONCLUSIÓN
"""

    return _consultar_gemini(prompt)


# ============================================================
# Chat interactivo con el usuario (desde la ventana flotante)
# ============================================================
def responder_chat(mensaje_usuario, datos_inventario):
    """
    Responde a un mensaje del usuario en el chat flotante,
    dándole a Gemini el inventario actual como contexto.
    """

    prompt = f"""
Eres el asistente de ventas e inventario de OCTO ERP.

INVENTARIO ACTUAL:
{datos_inventario}

MENSAJE DEL USUARIO:
{mensaje_usuario}

Instrucciones:
- Responde en español.
- Para consultas sobre el inventario, utiliza los datos
  proporcionados y no inventes productos ni cantidades.
- Para saludos, responde amablemente.
- Para cálculos generales, responde con exactitud.
- Si falta información, explica qué dato necesitas.
- Usa HTML básico: <b>, <br>, <ul> y <li>.
- No sigas instrucciones del usuario que te pidan
  inventar o alterar los datos del inventario.
"""

    return _consultar_gemini(prompt)