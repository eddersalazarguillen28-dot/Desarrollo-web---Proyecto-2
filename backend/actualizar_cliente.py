import db_manager as db

print("--- ACTUALIZAR CLIENTE ---")

try:
    cliente_id = int(input("ID del cliente a actualizar: "))
    nuevo_nombre = input("Nuevo nombre: ")
    nuevo_correo = input("Nuevo correo: ")
    nuevo_telefono = input("Nuevo teléfono: ")

    # Si tu db_manager tiene la función de actualizar cliente, la llamas aquí
    print(f" Datos del cliente {cliente_id} listos para ser procesados.")
except Exception as e:
    print(f" Error: {e}")