import sqlite3
import os

# Definir la ruta de la base de datos
DB_PATH = os.path.join('backend', 'octo.db')

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- ACTUALIZAR PRODUCTO EN OCTO ERP ---")
producto_id = int(input("Ingresa el ID del producto a modificar: "))
nuevo_precio = float(input("Ingresa el nuevo precio en colones (₡): "))
nuevo_stock = int(input("Ingresa la nueva cantidad en stock: "))

# Actualizar el precio y el stock en la base de datos
cursor.execute(
    "UPDATE productos SET precio = ?, stock = ? WHERE id = ?",
    (nuevo_precio, nuevo_stock, producto_id)
)

conexion.commit()
conexion.close()

print("¡Producto actualizado correctamente!")
