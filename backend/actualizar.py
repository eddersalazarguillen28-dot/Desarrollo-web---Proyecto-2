import db_manager as db
print("--- ACTUALIZAR PRODUCTO EN OCTO ERP---")
producto_id = int(input("ID del producto:"))
nuevo_precio = float(input("Nuevo precio:"))
nuevo_stock = int(input("Nuevo stock:"))

db.actualizar_producto(producto_id, nuevo_precio, nuevo_stock)
print(f"✅ Producto con ID {producto_id} actualizado con éxito.")