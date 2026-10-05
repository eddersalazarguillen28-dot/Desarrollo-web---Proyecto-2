import json
from gemini_client import consultar_gemini

#carga los datos de prueba para verificar valides
def cargar_datos(ruta="datos_prueba.json"):
    with open (ruta, "r", encoding="utf-8") as f:
        return json.load(f)
#recorre los datos 
def analizar_pruductos(datos):
    productos = datos["productos"]
    analisis = []

    for p in productos:
        falta = p["stock_minimo"] - p["stock_actual"]
        alerta = p["stock_actual"] < p["stock minimo"]

        #clasifica la rotaion de productos
        if p["vendidios_30d"] >= 8:
            rotacion = "alta"
        elif p["vendidios_30d"] >= 4:
            rotacion = "media"
        else:
            rotacion = "baja"

        analisis.append({
            **p,
            "falta para minimo": max(falta,0),
            "alerta_stock": alerta,
            "rotacion": rotacion,
        })
    return{
        "Fecha": datos["fecha_analisi"],
        "total_productos": len(productos),
        "con_alerta": sum(1 for a in analisis if a["alerta_stock"]),
        "productos": analisis
    }

def generar_promt(analisis):
    return f""" analiza este inventario y dime que restablecer  
    "Datos: {json.dumps(analisis, indent=2, ensure_ascii=False)} 
    Genera: una lista priorizada de productos a reastablecer usando:
    urgente(stock bajo + rotacion alta), pronto (stock bajo pero rotacion baja/media), ok (stock saludable)
    cantidad sugerida por producto (basada en ventas de 30 dias)
    accion concreta para el encargado de compras al final 
    """

def obtener_recomendacion(ruta_datos="datos_prueba.json"):
    datos = cargar_datos(ruta_datos)
    analisis =analizar_pruductos(datos)
    promt = generar_promt(analisis)
    return consultar_gemini(promt)

if __name__ == "_main_":
    print("=" * 60)
    print("asistente de reabastecimiento")
    print("="* 60 + "\n")
    print(obtener_recomendacion())

    