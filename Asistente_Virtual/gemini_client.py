import os
import google.generativeai as genai
from dotenv import load_dotenv

#carga variables
load_dotenv()

#configurar gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

#modelo
modelo = genai.GenerativeModel("gemini-3.8-flash")

#prueba
print("conectando..")
respuesta = modelo.generate_content("Eres un asistente de inventario. responde en una solo linea: ¿que debo de hacer si un producto tiene 0 unidades den stock?")

print("\n Respuesta de aistente: ")
print(respuesta.text)