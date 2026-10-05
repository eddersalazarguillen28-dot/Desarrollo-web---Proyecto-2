Import sqlite3
Import os

#Definir la ruta exacta de la base de datos dentro de backend/

DB_PATH = os.path.join('backend', 'octo.db')
conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- ELIMINAR PRODUCTO EN OCTO ERP ---")
producto_id=int(input("Ingresa el ID del producto a eliminar:"))

#Confirmación previa para eliminar accidentalmente
confirmacion=input(f"¿Estás seguro de que deseas eliminar el producto ID {producto_id}? (s/n): ")

if confirmacion.lower() == 's':
    cursor.execute("DELETE FROM productos WHERE id = ?", (producto_id,))
  conexion.commit()
print("¡Producto eliminado correctamente!")
else:
print("Operación cancelada.")
conexion.close()
