
import db_manager as db

print("--- CONSULTA DE PRODUCTOS ---")
productos = db.obtener_productos()
for p in productos:
    print(f"ID: {p['id']} | Nombre: {p['nombre']} | Precio: ₡{p['precio']} | Stock: {p['stock']}")