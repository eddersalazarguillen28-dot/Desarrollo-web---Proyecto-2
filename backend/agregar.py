import db_manager as db

print("--- AGREGAR PRODUCTO ---")
nombre = input("Nombre: ")
precio = float(input("Precio: "))
stock = int(input("Stock: "))

prod_id = db.agregar_producto(nombre, precio, stock)
print(f"✅ Producto agregado con ID: {prod_id}")