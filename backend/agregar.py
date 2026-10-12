import db_manager as db

print("--- AGREGAR PRODUCTO EN OCTO ERP ---")

try:
    nombre = input("Nombre: ").strip()
    precio = float(input("Precio: "))
    stock = int(input("Stock: "))
    categoria = input("Categoría (Enter para General): ").strip()
    stock_minimo_texto = input("Stock mínimo (Enter para 5): ").strip()

    if not nombre:
        raise ValueError("El nombre del producto es obligatorio.")

    if not categoria:
        categoria = "General"

    stock_minimo = (
        int(stock_minimo_texto)
        if stock_minimo_texto
        else 5
    )

    prod_id = db.agregar_producto(
        nombre=nombre,
        precio=precio,
        stock=stock,
        categoria=categoria,
        stock_minimo=stock_minimo
    )

    if prod_id is not None:
        print(f"Producto agregado con ID: {prod_id}")
    else:
        print("No se pudo agregar el producto.")

except ValueError as e:
    print(f"Error en los datos ingresados: {e}")
except Exception as e:
    print(f"Error al agregar el producto: {e}")