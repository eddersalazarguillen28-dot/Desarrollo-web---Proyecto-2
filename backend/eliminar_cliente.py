import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

conexion= sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- ELIMINAR CLIENTE EN OCTO ERP ---")
cliente_id = int(int(input("Ingresa el ID del cliente a eliminar.")))

confirmacion = input(f"¿Estás seguro de que deseas eliminar al cliente ID {cliente_id}? (s/n): ")

if confirmacion.lower() == 's':
    cursor.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))
    conexion.commit()
    print("¡Cliente eliminado correctamente!")
else:
    print("Operación cancelada.")

conexion.close()
