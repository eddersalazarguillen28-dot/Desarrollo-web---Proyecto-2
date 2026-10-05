import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')
conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- ACTUALIZAR CLIENTE EN OCTO ERP ---")

cliente_id = int(input("Ingresa el ID del cliente a modificar."))
nuevo_nombre= input("Ingresa el nombre del cliente:")
nuevo_correo = input("Ingresa el nuevo correo electrónico:")
nuevo_telefono = input("Ingresa el nuevo número de teléfono:")

cursor.execute(
    "UPDATE clientes SET correo = ?, telefono = ? WHERE id = ?",
    (nuevo_correo, nuevo_telefono, cliente_id)
)

conexion.commit()
conexion.close()

print("¡Cliente actualizado correctamente!")
