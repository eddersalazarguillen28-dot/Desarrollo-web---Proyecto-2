import db_manager as db

print("--- AGREGAR CLIENTE ---")
nombre = input("Nombre: ")
correo = input("Correo: ")
telefono = input("Teléfono: ")

c_id = db.agregar_cliente(nombre, correo, telefono)
print(f"✅ Cliente agregado con ID: {c_id}")