import os
from decimal import Decimal, InvalidOperation

import cloudinary
import cloudinary.uploader
import time
from google.genai import errors
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from psycopg2.extras import RealDictCursor
from google import genai
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from functools import wraps
from backend import db_manager as db
import secrets
import resend


cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)


# =========================================================
# CONFIGURACIÓN DE FLASK
# =========================================================

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ["SECRET_KEY"]

firmador = URLSafeTimedSerializer(app.config["SECRET_KEY"])

# Límite máximo de cada solicitud, incluidas las imágenes.
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

ORIGENES_PERMITIDOS = [
    "https://eddersalazarguillen28-dot.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
]

CORS(
    app,
    resources={
        r"/*": {
            "origins": ORIGENES_PERMITIDOS,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    }
)



# =========================================================
# CONFIGURACIÓN DE CLOUDINARY
# Las credenciales se configuran en las variables de Render.
# =========================================================

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


def cloudinary_configurado():
    """Comprueba que las tres credenciales estén configuradas."""
    variables = [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
    ]

    return all(os.getenv(variable) for variable in variables)


# =========================================================
# CONFIGURACIÓN DE GEMINI
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
cliente_gemini = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)


# =========================================================
# INICIALIZAR BASE DE DATOS
# =========================================================

try:
    db.inicializar_bd()
    app.logger.info("Base de datos inicializada correctamente.")
except Exception:
    app.logger.exception(
        "No se pudo inicializar la base de datos al arrancar."
    )


# =========================================================
# RUTA PRINCIPAL
# =========================================================

@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "status": "ok",
        "mensaje": "API de OCTO ERP funcionando",
        "base_datos": "PostgreSQL",
        "imagenes": "Cloudinary"
    })


@app.route("/api/health", methods=["GET"])
def health():
    """Comprobación sencilla del servicio."""
    return jsonify({
        "status": "ok",
        "servicio": "OCTO ERP API"
    })

def solo_administrador(funcion):
    @wraps(funcion)
    def protegida(*args, **kwargs):
        autorizacion = request.headers.get("Authorization", "")

        if not autorizacion.startswith("Beare"):
            return jsonify({
                "status": "error",
                "message": "Debes iniciar sesión"
            }), 401

        token = autorizacion[7:]

        try:
            datos = firmador.loads(token, max_age=3600)
        except (BadSignature, SignatureExpired):
            return jsonify({
                "status": "error",
                "message": "Sesión invalida o vencida"
            }), 401

        conexion = None

        try:
            conexion = db.obtener_conexion()

            with conexion.cursos() as cursor:
                cursor.execute("""
                    SELECT rol
                    FROM usuario
                    WHERE id = %s
                    """, (datos["id"],))

                usuario = cursor.fetchone()

                if not usuario or usuario["rol"] != "administrador":
                    return jsonify({
                        "status": "error",
                        "message": "Solo el administrador puede borrar ventas"
                    }), 403

        except Exception:
            app.logger.exception({
                "status": "error",
                "message": "No se pudieron verificar los permisos"
            }), 500

        finally:
            if conexion:
                conexion.close()

        return funcion(*args, **kwargs)
    return protegida

# =========================================================
# REGISTRO DE USUARIOS
# =========================================================

@app.route("/api/registro", methods=["POST"])
def registrar_usuario():
    conexion = None

    try:
        datos = request.get_json(silent=True) or {}

        nombre = (datos.get("nombre") or "").strip()
        correo = (datos.get("correo") or "").strip().lower()
        password = datos.get("password") or ""

        if not nombre or not correo or not password:
            return jsonify({
                "status": "error",
                "message": "Nombre, correo y contraseña son obligatorios."
            }), 400

        if len(password) < 6:
            return jsonify({
                "status": "error",
                "message": "La contraseña debe tener al menos 6 caracteres."
            }), 400

        conexion = db.obtener_conexion()

        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT id FROM usuarios WHERE correo = %s",
                (correo,)
            )

            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": "Ese correo ya está registrado."
                }), 409

            password_hash = generate_password_hash(password)

            cursor.execute(
                """
                INSERT INTO usuarios (nombre, correo, password, rol)
                VALUES (%s, %s, %s, %s)
                RETURNING id, nombre, correo, rol
                """,
                (nombre, correo, password_hash, "cliente")
            )

            usuario = cursor.fetchone()

            cursor.execute("""
                INSERT INTO clientes (nombre, correo, estado)
                VALUES (%s, %s, %s)
                ON CONFLICT (correo) DO NOTHING
                """,(nombre, correo, "Activo"))

        conexion.commit()

        return jsonify({
            "status": "ok",
            "message": "Usuario registrado correctamente.",
            "usuario": dict(usuario)
        }), 201

    except Exception:
        if conexion:
            conexion.rollback()

        app.logger.exception("Error durante el registro.")

        return jsonify({
            "status": "error",
            "message": "No se pudo registrar el usuario."
        }), 500

    finally:
        if conexion:
            conexion.close()


