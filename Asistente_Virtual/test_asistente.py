from asistente import cargar_datos, analizar_pruductos
from interfaz import recomendar_rebastecimiento

def test_analisis_local():
    datos = cargar_datos()
    analisis = analizar_pruductos(datos)

    print(f"Total productos: {analisis['total_productos']}")
    print(f"Con alerta: {analisis['con_alerta']}\n")

    for p in analisis["productos"]:
        sena = "x" if p["alerta_stock"] else "...."
        print(f"{sena}{p['nombre']:20} stock={p['stock_actual']:>3}"
              f"min{p['stock_minimo']:>3} rotacion={p['rotacion']}")

def test_recomendacion_completa():
    #llama a gemini
    datos = cargar_datos()
    resultado = recomendar_rebastecimiento(datos)

    print("\n" + "=" * 60)
    print("Recomendacion del asistente")
    print("=" * 60 + "\n")
    print(f"\n Productos con alerta: {resultado['productos_alerta']}")

if __name__ == "__main__":
    print("T1: Analisi local\n")
    test_analisis_local()
    print("\n T2: Recomendacion completa\n")
    test_recomendacion_completa()
