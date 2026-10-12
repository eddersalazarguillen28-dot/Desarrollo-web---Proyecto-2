from flask import Flask, jsonify
import db_manager as db

app = Flask(__name__)

ORIGEN_PERMITIDO = "http://127.0.0.1:5501"


@app.after_request
def permitir_dashboard(respuesta):
    respuesta.headers["Access-Control-Allow-Origin"] = ORIGEN_PERMITIDO
    respuesta.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    respuesta.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return respuesta


@app.get("/api/dashboard")
def obtener_dashboard():
    try:
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()

        # Preparar productos para el JSON
        productos_json = []

        for producto in productos:
            producto = dict(producto)

            # Convertir precios a números compatibles con JavaScript
            if producto.get("precio") is not None:
                producto["precio"] = float(producto["precio"])

            # Compatibilidad con los nombres del dashboard
            stock_minimo = producto.get(
                "stock_minimo",
                producto.get("stockMinimo", 5)
            )

            producto["stock_minimo"] = stock_minimo
            producto["stockMinimo"] = stock_minimo

            productos_json.append(producto)

        # Preparar ventas para el JSON
        ventas_json = []

        for venta in ventas:
            venta = dict(venta)

            if venta.get("subtotal") is not None:
                venta["subtotal"] = float(venta["subtotal"])

            # Aceptar ambos nombres de columna
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
        })

    except Exception:
        app.logger.exception("Error al consultar el dashboard")

        return jsonify({
            "error": "No se pudieron consultar los datos"
        }), 500


if __name__ == "_main_":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )