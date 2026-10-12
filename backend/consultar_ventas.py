import db_manager as db

print("--- CONSULTA DE PRODUCTOS EN OCTO ERP ---")

try:
    productos = db.obtener_productos()

    if not productos:
        print("No hay productos registrados.")
    else:
        for p in productos:
            precio = float(p["precio"])

            print(
                f"ID: {p['id']} | "
                f"Nombre: {p['nombre']} | "
                f"Precio: ₡{precio:,.2f} | "
                f"Stock: {p['stock']} | "
                f"Stock mínimo: {p.get('stock_minimo', 5)}"
            )

except Exception as e:
    print(f"Error al consultar los productos: {e}")