import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

cursor.execute("SELECT * FROM productos")
productos = cursor.fetchall()

print("--- LISTA DE PRODUCTOS EN OCTO ERP ---")
for producto in productos:
    print(f"ID: {producto[0]} | Nombre: {producto[1]} | Precio: ₡{producto[2]:,.2f} | Stock: {producto[3]}")

conexion.close()
