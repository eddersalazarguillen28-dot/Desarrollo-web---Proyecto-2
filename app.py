import os
import secrets

from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from backend import db_manager as db

app = Flask(_name_)
CORS(app)


# ==========================================
# RUTA PRINCIPAL
# ==========================================

@app.route("/")
def inicio():
    return jsonify({
        "status": "ok",
        "message": "Servidor OCTO ERP corriendo correctamente en Render"
    }), 200


# ==========================================
# INICIALIZACIÓN TEMPORAL DE POSTGRESQL
# ==========================================

@app.route("/api/init-db", methods=["POST"])
def inicializar_bd_manual():
    token_recibido = request.headers.get("X-Init-Token", "")
    token_correcto = os.getenv("INIT_DB_TOKEN", "")

    if not token_correcto or not secrets.compare_digest(
        token_recibido, token_correcto
    ):
        return jsonify({"error": "No autorizado"}), 401

    try:
        db.inicializar_bd()

        return jsonify({
            "status": "ok",
            "mensaje": "Base de datos inicializada correctamente"
        }), 200

    except Exception:
        app.logger.exception("Error al inicializar PostgreSQL")
        return jsonify({
            "status": "error",
            "error": "No se pudo inicializar la base de datos"
        }), 500


# ==========================================
# AUTENTICACIÓN
# ==========================================

@app.route("/api/registro", methods=["POST"])
def registro():
    datos = request.get_json(silent=True) or {}

    nombre = datos.get("nombre", "").strip()
    correo = datos.get("correo", "").strip().lower()
    password = datos.get("password", "")

    if not nombre or not correo or not password:
        return jsonify({
            "status": "error",
            "message": "Nombre, correo y contraseña son obligatorios"
        }), 400

    conn = None

    try:
        conn = db.obtener_conexion()

        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO usuarios (nombre, correo, password)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (nombre, correo, password)
            )
            usuario_id = cursor.fetchone()["id"]

        conn.commit()

        return jsonify({
            "status": "ok",
            "usuario_id": usuario_id
        }), 201

    except Exception:
        if conn:
            conn.rollback()

        app.logger.exception("Error al registrar usuario")
        return jsonify({
            "status": "error",
            "message": "No se pudo registrar el usuario. Comprueba el correo y la base de datos."
        }), 400

    finally:
        if conn:
            conn.close()


@app.route("/api/login", methods=["POST"])
def login():
    datos = request.get_json(silent=True) or {}

    correo = datos.get("correo", "").strip().lower()
    password = datos.get("password", "")

    if not correo or not password:
        return jsonify({
            "status": "error",
            "message": "Correo y contraseña son obligatorios"
        }), 400

    conn = None

    try:
        conn = db.obtener_conexion()

        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, nombre, correo, rol
                FROM usuarios
                WHERE LOWER(correo) = %s AND password = %s;
                """,
                (correo, password)
            )
            usuario = cursor.fetchone()

        if usuario:
            return jsonify({
                "status": "ok",
                "usuario": usuario
            }), 200

        return jsonify({
            "status": "error",
            "message": "Credenciales incorrectas"
        }), 401

    except Exception:
        app.logger.exception("Error al iniciar sesión")
        return jsonify({
            "status": "error",
            "message": "No se pudo completar el inicio de sesión"
        }), 500

    finally:
        if conn:
            conn.close()


# ==========================================
# PRODUCTOS
# ==========================================

@app.route("/api/productos", methods=["GET"])
def listar_productos():
    try:
        productos = db.obtener_productos()

        return jsonify({
            "status": "ok",
            "productos": productos or []
        }), 200

    except Exception:
        app.logger.exception("Error al consultar productos")
        return jsonify({
            "status": "error",
            "message": "No se pudieron consultar los productos"
        }), 500


@app.route("/api/productos", methods=["POST"])
def crear_producto():
    datos = request.get_json(silent=True) or {}

    conn = None

    try:
        nombre = datos.get("nombre", "").strip()

        if not nombre:
            return jsonify({
                "status": "error",
                "message": "El nombre del producto es obligatorio"
            }), 400

        stock_minimo = (
            datos.get("stockMinimo")
            if datos.get("stockMinimo") is not None
            else datos.get("stock_minimo", 5)
        )

        precio = float(datos.get("precio", 0))
        stock = int(datos.get("stock", 0))
        stock_minimo = int(stock_minimo)

        if precio < 0 or stock < 0 or stock_minimo < 0:
            return jsonify({
                "status": "error",
                "message": "Precio, stock y stock mínimo no pueden ser negativos"
            }), 400

        categoria = datos.get("categoria", "General")

        producto_id = db.agregar_producto(
            nombre=nombre,
            precio=precio,
            stock=stock,
            stock_minimo=stock_minimo,
            categoria=categoria
        )

        return jsonify({
            "status": "ok",
            "producto_id": producto_id
        }), 201

    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Precio, stock o stock mínimo tienen un formato inválido"
        }), 400

    except Exception:
        app.logger.exception("Error al crear producto")
        return jsonify({
            "status": "error",
            "message": "No se pudo crear el producto"
        }), 400


@app.route("/api/productos/<int:p_id>", methods=["DELETE"])
def borrar_producto(p_id):
    try:
        eliminado = db.eliminar_producto(p_id)

        if eliminado is False:
            return jsonify({
                "status": "error",
                "message": "No se pudo eliminar el producto"
            }), 400

        return jsonify({
            "status": "ok",
            "message": "Producto eliminado"
        }), 200

    except Exception:
        app.logger.exception("Error al eliminar producto")
        return jsonify({
            "status": "error",
            "message": "No se pudo eliminar el producto"
        }), 400


# ==========================================
# DASHBOARD
# ==========================================

@app.route("/api/dashboard", methods=["GET"])
def obtener_dashboard():
    try:
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()

        return jsonify({
            "productos": productos or [],
            "ventas": ventas or []
        }), 200

    except Exception:
        app.logger.exception("Error al consultar dashboard")
        return jsonify({
            "error": "No se pudieron consultar los datos del dashboard"
        }), 500


# ==========================================
# VENTAS
# ==========================================

@app.route("/api/ventas", methods=["POST"])
def crear_venta():
    datos = request.get_json(silent=True) or {}

    detalles = datos.get("detalles", [])

    if not isinstance(detalles, list) or not detalles:
        return jsonify({
            "status": "error",
            "message": "Debes incluir al menos un producto en la venta"
        }), 400

    try:
        venta_id = db.registrar_venta(
            cliente_id=datos.get("cliente_id"),
            detalles=detalles
        )

        return jsonify({
            "status": "ok",
            "venta_id": venta_id
        }), 201

    except Exception:
        app.logger.exception("Error al registrar venta")
        return jsonify({
            "status": "error",
            "message": "No se pudo registrar la venta"
        }), 400


# ==========================================
# ASISTENTE DE IA
# ==========================================

@app.route("/chat", methods=["POST"])
def chat_asistente():
    datos = request.get_json(silent=True) or {}
    mensaje_usuario = datos.get("mensaje", "").strip()

    if not mensaje_usuario:
        return jsonify({
            "respuesta": "Por favor ingresa una pregunta o consulta válida."
        }), 400

    try:
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()

        api_key = os.getenv("GEMINI_API_KEY")

        if api_key:
            client = genai.Client(api_key=api_key)

            prompt_contexto = f"""
