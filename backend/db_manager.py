import os
from decimal import Decimal, InvalidOperation

import psycopg2
from psycopg2.extras import RealDictCursor



# =========================================================
# CONEXIÓN A POSTGRESQL (RENDER)
# =========================================================

def obtener_conexion():
    """Conecta con PostgreSQL mediante DATABASE_URL."""
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "No se configuró la variable de entorno DATABASE_URL."
        )

    return psycopg2.connect(
        database_url,
        cursor_factory=RealDictCursor,
        connect_timeout=10
    )


# =========================================================
# INICIALIZACIÓN Y MIGRACIÓN DE LA BASE DE DATOS
# =========================================================

def inicializar_bd():
    """
    Crea las tablas necesarias y agrega columnas que falten.
    No borra tablas ni inserta datos de demostración.
    """
    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    correo VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    rol VARCHAR(50) NOT NULL DEFAULT 'vendedor'
                );
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS productos (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    precio NUMERIC(10, 2) NOT NULL
                        CHECK (precio >= 0),
                    stock INTEGER NOT NULL DEFAULT 0
                        CHECK (stock >= 0),
                    categoria VARCHAR(100) NOT NULL DEFAULT 'General',
                    stock_minimo INTEGER NOT NULL DEFAULT 5
                        CHECK (stock_minimo >= 0),
                    imagen_url TEXT,
                    ubicacion VARCHAR(50) DEFAULT 'productos',
                    precio_oferta NUMERIC(10, 2) CHECK (precio_oferta >= 0)
                );
            """)

            # Migraciones seguras para productos existentes.
            cursor.execute("""
                ALTER TABLE productos
                    ADD COLUMN IF NOT EXISTS categoria
                        VARCHAR(100) NOT NULL DEFAULT 'General',
                    ADD COLUMN IF NOT EXISTS stock_minimo
                        INTEGER NOT NULL DEFAULT 5,
                    ADD COLUMN IF NOT EXISTS imagen_url TEXT,
                    ADD COLUMN IF NOT EXISTS ubicacion
                        VARCHAR(50) DEFAULT 'productos',
                    ADD COLUMN IF NOT EXISTS precio_oferta
                        NUMERIC(10, 2);
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clientes (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    correo VARCHAR(150) UNIQUE,
                    telefono VARCHAR(50),
                    direccion VARCHAR(255),
                    estado VARCHAR(20) DEFAULT 'Activo'
                );
            """)

            cursor.execute("""
                ALTER TABLE clientes
                    ADD COLUMN IF NOT EXISTS direccion VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS estado VARCHAR(20)
                        DEFAULT 'Activo';
            """)

            cursor.execute("""
                ALTER TABLE usuarios
                    ADD COLUMN IF NOT EXISTS rol VARCHAR(50)
                        NOT NULL DEFAULT 'vendedor';
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ventas (
                    id SERIAL PRIMARY KEY,
                    cliente_id INTEGER
                        REFERENCES clientes(id) ON DELETE SET NULL,
                    total NUMERIC(10, 2) NOT NULL
                        CHECK (total >= 0),
                    fecha TIMESTAMP NOT NULL
                        DEFAULT CURRENT_TIMESTAMP
                );
            """)

            cursor.execute("""
                ALTER TABLE ventas
                    ALTER COLUMN cliente_id DROP NOT NULL;
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detalle_ventas (
                    id SERIAL PRIMARY KEY,
                    venta_id INTEGER NOT NULL
                        REFERENCES ventas(id) ON DELETE CASCADE,
                    producto_id INTEGER NOT NULL
                        REFERENCES productos(id) ON DELETE RESTRICT,
                    cantidad INTEGER NOT NULL
                        CHECK (cantidad > 0),
                    precio_unitario NUMERIC(10, 2),
                    subtotal NUMERIC(10, 2)
                );
            """)

            cursor.execute("""
                ALTER TABLE detalle_ventas
                    ADD COLUMN IF NOT EXISTS precio_unitario
                        NUMERIC(10, 2),
                    ADD COLUMN IF NOT EXISTS subtotal
                        NUMERIC(10, 2);
            """)

            # Completar precios históricos faltantes.
            cursor.execute("""
                UPDATE detalle_ventas AS dv
                SET precio_unitario = p.precio
                FROM productos AS p
                WHERE dv.producto_id = p.id
                  AND dv.precio_unitario IS NULL;
            """)

            cursor.execute("""
                UPDATE detalle_ventas
                SET subtotal = cantidad * precio_unitario
                WHERE subtotal IS NULL
                  AND precio_unitario IS NOT NULL;
            """)

            cursor.execute("""
                SELECT id
                FROM detalle_ventas
                WHERE precio_unitario IS NULL
                   OR subtotal IS NULL
                LIMIT 1;
            """)

            if cursor.fetchone():
                raise RuntimeError(
                    "Hay detalles de venta sin precio o subtotal. "
                    "Debes revisar esos registros antes de completar "
                    "la inicialización."
                )

            cursor.execute("""
                ALTER TABLE detalle_ventas
                    ALTER COLUMN precio_unitario SET NOT NULL,
                    ALTER COLUMN subtotal SET NOT NULL;
            """)

        conn.commit()
        print("Base de datos OCTO ERP preparada correctamente.")
        return True

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


# =========================================================
# VALIDACIONES
# =========================================================

def _validar_entero_positivo(valor, campo):
    if (
        isinstance(valor, bool)
        or not isinstance(valor, int)
        or valor <= 0
    ):
        raise ValueError(
            f"{campo} debe ser un entero mayor que cero."
        )

    return valor


def _validar_stock(valor, campo="stock"):
    if (
        isinstance(valor, bool)
        or not isinstance(valor, int)
        or valor < 0
    ):
        raise ValueError(
            f"{campo} debe ser un entero mayor o igual que cero."
        )

    return valor


def _validar_precio(valor, campo="precio"):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"{campo} no es válido.")

    if not numero.is_finite() or numero < 0:
        raise ValueError(
            f"{campo} debe ser un número válido no negativo."
        )

    if numero.as_tuple().exponent < -2:
        raise ValueError(
            f"{campo} admite como máximo dos decimales."
        )

    if numero >= Decimal("100000000"):
        raise ValueError(f"{campo} supera el máximo permitido.")

    return numero


def _validar_texto(valor, campo, longitud_maxima):
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError(f"{campo} es obligatorio.")

    valor = valor.strip()

    if len(valor) > longitud_maxima:
        raise ValueError(
            f"{campo} no puede superar "
            f"{longitud_maxima} caracteres."
        )

    return valor


# =========================================================
# PRODUCTOS
# =========================================================

def obtener_productos():
    """Devuelve los productos incluyendo ubicación y precio de oferta."""
    conn = obtener_conexion()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    precio,
                    precio_oferta,
                    stock,
                    categoria,
                    stock_minimo,
                    imagen_url,
                    ubicacion
                FROM productos
                ORDER BY id;
            """)

            filas = cursor.fetchall()

            return [
                {
                    "id": p["id"],
                    "nombre": p["nombre"],
                    "precio": float(p["precio"] or 0),
                    "precio_oferta": float(p["precio_oferta"]) if p["precio_oferta"] is not None else None,
                    "stock": p["stock"],
                    "categoria": p["categoria"] or "General",
                    "stock_minimo": p["stock_minimo"],
                    "stockMinimo": p["stock_minimo"],
                    "imagen_url": p["imagen_url"],
                    "ubicacion": p["ubicacion"] or "productos"
                }
                for p in filas
            ]

    finally:
        conn.close()


def agregar_producto(
    nombre,
    precio,
    stock,
    stock_minimo=5,
    categoria="General",
    imagen_url=None,
    ubicacion="productos",
    precio_oferta=None
):
    """Agrega un producto con ubicación y precio de oferta opcional."""
    nombre = _validar_texto(nombre, "nombre", 150)
    precio = _validar_precio(precio)
    stock = _validar_stock(stock)
    stock_minimo = _validar_stock(stock_minimo, "stock_minimo")
    categoria = _validar_texto(categoria, "categoria", 100)
    ubicacion = _validar_texto(ubicacion, "ubicacion", 50)

    if precio_oferta is not None and str(precio_oferta).strip() != "":
        precio_oferta = _validar_precio(precio_oferta, "precio_oferta")
    else:
        precio_oferta = None

    if imagen_url is not None:
        if not isinstance(imagen_url, str):
            raise ValueError("La URL de la imagen no es válida.")

        imagen_url = imagen_url.strip() or None

        if imagen_url and len(imagen_url) > 2048:
            raise ValueError("La URL de la imagen es demasiado larga.")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO productos (
                    nombre,
                    precio,
                    precio_oferta,
                    stock,
                    categoria,
                    stock_minimo,
                    imagen_url,
                    ubicacion
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                nombre,
                precio,
                precio_oferta,
                stock,
                categoria,
                stock_minimo,
                imagen_url,
                ubicacion
            ))

            producto_id = cursor.fetchone()["id"]

        conn.commit()
        return producto_id

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def actualizar_producto(
    producto_id,
    nombre,
    precio,
    stock,
    stock_minimo=5,
    categoria="General",
    imagen_url=None,
    ubicacion="productos",
    precio_oferta=None
):
    """Actualiza un producto incluyendo ubicación y precio de oferta."""
    _validar_entero_positivo(producto_id, "producto_id")
    nombre = _validar_texto(nombre, "nombre", 150)
    precio = _validar_precio(precio)
    stock = _validar_stock(stock)
    stock_minimo = _validar_stock(stock_minimo, "stock_minimo")
    categoria = _validar_texto(categoria, "categoria", 100)
    ubicacion = _validar_texto(ubicacion, "ubicacion", 50)

    if precio_oferta is not None and str(precio_oferta).strip() != "":
        precio_oferta = _validar_precio(precio_oferta, "precio_oferta")
    else:
        precio_oferta = None

    if imagen_url is not None:
        if not isinstance(imagen_url, str):
            raise ValueError("La URL de la imagen no es válida.")

        imagen_url = imagen_url.strip() or None

        if imagen_url and len(imagen_url) > 2048:
            raise ValueError("La URL de la imagen es demasiado larga.")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            if imagen_url is None:
                cursor.execute("""
                    UPDATE productos
                    SET nombre = %s,
                        precio = %s,
                        precio_oferta = %s,
                        stock = %s,
                        categoria = %s,
                        stock_minimo = %s,
                        ubicacion = %s
                    WHERE id = %s;
                """, (
                    nombre,
                    precio,
                    precio_oferta,
                    stock,
                    categoria,
                    stock_minimo,
                    ubicacion,
                    producto_id
                ))
            else:
                cursor.execute("""
                    UPDATE productos
                    SET nombre = %s,
                        precio = %s,
                        precio_oferta = %s,
                        stock = %s,
                        categoria = %s,
                        stock_minimo = %s,
                        imagen_url = %s,
                        ubicacion = %s
                    WHERE id = %s;
                """, (
                    nombre,
                    precio,
                    precio_oferta,
                    stock,
                    categoria,
                    stock_minimo,
                    imagen_url,
                    ubicacion,
                    producto_id
                ))

            actualizado = cursor.rowcount > 0

        conn.commit()
        return actualizado

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def eliminar_producto(producto_id):
    """Elimina productos que no tengan detalles de ventas."""
    _validar_entero_positivo(producto_id, "producto_id")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id
                FROM productos
                WHERE id = %s
                FOR UPDATE;
            """, (producto_id,))

            if cursor.fetchone() is None:
                conn.commit()
                return False

            cursor.execute("""
                DELETE FROM detalle_ventas
                WHERE producto_id = %s;
                """, (producto_id,))

            cursor.execute("""
                DELETE FROM productos
                WHERE id = %s;
            """, (producto_id,))

        conn.commit()
        return True

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


# =========================================================
# CLIENTES
# =========================================================

def obtener_clientes():
    """Obtiene todos los clientes guardados en PostgreSQL."""
    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id,
                    nombre,
                    telefono,
                    correo,
                    direccion,
                    estado
                FROM clientes
                ORDER BY id DESC;
            """)

            return [dict(cliente) for cliente in cursor.fetchall()]

    finally:
        conn.close()


