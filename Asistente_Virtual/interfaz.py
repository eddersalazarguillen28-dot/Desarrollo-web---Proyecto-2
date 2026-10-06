from asistente import analizar_pruductos, generar_promt
from gemini_client import consultar_gemini

def recomendar_rebastecimiento(datos_inventario: dict)->dict:
    analisis = analizar_pruductos(datos_inventario)
    promt = generar_promt(analisis)
    text = consultar_gemini(promt)

    return{
        "recomendacion": text,
        "total_productos": analisis["total_productos"],
        "productos_alerta": analisis["con_alaerta"], 
        "fecha_analisis": analisis["fecha"]
    }

def pregubtar_libre(pregunta: str, datos_inventario: dict = None)->str:
    if datos_inventario:
        contexto = f"\n\nContexto del inventario:\n{datos_inventario}"
        return consultar_gemini(pregunta + contexto)
    return consultar_gemini(pregunta)