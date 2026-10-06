import db_manager as db

print("--- Consulta de clientes ---")

clientes = db.obtener_clientes()
for c in clientes:
    print(f"ID: {c['id']} | Nombre: {c['nombre']} | Correo: {c['correo']} | Teléfono: {c['telefono']}")
    