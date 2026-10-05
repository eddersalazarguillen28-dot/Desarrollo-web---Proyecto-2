import sqlite3
import os

# Definir la ruta exacta de la base de datos dentro de backend/
DB_PATH = os.path.join('backend', 'octo.db')

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- AGREGAR NUEVO PRODUCTO EN OCTO ERP ---")
nombre = input("Ingresa el nombre del producto: ")
precio = float(input("Ingresa el precio en colones (₡): "))
stock = int(input("Ingresa la cantidad en stock: "))

# Insertar el nuevo producto en la tabla
cursor.execute(
    "INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)",
    (nombre, precio, stock)
)

conexion.commit()
conexion.close()

print("¡Producto agregado correctamente!")