Eres el asistente virtual inteligente de OCTO ERP.
Responde en español, de forma clara, profesional y concisa.

INVENTARIO ACTUAL:
{productos}

HISTORIAL RECIENTE DE VENTAS:
{ventas}

PREGUNTA DEL USUARIO:
{mensaje_usuario}

Utiliza los datos proporcionados. No inventes productos, cantidades
ni ventas que no aparezcan en el contexto.
"""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt_contexto
            )

            return jsonify({
                "respuesta": response.text or "No se obtuvo una respuesta."
            }), 200

        stock_bajo = [
            p.get("nombre", "Producto sin nombre")
            for p in productos
            if int(p.get("stock", 0) or 0)
            <= int(
                p.get("stockMinimo", p.get("stock_minimo", 5)) or 0
            )
        ]

        mensaje_lower = mensaje_usuario.lower()

        if "stock" in mensaje_lower or "inventario" in mensaje_lower:
            if stock_bajo:
                respuesta = (
                    f"Hay {len(stock_bajo)} producto(s) con stock bajo: "
                    + ", ".join(stock_bajo)
                    + "."
                )
            else:
                respuesta = "El inventario está en óptimas condiciones."
        else:
            respuesta = (
                "OCTO ERP está conectado, pero la variable GEMINI_API_KEY "
                "no está configurada para responder con inteligencia artificial."
            )

        return jsonify({"respuesta": respuesta}), 200

    except Exception:
        app.logger.exception("Error al procesar consulta de IA")
        return jsonify({
            "respuesta": "Ocurrió un error al procesar tu consulta."
        }), 500


# ==========================================
# EJECUCIÓN LOCAL
# ==========================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)



    # ==========================================
# CLIENTES
# ==========================================

@app.route("/api/clientes", methods=["GET"])
def listar_clientes():
    try:
        clientes = db.obtener_clientes()
        return jsonify({
            "status": "ok",
            "clientes": clientes or []
        }), 200
    except Exception:
        app.logger.exception("Error al consultar clientes")
        return jsonify({
            "status": "error",
            "message": "No se pudieron consultar los clientes"
        }), 500


@app.route("/api/clientes", methods=["POST"])
def crear_cliente():
    datos = request.get_json(silent=True) or {}

    nombre = datos.get("nombre", "").strip()
    correo = datos.get("correo") or None
    telefono = datos.get("telefono") or None

    if not nombre:
        return jsonify({
            "status": "error",
            "message": "El nombre del cliente es obligatorio"
        }), 400

    try:
        cliente_id = db.agregar_cliente(
            nombre=nombre,
            correo=correo,
            telefono=telefono
        )

        return jsonify({
            "status": "ok",
            "mensaje": "Cliente guardado correctamente",
            "cliente_id": cliente_id
        }), 201

    except Exception:
        app.logger.exception("Error al guardar cliente")
        return jsonify({
            "status": "error",
            "message": "No se pudo guardar el cliente"
        }), 400