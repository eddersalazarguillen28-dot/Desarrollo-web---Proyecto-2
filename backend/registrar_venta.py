import db_manager as db

print("--- REGISTRAR VENTA EN OCTO ERP ---")

try:
    # 1. Consultar clientes
    clientes = db.obtener_clientes()

    if not clientes:
        print("No hay clientes registrados. Registra un cliente primero.")
        raise SystemExit

    print("\n--- CLIENTES DISPONIBLES ---")
    for cliente in clientes:
        print(
            f"ID: {cliente['id']} | "
            f"Nombre: {cliente['nombre']}"
        )

    cliente_id = int(input("\nID del cliente: "))

    if not any(c["id"] == cliente_id for c in clientes):
        raise ValueError("El cliente seleccionado no existe.")

    # 2. Consultar productos
    productos = db.obtener_productos()

    if not productos:
        print("No hay productos registrados.")
        raise SystemExit

    print("\n--- PRODUCTOS DISPONIBLES ---")
    for producto in productos:
        print(
            f"ID: {producto['id']} | "
            f"Nombre: {producto['nombre']} | "
            f"Precio: ₡{float(producto['precio']):,.2f} | "
            f"Stock: {producto['stock']}"
        )

    # 3. Agregar productos a la venta
    detalles = []

    while True:
        producto_id_texto = input(
            "\nID del producto (Enter para terminar): "
        ).strip()

        if not producto_id_texto:
            break

        producto_id = int(producto_id_texto)

        producto = next(
            (p for p in productos if p["id"] == producto_id),
            None
        )

        if producto is None:
            print("El producto no existe.")
            continue

        if producto["stock"] <= 0:
            print("Este producto no tiene existencias.")
            continue

        cantidad = int(input("Cantidad: "))

        if cantidad <= 0:
            print("La cantidad debe ser mayor que cero.")
            continue

        # Sumar las cantidades si el producto ya fue agregado
        cantidad_actual = sum(
            d["cantidad"]
            for d in detalles
            if d["producto_id"] == producto_id
        )

        if cantidad_actual + cantidad > producto["stock"]:
            print(
                f"Stock insuficiente. Disponible: "
                f"{producto['stock'] - cantidad_actual}"
            )
            continue

        precio_unitario = float(producto["precio"])

        detalles.append({
            "producto_id": producto_id,
            "cantidad": cantidad,
            "precio_unitario": precio_unitario
        })

        print(
            f"Agregado: {producto['nombre']} x {cantidad}"
        )

    if not detalles:
        print("Venta cancelada: no agregaste productos.")
        raise SystemExit

    # 4. Mostrar resumen
    total = sum(
        d["cantidad"] * d["precio_unitario"]
        for d in detalles
    )

    print("\n--- RESUMEN DE LA VENTA ---")

    for detalle in detalles:
        producto = next(
            p for p in productos
            if p["id"] == detalle["producto_id"]
        )

        subtotal = (
            detalle["cantidad"] * detalle["precio_unitario"]
        )

        print(
            f"{producto['nombre']} | "
            f"Cantidad: {detalle['cantidad']} | "
            f"Subtotal: ₡{subtotal:,.2f}"
        )

    print(f"\nTOTAL: ₡{total:,.2f}")

    confirmacion = input(
        "¿Confirmar y registrar la venta? (s/n): "
    ).strip().lower()

    if confirmacion == "s":
        venta_id = db.registrar_venta(
            cliente_id=cliente_id,
            detalles=detalles
        )

        if venta_id:
            print(f"\nVenta registrada correctamente. ID: {venta_id}")
        else:
            print("\nNo se pudo confirmar el registro de la venta.")
    else:
        print("Venta cancelada.")

except SystemExit:
    pass

except ValueError as e:
    print(f"\nError en los datos ingresados: {e}")

except Exception as e:
    print(f"\nError al registrar la venta: {e}")