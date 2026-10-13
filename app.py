import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from google import genai
from backend import db_manager as db

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "https://eddersalazarguillen28-dot.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]}})

# Inicializar el esquema al arrancar; si falla, registrar el error.
try:
    db.inicializar_bd()
except Exception:
    app.logger.exception("No se pudo inicializar PostgreSQL")


@app.route("/")
def inicio():
    return jsonify({"status": "ok", "message": "Servidor OCTO ERP corriendo correctamente en Render"}), 200


@app.route("/api/registro", methods=["POST"])
def registro():
    datos = request.get_json(silent=True) or {}
    nombre = str(datos.get("nombre") or "").strip()
    correo = str(datos.get("correo") or "").strip().lower()
    password = str(datos.get("password") or "")
    if not nombre or not correo or not password:
        return jsonify({"status": "error", "message": "Nombre, correo y contraseña son obligatorios"}), 400
    if len(nombre) > 100 or len(correo) > 100 or len(password) < 8:
        return jsonify({"status": "error", "message": "Revisa las longitudes de los campos; la contraseña necesita al menos 8 caracteres"}), 400

    conn = None
    try:
        conn = db.obtener_conexion()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO usuarios (nombre, correo, password, rol)
                VALUES (%s, %s, %s, 'vendedor') RETURNING id;
            """, (nombre, correo, generate_password_hash(password)))
            usuario_id = cursor.fetchone()["id"]
        conn.commit()
        return jsonify({"status": "ok", "usuario_id": usuario_id}), 201
    except Exception:
        if conn:
            conn.rollback()
        app.logger.exception("Error al registrar usuario")
        return jsonify({"status": "error", "message": "No se pudo registrar el usuario"}), 400
    finally:
        if conn:
            conn.close()


@app.route("/api/login", methods=["POST"])
def login():
    datos = request.get_json(silent=True) or {}
    correo = str(datos.get("correo") or "").strip().lower()
    password = str(datos.get("password") or "")
    if not correo or not password:
        return jsonify({"status": "error", "message": "Correo y contraseña son obligatorios"}), 400

    conn = None
    try:
        conn = db.obtener_conexion()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, nombre, correo, rol, password
                FROM usuarios WHERE LOWER(correo) = %s;
            """, (correo,))
            usuario = cursor.fetchone()
        if not usuario:
            return jsonify({"status": "error", "message": "Credenciales incorrectas"}), 401
        password_guardada = usuario["password"]
        if not isinstance(password_guardada, str) or not password_guardada.startswith(("scrypt:", "pbkdf2:")):
            return jsonify({"status": "error", "message": "La cuenta requiere restablecer su contraseña"}), 401
        if not check_password_hash(password_guardada, password):
            return jsonify({"status": "error", "message": "Credenciales incorrectas"}), 401
        return jsonify({"status": "ok", "usuario": {
            "id": usuario["id"], "nombre": usuario["nombre"],
            "correo": usuario["correo"], "rol": usuario["rol"]
        }}), 200
    except Exception:
        app.logger.exception("Error al iniciar sesión")
        return jsonify({"status": "error", "message": "Error al iniciar sesión"}), 500
    finally:
        if conn:
            conn.close()


@app.route("/api/productos", methods=["GET"])
def listar_productos():
    try:
        return jsonify({"status": "ok", "productos": db.obtener_productos()}), 200
    except Exception:
        app.logger.exception("Error al consultar productos")
        return jsonify({"status": "error", "message": "No se pudieron consultar los productos"}), 500


@app.route("/api/productos", methods=["POST"])
def crear_producto():
    datos = request.get_json(silent=True) or {}
    try:
        producto_id = db.agregar_producto(
            nombre=datos.get("nombre"), precio=datos.get("precio"),
            stock=datos.get("stock"),
            stock_minimo=datos.get("stockMinimo", datos.get("stock_minimo", 5)),
            categoria=datos.get("categoria", "General")
        )
        return jsonify({"status": "ok", "producto_id": producto_id}), 201
    except (ValueError, TypeError) as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception:
        app.logger.exception("Error al crear producto")
        return jsonify({"status": "error", "message": "No se pudo crear el producto"}), 500


@app.route("/api/productos/<int:p_id>", methods=["DELETE"])
def borrar_producto(p_id):
    try:
        if not db.eliminar_producto(p_id):
            return jsonify({"status": "error", "message": "Producto no encontrado"}), 404
        return jsonify({"status": "ok", "message": "Producto eliminado"}), 200
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception:
        app.logger.exception("Error al eliminar producto")
        return jsonify({"status": "error", "message": "No se pudo eliminar el producto"}), 500


@app.route("/api/clientes", methods=["GET"])
def listar_clientes():
    try:
        return jsonify({"status": "ok", "clientes": db.obtener_clientes()}), 200
    except Exception:
        app.logger.exception("Error al consultar clientes")
        return jsonify({"status": "error", "message": "No se pudieron consultar los clientes"}), 500


@app.route("/api/clientes", methods=["POST"])
def crear_cliente():
    datos = request.get_json(silent=True) or {}
    nombre = str(datos.get("nombre") or "").strip()
    telefono = str(datos.get("telefono") or "").strip()
    if not nombre or not telefono:
        return jsonify({"status": "error", "message": "Nombre y teléfono son obligatorios"}), 400
    try:
        cliente_id = db.agregar_cliente(
            nombre=nombre, telefono=telefono,
            correo=datos.get("correo"), direccion=datos.get("direccion"),
            estado=datos.get("estado", "Activo")
        )
        return jsonify({"status": "ok", "cliente_id": cliente_id}), 201
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception:
        app.logger.exception("Error al registrar cliente")
        return jsonify({"status": "error", "message": "No se pudo registrar el cliente"}), 500


@app.route("/api/dashboard", methods=["GET"])
def obtener_dashboard():
    try:
        return jsonify({
            "productos": db.obtener_productos(),
            "ventas": db.obtener_detalles_dashboard()
        }), 200
    except Exception:
        app.logger.exception("Error al consultar dashboard")
        return jsonify({"status": "error", "message": "No se pudo consultar el dashboard"}), 500


@app.route("/api/ventas", methods=["POST"])
def crear_venta():
    datos = request.get_json(silent=True) or {}
    detalles = datos.get("detalles", [])
    if not isinstance(detalles, list) or not detalles:
        return jsonify({"status": "error", "message": "Debes incluir al menos un producto"}), 400
    try:
        venta_id = db.registrar_venta(datos.get("cliente_id"), detalles)
        return jsonify({"status": "ok", "venta_id": venta_id}), 201
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception:
        app.logger.exception("Error al registrar venta")
        return jsonify({"status": "error", "message": "No se pudo registrar la venta"}), 500


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