# =========================================================
# INICIO DE SESIÓN
# =========================================================

@app.route("/api/login", methods=["POST"])
def iniciar_sesion():
    conexion = None

    try:
        datos = request.get_json(silent=True) or {}

        correo = (datos.get("correo") or "").strip().lower()
        password = datos.get("password") or ""

        if not correo or not password:
            return jsonify({
                "status": "error",
                "message": "Ingresa tu correo y contraseña."
            }), 400

        conexion = db.obtener_conexion()

        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, nombre, correo, password, rol
                FROM usuarios
                WHERE correo = %s
                """,
                (correo,)
            )

            usuario = cursor.fetchone()

        if not usuario or not check_password_hash(
            usuario["password"], password
        ):
            return jsonify({
                "status": "error",
                "message": "Correo o contraseña incorrectos."
            }), 401

        token = firmador.dumps({
            "id": usuario["id"]
        })

        return jsonify({
            "status": "ok",
            "message": "Inicio de sesión correcto.",
            "token": token,
            "usuario": {
                "id": usuario["id"],
                "nombre": usuario["nombre"],
                "correo": usuario["correo"],
                "rol": usuario["rol"]
            }
        }), 200

    except Exception:
        app.logger.exception("Error durante el inicio de sesión.")

        return jsonify({
            "status": "error",
            "message": "No se pudo iniciar sesión."
        }), 500

    finally:
        if conexion:
            conexion.close()


# =========================================================
# CONSULTAR PRODUCTOS
# =========================================================

@app.route("/api/productos", methods=["GET"])
def listar_productos():
    try:
        productos = db.obtener_productos()

        return jsonify({
            "status": "ok",
            "productos": productos
        }), 200

    except Exception:
        app.logger.exception("Error al consultar productos.")

        return jsonify({
            "status": "error",
            "message": "No se pudieron consultar los productos."
        }), 500


# =========================================================
# CREAR PRODUCTOS CON O SIN IMAGEN
# =========================================================

@app.route("/api/productos", methods=["POST"])
def crear_producto():
    imagen_url = None

    try:
        # También se admiten las solicitudes JSON anteriores.
        if request.is_json:
            datos = request.get_json(silent=True) or {}

            nombre = datos.get("nombre")
            precio = datos.get("precio")
            stock = datos.get("stock")

            stock_minimo = datos.get(
                "stockMinimo",
                datos.get("stock_minimo", 5)
            )

            categoria = datos.get("categoria", "General")

            # Compatibilidad con clientes que ya envíen una URL.
            imagen_url = datos.get("imagen_url")

        else:
            # FormData: permite enviar campos y un archivo de imagen.
            datos = request.form

            nombre = datos.get("nombre")
            precio = datos.get("precio")
            stock = datos.get("stock")

            stock_minimo = datos.get(
                "stockMinimo",
                datos.get("stock_minimo", 5)
            )

            categoria = datos.get("categoria", "General")

            archivo = request.files.get("imagen")

            if archivo and archivo.filename:
                if not cloudinary_configurado():
                    return jsonify({
                        "status": "error",
                        "message": (
                            "Cloudinary no está configurado "
                            "correctamente en Render."
                        )
                    }), 500

                tipos_permitidos = {
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                }

                if archivo.mimetype not in tipos_permitidos:
                    return jsonify({
                        "status": "error",
                        "message": (
                            "Formato no permitido. "
                            "Utiliza JPG, PNG, WEBP o GIF."
                        )
                    }), 400

                # Subir el archivo a Cloudinary.
                resultado = cloudinary.uploader.upload(
                    archivo,
                    folder="octo-erp/productos",
                    resource_type="image",
                    allowed_formats=[
                        "jpg", "jpeg", "png", "webp", "gif"
                    ]
                )

                imagen_url = resultado.get("secure_url")

                if not imagen_url:
                    raise RuntimeError(
                        "Cloudinary no devolvió la URL de la imagen."
                    )

        nombre = (nombre or "").strip()
        categoria = (categoria or "General").strip()

        if not nombre:
            return jsonify({
                "status": "error",
                "message": "El nombre del producto es obligatorio."
            }), 400

        if not categoria:
            categoria = "General"

        try:
            precio = Decimal(str(precio))
            stock = int(stock)
            stock_minimo = int(stock_minimo)
        except (InvalidOperation, ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": (
                    "El precio, el stock y el stock mínimo "
                    "deben tener valores válidos."
                )
            }), 400

        if not precio.is_finite() or precio < 0:
            return jsonify({
                "status": "error",
                "message": "El precio no puede ser negativo."
            }), 400

        if stock < 0 or stock_minimo < 0:
            return jsonify({
                "status": "error",
                "message": (
                    "El stock y el stock mínimo no pueden ser negativos."
                )
            }), 400

        producto_id = db.agregar_producto(
            nombre=nombre,
            precio=precio,
            stock=stock,
            stock_minimo=stock_minimo,
            categoria=categoria,
            imagen_url=imagen_url
        )

        return jsonify({
            "status": "ok",
            "message": "Producto creado correctamente.",
            "producto_id": producto_id,
            "imagen_url": imagen_url
        }), 201

    except Exception:
        app.logger.exception("Error al crear producto.")

        return jsonify({
            "status": "error",
            "message": (
                "No se pudo crear el producto. "
                "Revisa los registros del servicio en Render."
            )
        }), 500


# =========================================================
# ELIMINAR PRODUCTOS
# =========================================================

@app.route("/api/productos/<int:p_id>", methods=["DELETE"])
def borrar_producto(p_id):
    try:
        resultado = db.eliminar_producto(p_id)

        if resultado is False:
            return jsonify({
                "status": "error",
                "message": (
                    "No se pudo eliminar el producto. "
                    "Puede que no exista o tenga ventas asociadas."
                )
            }), 400

        return jsonify({
            "status": "ok",
            "message": "Solicitud de eliminación procesada."
        }), 200

    except Exception:
        app.logger.exception("Error al eliminar producto.")

        return jsonify({
            "status": "error",
            "message": (
                "No se pudo eliminar el producto. "
                "Comprueba si tiene ventas asociadas."
            )
        }), 500


# =========================================================
# CONSULTAR CLIENTES
# =========================================================

@app.route("/api/clientes", methods=["GET"])
def listar_clientes():
    try:
        clientes = db.obtener_clientes()

        return jsonify({
            "status": "ok",
            "clientes": clientes
        }), 200

    except Exception:
        app.logger.exception("Error al consultar clientes.")

        return jsonify({
            "status": "error",
            "message": "No se pudieron consultar los clientes."
        }), 500


# =========================================================
# CREAR CLIENTES
# =========================================================

@app.route("/api/clientes", methods=["POST"])
def crear_cliente():
    try:
        datos = request.get_json(silent=True) or {}

        nombre = (datos.get("nombre") or "").strip()
        correo = (datos.get("correo") or "").strip() or None
        telefono = (datos.get("telefono") or "").strip() or None

        if not nombre:
            return jsonify({
                "status": "error",
                "message": "El nombre del cliente es obligatorio."
            }), 400

        cliente_id = db.agregar_cliente(
            nombre=nombre,
            correo=correo,
            telefono=telefono
        )

        return jsonify({
            "status": "ok",
            "message": "Cliente creado correctamente.",
            "cliente_id": cliente_id
        }), 201

    except Exception:
        app.logger.exception("Error al crear cliente.")

        return jsonify({
            "status": "error",
            "message": "No se pudo crear el cliente."
        }), 500


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    try:
        productos = db.obtener_productos()
        detalles = db.obtener_detalles_dashboard()

        # Convertir valores numéricos especiales para JSON.
        detalles_json = []

        for detalle in detalles:
            detalle_dict = dict(detalle)

            for clave, valor in detalle_dict.items():
                if isinstance(valor, Decimal):
                    detalle_dict[clave] = float(valor)

            detalles_json.append(detalle_dict)

        return jsonify({
            "status": "ok",
            "productos": productos,
            "detalles": detalles_json
        }), 200

    except Exception:
        app.logger.exception("Error al cargar el dashboard.")

        return jsonify({
            "status": "error",
            "message": "No se pudo cargar el dashboard."
        }), 500

# =========================================================
# REGISTRAR VENTAS
# =========================================================

@app.route("/api/ventas", methods=["POST"])
def crear_venta():
    try:
        datos = request.get_json(silent=True) or {}

        cliente_id = datos.get("cliente_id")
        detalles = datos.get("detalles")

        if not isinstance(detalles, list) or not detalles:
            return jsonify({
                "status": "error",
                "message": "La venta debe incluir al menos un producto."
            }), 400

        if cliente_id in ("", 0, "0"):
            cliente_id = None

        if cliente_id is not None:
            try:
                cliente_id = int(cliente_id)
            except (TypeError, ValueError):
                return jsonify({
                    "status": "error",
                    "message": "El identificador del cliente no es válido."
                }), 400

        venta_id = db.registrar_venta(
            cliente_id=cliente_id,
            detalles=detalles
        )

        return jsonify({
            "status": "ok",
            "message": "Venta registrada correctamente.",
            "venta_id": venta_id
        }), 201

    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

    except Exception:
        app.logger.exception("Error al registrar venta.")

        return jsonify({
            "status": "error",
            "message": (
                "No se pudo registrar la venta. "
                "Revisa el stock y los registros de Render."
            )
        }), 500

@app.route("/api/ventas/<int:venta_id>", methods=["DELETE"])
@solo_administrador
def borrar_venta(venta_id):
    try:
        eliminado = db.eliminar_venta(venta_id)

        if not eliminado:
            return jsonify({
                "status": "error",
                "message": "La venta no existe"
            }), 200

    except Exception:
        app.logger.exception("Error al eliminar venta")

        return jsonify({
            "status": "error",
            "message": "No se pudo eliminar la venta"
        }), 500

# =========================================================
# CHAT CON GEMINI
# =========================================================

@app.route("/chat", methods=["POST"])
def chat():
    try:
        # 1. Recibir y validar los datos del frontend
        datos = request.get_json(silent=True) or {}

        # Aceptar ambos nombres para mantener compatibilidad
        pregunta = (
            datos.get("mensaje") or datos.get("pregunta") or ""
        ).strip()

        if not pregunta:
            return jsonify({
                "status": "error",
                "respuesta": "Escribe una pregunta.",
                "message": "Escribe una pregunta."
            }), 400

        # 2. Comprobar que Gemini esté configurado
        if not cliente_gemini:
            return jsonify({
                "status": "error",
                "respuesta": (
                    "El asistente de IA no está configurado. "
                    "Verifica GEMINI_API_KEY en las variables "
                    "de entorno de Render."
                ),
                "message": "Gemini no está configurado."
            }), 503

        # 3. Obtener los productos de la base de datos actual
        productos = db.obtener_productos()

        if productos is None:
            productos = []

        # 4. Preparar los datos para la IA
        contexto = []

        for producto in productos:
            contexto.append({
                "id": producto.get(
                    "id", producto.get("producto_id")
                ),
                "nombre": producto.get("nombre", "Sin nombre"),
                "stock": producto.get(
                    "stock", producto.get("stock_actual", 0)
                ),
                "stock_minimo": producto.get(
                    "stock_minimo",
                    producto.get("stockMinimo", 5)
                ),
                "categoria": producto.get("categoria", "General"),
                "precio": producto.get("precio")
            })

        # 5. Crear el prompt con los datos reales disponibles
        prompt = f"""
