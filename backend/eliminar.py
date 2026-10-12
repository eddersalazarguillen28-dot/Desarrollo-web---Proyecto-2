import db_manager as db

print("--- ELIMINAR PRODUCTO EN OCTO ERP ---")

try:
    p_id = int(input("ID del producto a eliminar: "))

    if p_id <= 0:
        raise ValueError("El ID debe ser un número positivo.")

    confirmacion = input(
        f"¿Estás seguro de que deseas eliminar el producto "
        f"ID {p_id}? (s/n): "
    ).strip().lower()

    if confirmacion == "s":
        eliminado = db.eliminar_producto(p_id)

        if eliminado:
            print(f"Producto con ID {p_id} eliminado correctamente.")
        else:
            print(f"No existe un producto con ID {p_id}.")

    else:
        print("Operación cancelada.")

except ValueError as e:
    print(f"Error en los datos ingresados: {e}")

except Exception as e:
    print(f"Error al eliminar el producto: {e}")