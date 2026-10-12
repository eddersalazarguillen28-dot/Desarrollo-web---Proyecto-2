import db_manager as db

print("--- ACTUALIZAR PRODUCTO EN OCTO ERP ---")

try:
    producto_id = int(input("ID del producto: "))
    nuevo_nombre = input("Nuevo nombre del producto: ").strip()
    nuevo_precio = float(input("Nuevo precio: "))
    nuevo_stock = int(input("Nuevo stock: "))
    nuevo_stock_minimo = int(input("Nuevo stock mínimo: "))

    actualizado = db.actualizar_producto(
        producto_id=producto_id,
        nombre=nuevo_nombre,
        precio=nuevo_precio,
        stock=nuevo_stock,
        stock_minimo=nuevo_stock_minimo
    )

    if actualizado:
        print(f"Producto con ID {producto_id} actualizado con éxito.")
    else:
        print(f"No existe un producto con ID {producto_id}.")

except ValueError as e:
    print(f"Error en los datos ingresados: {e}")
except Exception as e:
    print(f"Error al actualizar el producto: {e}")