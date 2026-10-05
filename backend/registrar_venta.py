import sqlite3
import os

DB_PATH = os.path.join('backend', 'octo.db')

conexion= sqlite3.connect(DB_PATH)
cursor = conexion.cursor()

print("--- REGISTRAR NUEVA VENTA EN OCTO ERP ---")

#1. Seleccionar cliente
cursor.execute("SELECT ID, nombre FROM clientes")
clientes = cursor.fetall()

if not clientes:
  print("No hay clientes registrados. Por favor agrega un cliente primero.")
  conexion.close()
  exit()
  
print("\nClientes disponibles:")
for c in clientes:
  
    print(f"ID: {c[0]} | Nombre: {c[1]}")


cliente_id = int(input("\nIngresa el ID del cliente que realiza la compra: "))


# 2. Seleccionar producto
cursor.execute("SELECT id, nombre, precio, stock FROM productos")
productos = cursor.fetchall()

print("\nProductos disponibles:")
for p in productos:
    print(f"ID: {p[0]} | Nombre: {p[1]} | Precio: ₡{p[2]:,.2f} | Stock disponible: {p[3]}")

producto_id = int(input("\nIngresa el ID del producto a vender: "))
cantidad = int(input("Ingresa la cantidad a vender: "))

# 3. Validar stock y realizar transacción
cursor.execute("SELECT precio, stock FROM productos WHERE id = ?", (producto_id,))
producto = cursor.fetchone()

if not producto:
    print("Error: El ID del producto no existe.")
elif cantidad > producto[1]:

     print(f"Error: Stock insuficiente. Solo quedan {producto[1]} unidades disponibles.")
else:
    precio_unitario = producto[0]
    subtotal = precio_unitario * cantidad

  # Registrar la venta en la tabla principal
    cursor.execute("INSERT INTO ventas (cliente_id, total) VALUES (?, ?)", (cliente_id, subtotal))
    venta_id = cursor.lastrowid

    # Registrar el detalle
    cursor.execute(
        "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, subtotal) VALUES (?, ?, ?, ?)",
        (venta_id, producto_id, cantidad, subtotal)
    )


   # Descontar el stock del producto
    nuevo_stock = producto[1] - cantidad
    cursor.execute("UPDATE productos SET stock = ? WHERE id = ?", (nuevo_stock, producto_id))

  conexion.commit()
    print(f"\n¡Venta #{venta_id} realizada con éxito!")
    print(f"Total a cobrar: ₡{subtotal:,.2f}")

conexion.close()







