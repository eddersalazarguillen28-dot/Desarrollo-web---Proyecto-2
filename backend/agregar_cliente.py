import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- AGREGAR NUEVO CLIENTE EN OCTO ERP---")
Nombre = input("Ingresa el nombre completo del cliente:")
correo = input ("Ingresa el correo electrónico:")
telefono= input ("Ingresa el número de teléfono:")

try:
    cursor.execute(
        "INSERT INTO clientes (nombre, correo, telefono) VALUES (?, ?, ?)",
        (nombre, correo, telefono)
    )

conexion.commit()
print("¡Cliente registrado correctamente!")
except sqlite3.IntegrityError:
print("Error: El correo electrónico ya está registrado con otro cliente.")
 conexion.close()