def agregar_cliente(
    nombre,
    telefono=None,
    correo=None,
    direccion=None,
    estado="Activo"
):
    """Guarda un cliente nuevo en PostgreSQL y devuelve su ID."""
    nombre = _validar_texto(nombre, "nombre", 150)

    if telefono is not None:
        telefono = str(telefono).strip() or None
        if telefono and len(telefono) > 50:
            raise ValueError("El teléfono no puede superar los 50 caracteres.")

    if correo is not None:
        correo = str(correo).strip().lower() or None
        if correo and len(correo) > 150:
            raise ValueError("El correo no puede superar los 150 caracteres.")

    if direccion is not None:
        direccion = str(direccion).strip() or None
        if direccion and len(direccion) > 255:
            raise ValueError("La dirección no puede superar los 255 caracteres.")

    estado = (estado or "Activo").strip()
    if estado not in ("Activo", "Inactivo"):
        raise ValueError("El estado debe ser Activo o Inactivo.")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO clientes (
                    nombre, telefono, correo, direccion, estado
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
            """, (nombre, telefono, correo, direccion, estado))

            cliente_id = cursor.fetchone()["id"]

        conn.commit()
        return cliente_id

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def actualizar_cliente(
    cliente_id,
    nombre,
    correo=None,
    telefono=None,
    direccion=None,
    estado="Activo"
):
    """Actualiza los datos de un cliente existente."""
    _validar_entero_positivo(cliente_id, "cliente_id")
    nombre = _validar_texto(nombre, "nombre", 150)

    if correo is not None:
        correo = str(correo).strip().lower() or None
        if correo and len(correo) > 150:
            raise ValueError("El correo supera los 150 caracteres.")

    if telefono is not None:
        telefono = str(telefono).strip() or None
        if telefono and len(telefono) > 50:
            raise ValueError("El teléfono supera los 50 caracteres.")

    if direccion is not None:
        direccion = str(direccion).strip() or None
        if direccion and len(direccion) > 255:
            raise ValueError("La dirección supera los 255 caracteres.")

    estado = (estado or "Activo").strip()
    if estado not in ("Activo", "Inactivo"):
        raise ValueError("El estado debe ser Activo o Inactivo.")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE clientes
                SET nombre = %s,
                    correo = %s,
                    telefono = %s,
                    direccion = %s,
                    estado = %s
                WHERE id = %s
                RETURNING id;
            """, (
                nombre,
                correo,
                telefono,
                direccion,
                estado,
                cliente_id
            ))

            actualizado = cursor.fetchone() is not None

        conn.commit()
        return actualizado

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def eliminar_cliente(cliente_id):
    """Elimina un cliente; las ventas conservan su historial."""
    _validar_entero_positivo(cliente_id, "cliente_id")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM clientes
                WHERE id = %s
                RETURNING id;
            """, (cliente_id,))

            eliminado = cursor.fetchone() is not None

        conn.commit()
        return eliminado

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


# =========================================================
# REGISTRO DE VENTAS
# =========================================================

def registrar_venta(cliente_id, detalles):
    """Registra una venta usando el precio actual almacenado en PostgreSQL."""
    if cliente_id is not None:
        _validar_entero_positivo(cliente_id, "cliente_id")

    if not isinstance(detalles, list) or not detalles:
        raise ValueError("La venta debe contener al menos un producto.")

    detalles_validados = []

    for item in detalles:
        if not isinstance(item, dict):
            raise ValueError("Cada detalle de venta debe ser un diccionario.")

        producto_id = _validar_entero_positivo(item.get("producto_id"), "producto_id")
        cantidad = _validar_entero_positivo(item.get("cantidad"), "cantidad")

        detalles_validados.append({
            "producto_id": producto_id,
            "cantidad": cantidad
        })

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            if cliente_id is not None:
                cursor.execute("""
                    SELECT id
                    FROM clientes
                    WHERE id = %s;
                """, (cliente_id,))

                if cursor.fetchone() is None:
                    raise ValueError("El cliente indicado no existe.")

            cantidades = {}
            for item in detalles_validados:
                pid = item["producto_id"]
                cantidades[pid] = cantidades.get(pid, 0) + item["cantidad"]

            productos = {}
            for pid in sorted(cantidades):
                cursor.execute("""
                    SELECT id, nombre, precio, precio_oferta, stock, ubicacion
                    FROM productos
                    WHERE id = %s
                    FOR UPDATE;
                """, (pid,))

                producto = cursor.fetchone()

                if producto is None:
                    raise ValueError(f"No existe el producto {pid}.")

                if producto["stock"] < cantidades[pid]:
                    raise ValueError(
                        f"Stock insuficiente para {producto['nombre']}. "
                        f"Disponible: {producto['stock']}; "
                        f"solicitado: {cantidades[pid]}."
                    )

                productos[pid] = producto

            total = Decimal("0.00")
            detalles_finales = []

            for item in detalles_validados:
                producto = productos[item["producto_id"]]
                
                # Si está en descuento y tiene precio de oferta, se usa ese, sino el normal
                precio_a_usar = producto["precio_oferta"] if producto["precio_oferta"] is not None else producto["precio"]

                precio = _validar_precio(precio_a_usar, "precio del producto")
                subtotal = (precio * item["cantidad"]).quantize(Decimal("0.01"))

                total += subtotal

                detalles_finales.append({
                    "producto_id": item["producto_id"],
                    "cantidad": item["cantidad"],
                    "precio_unitario": precio,
                    "subtotal": subtotal
                })

            total = total.quantize(Decimal("0.01"))

            if total >= Decimal("100000000"):
                raise ValueError("El total de la venta supera el máximo permitido.")

            cursor.execute("""
                INSERT INTO ventas (cliente_id, total)
                VALUES (%s, %s)
                RETURNING id;
            """, (cliente_id, total))

            venta_id = cursor.fetchone()["id"]

            for item in detalles_finales:
                cursor.execute("""
                    INSERT INTO detalle_ventas (
                        venta_id,
                        producto_id,
                        cantidad,
                        precio_unitario,
                        subtotal
                    )
                    VALUES (%s, %s, %s, %s, %s);
                """, (
                    venta_id,
                    item["producto_id"],
                    item["cantidad"],
                    item["precio_unitario"],
                    item["subtotal"]
                ))

            for pid, cantidad in cantidades.items():
                cursor.execute("""
                    UPDATE productos
                    SET stock = stock - %s
                    WHERE id = %s;
                """, (cantidad, pid))

        conn.commit()
        return venta_id

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def eliminar_venta(venta_id):
    venta_id = _validar_entero_positivo(venta_id, "venta_id")

    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id
                FROM ventas
                WHERE id = %s
                FOR UPDATE;
            """, (venta_id,))

            if cursor.fetchone() is None:
                raise ValueError("La venta indicada no existe")

            cursor.execute("""
                SELECT producto_id, cantidad
                FROM detalle_ventas
                WHERE venta_id = %s
            """, (venta_id,))

            detalles = cursor.fetchall()

            for detalle in detalles:
                cursor.execute("""
                    UPDATE productos
                    SET stock = stock + %s
                    WHERE id = %s;
                """, (detalle["cantidad"], detalle["producto_id"]))

                if cursor.rowcount != 1:
                    raise RuntimeError("No se pudo actualizar el inventario")

            cursor.execute("""
                DELETE FROM detalle_ventas
                WHERE venta_id = %s;
            """, (venta_id,))

            cursor.execute("""
                DELETE FROM ventas
                WHERE id = %s;
            """, (venta_id,))

            if cursor.rowcount != 1:
                raise RuntimeError("No se pudo eliminar la venta")

        conn.commit()
        return True

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


