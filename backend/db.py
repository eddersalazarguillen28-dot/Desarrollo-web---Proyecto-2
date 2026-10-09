import os
import psycopg2

# Obtener la URL de conexión de Render
DATABASE_URL = os.getenv('DATABASE_URL')

def inicializar_bd():
    if not DATABASE_URL:
        print("Error: No se encontró la variable DATABASE_URL.")
        return

    try:
        conexion = psycopg2.connect(DATABASE_URL)
        cursor = conexion.cursor()

        # En PostgreSQL no borramos un archivo local. Si deseas reiniciar las tablas,
        # puedes usar DROP TABLE IF EXISTS (Opcional):
        # cursor.execute("DROP TABLE IF EXISTS detalle_ventas, ventas, clientes, productos CASCADE;")

        # Crear tabla productos
        cursor.execute('''
                 CREATE TABLE IF NOT EXISTS productos (
                     id SERIAL PRIMARY KEY,
                     nombre VARCHAR(150) NOT NULL,
                     precio NUMERIC(10, 2) NOT NULL,
                     stock INTEGER NOT NULL
                 );
             ''')

        # Crear tabla clientes
        cursor.execute(''' 
            CREATE TABLE IF NOT EXISTS clientes ( 
                id SERIAL PRIMARY KEY, 
                nombre VARCHAR(150) NOT NULL,
                correo VARCHAR(150) UNIQUE, 
                telefono VARCHAR(50)
            );
        ''')

        # Crear tabla ventas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ventas ( 
                id SERIAL PRIMARY KEY, 
                cliente_id INTEGER NOT NULL, 
                total NUMERIC(10, 2) NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) 
            );
        ''')

        # Crear tabla detalle_ventas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS detalle_ventas ( 
                id SERIAL PRIMARY KEY, 
                venta_id INTEGER NOT NULL, 
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                subtotal NUMERIC(10, 2) NOT NULL,
                FOREIGN KEY (venta_id) REFERENCES ventas(id), 
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            );
        ''')

        # Insertar datos iniciales solo si la tabla está vacía
        cursor.execute("SELECT COUNT(*) FROM productos;")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (%s, %s, %s)", ('Laptop HP', 335000.00, 10))
            cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (%s, %s, %s)", ('Mouse Inalambrico', 8000.00, 25))
            cursor.execute("INSERT INTO productos (nombre, precio, stock) VALUES (%s, %s, %s)", ('Teclado Mecanico', 23000.00, 8))

        conexion.commit()
        cursor.close()
        conexion.close()

        print("Base de datos PostgreSQL de OCTO ERP inicializada exitosamente.")

    except Exception as e:
        print(f"Error al conectar o crear las tablas: {e}")

if __name__ == '__main__':
    inicializar_bd()