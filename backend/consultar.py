import db_manager as db

print("--- LISTA DE PRODUCTOS EN OCTO ERP ---")

try:
    productos = db.obtener_productos()

    if not productos:
        print("No hay productos registrados en la base de datos.")
    else:
        for producto in productos:
            precio = float(producto["precio"])

            print(
                f"ID: {producto['id']} | "
                f"Nombre: {producto['nombre']} | "
                f"Precio: ₡{precio:,.2f} | "
                f"Stock: {producto['stock']}"
            )

except Exception as e:
    print(f"Error al consultar los productos: {e}")