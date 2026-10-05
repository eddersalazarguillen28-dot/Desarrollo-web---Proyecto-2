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
cursor.execute(''' 
    CREATE TABLE IF NOT EXISTS clientes ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nombre TEXT NOT NULL,
        correo TEXT UNIQUE, 
        telefono TEXT
    )
''')

# Crear tabla de ventas 
cursor.execute('''
    CREATE TABLE IF NOT EXISTS ventas ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        cliente_id INTEGER NOT NULL, 
        total REAL NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) 
    )
''')

# Crear tabla de detalle de ventas
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

# Insertar productos de prueba si la tabla esta vacia
cursor.execute("SELECT COUNT(*) FROM productos")
if cursor.fetchone()[0] == 0:
    cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES ('Laptop HP', 650.00, 10)")
    cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES ('Mouse Inalambrico', 15.50, 25)")
    cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES ('Teclado Mecanico', 45.00, 8)")

# Guardar cambios y cerrar conexion
conexion.commit()
conexion.close()

print("Base de datos de OCTO ERP creada correctamente")
