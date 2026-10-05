import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

cursor.execute("SELECT * FROM clientes")
clientes = cursor.fetchall()

print("--- LISTA DE CLIENTES EN OCTO ERP ---")
if clientes: 
  for cliente in clientes:
    print(f"ID: {cliente[0]} | Nombre: {cliente[1]} | Correo: {cliente[2]} | Teléfono: {cliente[3]}")
else:
  print("No hay clientes registrados aún.")

conexion.close
