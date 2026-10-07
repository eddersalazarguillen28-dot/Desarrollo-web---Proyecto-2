from flask import Flask, jsonify 
import db_manager as db
app = Flask(__name__)

@app.after_request
def permitir_dashboard(respuesta):

    respuesta.headers["Access-Control-Allow-Origin"] = "http://127.0.0.1:5500"
    return respuesta
    
    

@app.get("/api/dashboard")
def obtener_dashboard():
    try:
        productos = db.obtener_productos()
        ventas = db.obtener_detalles_dashboard()

        for producto in productos:
            producto["stockMinimo"] = producto["stock_minimo"]

        for venta in ventas:
            venta["subtotal"] = float(venta["subtotal"])
            venta["precioUnitario"] = float(venta["precioUnitario"])

        return jsonify({
            "productos": productos,
            "ventas": ventas
        })

    except Exception:
        app.logger.exception("Error al consultar el dashboard")
        return jsonify({
            "error": "No se pudieron consultar los datos"
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)