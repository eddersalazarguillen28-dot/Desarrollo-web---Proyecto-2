import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

# Consulta uniendo la tabla de ventas con la de clientes (JOIN)
cursor.execute('''
    SELECT v.id, c.nombre, v.total, v.fecha 
    FROM ventas v
    JOIN clientes c ON v.cliente_id = c.id
''')

ventas = cursor.fetchall()
print("--- HISTORIAL DE VENTAS EN OCTO ERP ---")
if ventas:
    for v in ventas:
        print(f"Venta #{v[0]} | Cliente: {v[1]} | Total: ₡{v[2]:,.2f} | Fecha: {v[3]}")
      else:
    print("No se han registrado ventas aún.")

conexion.close()
