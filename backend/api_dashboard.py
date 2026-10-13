import os
from flask import Flask, jsonify, request
import db_manager as db

app = Flask(__name__)

# En Render, configura FRONTEND_ORIGIN con la URL real
# de tu página web. Puedes indicar varios orígenes separados
# por comas si tienes frontend local y publicado.
ORIGENES_PERMITIDOS = {
    origen.strip().rstrip("/")
    for origen in os.getenv(
        "FRONTEND_ORIGIN",
        "http://127.0.0.1:5501,http://localhost:5501"
    ).split(",")
    if origen.strip()
}


@app.after_request
def permitir_dashboard(respuesta):
    origen = request.headers.get("Origin", "").rstrip("/")

    if origen in ORIGENES_PERMITIDOS:
        respuesta.headers["Access-Control-Allow-Origin"] = origen
        respuesta.headers["Vary"] = "Origin"

    respuesta.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    respuesta.headers["Access-Control-Allow-Headers"] = "Content-Type"

    return respuesta


@app.get("/api/dashboard")
def obtener_dashboard():
    try:
        # Consultar PostgreSQL mediante db_manager
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()

        productos_json = []

        for producto in productos:
            producto = dict(producto)

            if producto.get("precio") is not None:
                producto["precio"] = float(producto["precio"])

            stock_minimo = producto.get(
                "stock_minimo",
                producto.get("stockMinimo", 5)
            )

            producto["stock_minimo"] = stock_minimo
            producto["stockMinimo"] = stock_minimo

            productos_json.append(producto)

        ventas_json = []

        for venta in ventas:
            venta = dict(venta)

            if venta.get("subtotal") is not None:
                venta["subtotal"] = float(venta["subtotal"])

            precio_unitario = venta.get(
                "precioUnitario",
                venta.get("precio_unitario")
            )

            if precio_unitario is not None:
                venta["precioUnitario"] = float(precio_unitario)

            ventas_json.append(venta)

        return jsonify({
            "productos": productos_json,
            "ventas": ventas_json
        }), 200

    except Exception:
        app.logger.exception(
            "Error al consultar los datos del dashboard"
        )

        return jsonify({
            "error": "No se pudieron consultar los datos del dashboard"
        }), 500


@app.get("/health")
def health():
    return jsonify({"estado": "ok"}), 200


if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=puerto,
        debug=False
    )