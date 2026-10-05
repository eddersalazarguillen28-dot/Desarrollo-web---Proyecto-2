import sqlite3

# Conectar a la base de datos dentro de backend/
conexion = sqlite3.connect('backend/octo.db')
cursor = conexion.cursor()
print ("--- ACTUALIZAR PRODUCTO EN OCTO ERP ---")
producto_id = int(input("Ingresa el ID del producto a modificar:"))
nuevo_precio = float(input("Ingresa el nuevo precio en colones(₡): "))
nuevo_stock = int (input("Ingresa la nueva cantidad en stock:"))

# Actualizar el precio y stock del producto seleccionado
cursor.execute (
  "UPDATE productos SET precio = ?, stock = ? WHERE id = ?", (nuevo_precio, nuevo_stock, producto_id)
)

# Guardar cambios y cerrar conexión 
conexion.commit()
conexion.close()

print("¡Producto actualizado correctamente!")