# =========================================================
# DATOS DE VENTAS PARA INVENTARIO E IA
# =========================================================

def obtener_ventas_ultimos_30d(cursor, producto_id):
    """Devuelve unidades vendidas durante los últimos 30 días."""
    _validar_entero_positivo(producto_id, "producto_id")

    cursor.execute("""
        SELECT COALESCE(SUM(dv.cantidad), 0) AS total_vendido
        FROM detalle_ventas AS dv
        INNER JOIN ventas AS v ON v.id = dv.venta_id
        WHERE dv.producto_id = %s
          AND v.fecha >= NOW() - INTERVAL '30 days';
    """, (producto_id,))

    return int(cursor.fetchone()["total_vendido"])


def obtener_datos_inventario():
    """Devuelve productos y unidades vendidas en los últimos 30 días."""
    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.id,
                    p.nombre,
                    p.precio,
                    p.precio_oferta,
                    p.stock,
                    p.stock_minimo,
                    p.categoria,
                    p.ubicacion,
                    COALESCE(
                        SUM(dv.cantidad) FILTER (
                            WHERE v.fecha >=
                                NOW() - INTERVAL '30 days'
                        ),
                        0
                    ) AS vendidos_30d
                FROM productos AS p
                LEFT JOIN detalle_ventas AS dv
                    ON dv.producto_id = p.id
                LEFT JOIN ventas AS v
                    ON v.id = dv.venta_id
                GROUP BY
                    p.id,
                    p.nombre,
                    p.precio,
                    p.precio_oferta,
                    p.stock,
                    p.stock_minimo,
                    p.categoria,
                    p.ubicacion
                ORDER BY p.id;
            """)

            filas = cursor.fetchall()

            return [
                {
                    "id": p["id"],
                    "nombre": p["nombre"],
                    "precio": float(p["precio"]),
                    "precio_oferta": float(p["precio_oferta"]) if p["precio_oferta"] is not None else None,
                    "stock": p["stock"],
                    "stock_minimo": p["stock_minimo"],
                    "categoria": p["categoria"],
                    "ubicacion": p["ubicacion"] or "productos",
                    "vendidos_30d": int(p["vendidos_30d"])
                }
                for p in filas
            ]

    finally:
        conn.close()


# =========================================================
# DETALLES DE VENTAS PARA EL DASHBOARD
# =========================================================

def obtener_detalles_dashboard():
    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    v.id AS id,
                    dv.id AS "detalleId",
                    TO_CHAR(v.fecha, 'DD/MM/YYYY') AS fecha,
                    dv.producto_id AS "productoId",
                    dv.cantidad AS cantidad,
                    dv.subtotal AS subtotal,
                    dv.precio_unitario AS "precioUnitario"
                FROM ventas AS v
                INNER JOIN detalle_ventas AS dv
                    ON dv.venta_id = v.id
                ORDER BY v.fecha, v.id, dv.id;
            """)

            filas = cursor.fetchall()

            return [
                {
                    "id": v["id"],
                    "detalleId": v["detalleId"],
                    "fecha": v["fecha"],
                    "productoId": v["productoId"],
                    "cantidad": v["cantidad"],
                    "subtotal": float(v["subtotal"]),
                    "precioUnitario": float(v["precioUnitario"])
                }
                for v in filas
            ]

    finally:
        conn.close()

#Para lo de la recuperacion contraseña por correo
def obtener_usuario_por_correo(correo): 
    conn = obtener_conexion()

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, nombre, correo, password, rol
                FROM usuarios 
                WHERE correo = %s;
                """, (correo.strip().lower(),))

            return cursor.fetchone()
    finally:
        conn.close()