import db_manager as db

print("--- CONSULTA DE CLIENTES EN OCTO ERP ---")

try:
    clientes = db.obtener_clientes()

    if not clientes:
        print("No hay clientes registrados.")
    else:
        for c in clientes:
            print(
                f"ID: {c['id']} | "
                f"Nombre: {c['nombre']} | "
                f"Correo: {c.get('correo') or 'No registrado'} | "
                f"Teléfono: {c.get('telefono') or 'No registrado'}"
            )

except Exception as e:
    print(f"Error al consultar los clientes: {e}")