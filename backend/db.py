import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conexion = sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

cursor.execute('''
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL
    )
''')

cursor.execute(''' 
    CREATE TABLE IF NOT EXISTS clientes ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nombre TEXT NOT NULL,
        correo TEXT UNIQUE, 
        telefono TEXT
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS ventas ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        cliente_id INTEGER NOT NULL, 
        total REAL NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) 
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS detalle_ventas ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        venta_id INTEGER NOT NULL, 
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id), 
        FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
''')

cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES ('Laptop HP', 335000.00, 10)")
cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES ('Mouse Inalambrico', 8000.00, 25)")
cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES ('Teclado Mecanico', 23000.00, 8)")

conexion.commit()
conexion.close()

print("Base de datos de OCTO ERP creada exitosamente en colones (₡)")
