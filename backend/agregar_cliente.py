import db_manager as db

print("--- AGREGAR CLIENTE EN OCTO ERP ---")

try:
    nombre = input("Nombre: ").strip()
    correo = input("Correo (opcional): ").strip()
    telefono = input("Teléfono (opcional): ").strip()

    if not nombre:
        raise ValueError("El nombre del cliente es obligatorio.")

    # Convertir campos opcionales vacíos en None
    correo = correo or None
    telefono = telefono or None

    c_id = db.agregar_cliente(
        nombre=nombre,
        correo=correo,
        telefono=telefono
    )

    if c_id is not None:
        print(f"Cliente agregado con ID: {c_id}")
    else:
        print("No se pudo agregar el cliente.")

except ValueError as e:
    print(f"Error en los datos ingresados: {e}")
except Exception as e:
    print(f"Error al agregar el cliente: {e}")