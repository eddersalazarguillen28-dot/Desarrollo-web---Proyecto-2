import sqlite3
# Conectar a la base de datos de OCTO ERP
conexion = sqlite3.connect('octo.db')
cursor = conexion.cursor()

#Obtener todos los productos de la tabla 
cursor.execute("SELECT * FROM productos")
productos = cursor.fetchall()
# Mostrar cada producto en la pantalla
print ("--- LISTA DE PRODUCTOS EN OCTO ERP ---")
for producto in productos:
  print(f"ID: {producto[0]} | Nombre: {producto[1]} | Precio: ₡{producto[2]} | Stock: {producto[3]}")
# Cerrar conexion
conexion.close()
