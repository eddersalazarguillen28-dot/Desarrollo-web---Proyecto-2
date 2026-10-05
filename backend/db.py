import sqlite3

# Crear la conexion a la base de datos de OCTO ERP
conexion = sqlite3.connect('octo.db')
cursor = conexion.cursor()

# Crear tabla de productos para el inventario
cursor.execute('''
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL
    )
''')
# Crear tabla de clientes
cursor.execute (''' CREATE TABLE IF NOT EXISTS clientes( id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT UNIQUE, telefono TEXT)''')

# Guardar cambios y cerrar conexion
conexion.commit()
conexion.close()

print("Base de datos de OCTO ERP creada correctamente")