Eres el asistente inteligente de inventario de OCTO ERP.

INSTRUCCIONES:
- Responde siempre en español.
- Sé claro, amable y práctico.
- Utiliza los datos reales proporcionados.
- No inventes productos, precios, cantidades ni ventas.
- Si un dato no está disponible, indícalo claramente.
- Si te preguntan por el inventario, utiliza el contexto.
- Si no hay productos registrados, informa que el inventario está vacío.
- Puedes recomendar revisar o reabastecer productos con poco stock,
  pero no afirmes que se vendieron unidades si no tienes ese dato.

INVENTARIO ACTUAL:
{contexto}

PREGUNTA DEL USUARIO:
{pregunta}
"""

        # 6. Consultar Gemini con reintentos automáticos
        modelo = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
        app.logger.info(
            "Modelo de Gemini configurado: %s", modelo
        )

        respuesta = None

        for intento in range(3):
            try:
                respuesta = cliente_gemini.models.generate_content(
                    model=modelo,
                    contents=prompt
                )
                break

            except errors.ServerError as error:
                # Reintentar únicamente ante el error HTTP 503
                if "503" not in str(error) or intento == 2:
                    raise

                espera = 2 ** (intento + 1)

                app.logger.warning(
                    "Gemini está temporalmente saturado. "
                    "Intento %s de 3. Nuevo intento en %s segundos.",
                    intento + 1,
                    espera
                )

                time.sleep(espera)

        # 7. Comprobar que Gemini haya generado texto
        texto = getattr(respuesta, "text", None)

        if not texto or not texto.strip():
            texto = (
                "No pude generar una respuesta en este momento. "
                "Inténtalo nuevamente."
            )


        # 8. Enviar una respuesta compatible con el frontend
        return jsonify({
            "status": "ok",
            "respuesta": texto
        }), 200

    except Exception as error:
        app.logger.exception(
            "Error en la ruta /chat de OCTO ERP. "
            "Tipo de error: %s",
            type(error).__name__
        )

        return jsonify({
            "status": "error",
            "respuesta": (
                "No se pudo procesar la consulta. "
                "Inténtalo nuevamente."
            ),
            "message": (
                "Error al consultar el asistente de IA."
            )
        }), 500

# =========================================================
# MANEJO DE ARCHIVOS DEMASIADO GRANDES
# =========================================================

@app.errorhandler(413)
def archivo_demasiado_grande(error):
    return jsonify({
        "status": "error",
        "message": (
            "La solicitud supera el límite de 5 MB. "
            "Reduce el tamaño de la imagen e inténtalo de nuevo."
        )
    }), 413

#=======================================================
#Recuperar contraseña
#=======================================================
resend.api_key=os.getenv("RESEND_API_KEY")
@app.route('/api/recuperar-password', methods=['POST'])
def recuperar_password():
    datos = request.get_json()
    if not datos or 'correo' not in datos:
        return jsonify({'mensaje':'faltan datos en la solicitud'}),400

    correo = datos.get('correo').strip().lower()
    usuario = db.obtener_usuario_por_correo(correo)
    if usuario:
        token = secrets.token_urlsafe(32)
        enlace =f"https://octo-erp.onrender.com/restablecer?token={token}"

        try:
            params={
                "from":"onboarding@resend.dev",
                "to":[correo],
                "subject":"Restablecer contraseña-OctoERP",
                "html":f"""
                    <div style="font-family:Arial,sans-serif;color:#333;">
                    <h2>Solicitud de recuperación de contraseña</h2>
                    <p>Hola, <b>{usuario['nombre']}</b>. Has solicitado restablecer tu contraseña</p>
                    <p>Haz clic en el siguiente botón para continuar:</p>
                    <a href = "{enlace}" style="background-color:#007bff;color:white;padding:10px 20px;text-decoration:none;
                    border-radius:5px;display:inline-block;">Restablecer contraseña</a>
                    <p style="margin-top:20px;font-size:12px:color:#666;">Si tú no solicitaste este cambio,puedes ignorar este mensaje</p>
                    </div>
                """
            }

            resend.Emails.send(params)
            print(f"Correo de recuperación enviado exitosamentea:{correo}")
        except Exception as e:
            print(f"Error al enviar correo con Resent:{e}")
    return jsonify({'mensaje':'Si el correo está registrado,recibirás las instrucciones'}),200

        

    


# =========================================================
# INICIAR SERVIDOR
# Render utiliza el servidor definido en el comando de arranque.
# =========================================================

if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto)