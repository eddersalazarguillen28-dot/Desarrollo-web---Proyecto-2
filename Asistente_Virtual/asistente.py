import os
from db_reader import obtener_datos_ia
from gemini_client import analizar_inventario
from database import inicializar_esquema

def analizar_productos(productos):

    resultados = []

    for producto in productos:

        stock_actual = int(producto["stock_actual"] or 0)
        stock_minimo = int(producto["stock_minimo"] or 0)
        vendidos_30d = int(producto["vendidos_30d"] or 0)

        # Promedio de ventas por día
        promedio_diario = vendidos_30d / 30

        # Demanda estimada para los próximos 30 días
        demanda_30_dias = promedio_diario * 30

        # Determinar si necesita reabastecimiento
        necesita_reabastecimiento = (
            stock_actual <= stock_minimo
            or stock_actual < demanda_30_dias
        )

        # Cantidad recomendada
        if necesita_reabastecimiento:

            cantidad_recomendada = max(
                0,
                round(
                    demanda_30_dias
                    + stock_minimo
                    - stock_actual
                )
            )

        else:

            cantidad_recomendada = 0

        resultados.append({
            "producto_id": producto["producto_id"],
            "nombre": producto["nombre"],
            "stock_actual": stock_actual,
            "stock_minimo": stock_minimo,
            "vendidos_30d": vendidos_30d,
            "promedio_diario": round(promedio_diario, 2),
            "demanda_30_dias": round(demanda_30_dias, 2),
            "necesita_reabastecimiento": necesita_reabastecimiento,
            "cantidad_recomendada": cantidad_recomendada
        })

    return resultados

def ejecutar_asistente():

    print("\n====================================")
    print("      ASISTENTE INTELIGENTE")
    print("====================================\n")

    print("Verificando base de datos...")
    ruta_actual = os.path.dirname(os.path.abspath(__file__))
    ruta_esquema = os.path.join(ruta_actual, "schema.sql")
    inicializar_esquema(ruta_esquema)

    productos = obtener_datos_ia()

    if not productos:

        print(" No se encontraron datos en la base de datos.")
        return

    print(
        f" Se obtuvieron {len(productos)} productos.\n"
    )

    # 2. Analizar inventario
    analisis = analizar_productos(productos)

    print("========== ANÁLISIS ==========\n")

    for producto in analisis:

        print(f"Producto: {producto['nombre']}")
        print(f"Stock actual: {producto['stock_actual']}")
        print(f"Stock mínimo: {producto['stock_minimo']}")
        print(f"Ventas últimos 30 días: {producto['vendidos_30d']}")
        print(
            f"Promedio diario: "
            f"{producto['promedio_diario']}"
        )

        if producto["necesita_reabastecimiento"]:

            print(
                f"REABASTECER: "
                f"{producto['cantidad_recomendada']} unidades"
            )

        else:

            print(" Stock suficiente")

        print("--------------------------------")


    # 3. Enviar análisis a Gemini
    print("\nConsultando Gemini...\n")

    recomendacion = analizar_inventario(analisis)

    print("========== RECOMENDACIÓN DE IA ==========\n")

    print(recomendacion)

if __name__ == "__main__":
    ejecutar_asistente()