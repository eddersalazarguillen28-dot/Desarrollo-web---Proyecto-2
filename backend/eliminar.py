import db_manager as db

import db_manager as db

print("--- ELIMINAR PRODUCTO ---")
p_id = int(input("ID del producto a eliminar: "))
db.eliminar_producto(p_id)
print(" Producto eliminado.")