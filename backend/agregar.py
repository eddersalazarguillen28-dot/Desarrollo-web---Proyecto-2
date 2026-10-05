import sqlite3
# Conectar a la base de datos
conexion = sqlite3.connect('octo.db')
cursor = conexion.cursor()

# Pedir datos al usuario por consola 
print ("--- AGREGAR NUEVO PRODUCTO ---")
nombre = input ("Nombre del producto:")
precio = float (input("Precio:"))
stock = int(input("Cantidad en stock:"))

# Insertar el producto nuevo

cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)", (nombre, precio, stock))

# Guardar cambios y cerrar 
conexion.commit()
conexion.close()
print("¡Producto guardado exitosamente!")
