import db_manager as db

print("--- ELIMINAR CLIENTE EN OCTO ERP ---")

try:
    cliente_id = int(input("Ingresa el ID del cliente a eliminar: "))

    if cliente_id <= 0:
        raise ValueError("El ID debe ser un número positivo.")

    confirmacion = input(
        f"¿Estás seguro de que deseas eliminar al cliente "
        f"ID {cliente_id}? (s/n): "
    ).strip().lower()

    if confirmacion == "s":
        eliminado = db.eliminar_cliente(cliente_id)

        if eliminado:
            print("¡Cliente eliminado correctamente!")
        else:
            print(f"No existe un cliente con ID {cliente_id}.")

    else:
        print("Operación cancelada.")

except ValueError as e:
    print(f"Error en los datos ingresados: {e}")

except Exception as e:
    print(f"Error al eliminar el cliente: {e}")