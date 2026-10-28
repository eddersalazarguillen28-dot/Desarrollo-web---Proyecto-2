
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://octo-erp.onrender.com";

    let listaVentasGlobal = [];
    let referenciasPorId = {};

    const cuerpoReporte = document.getElementById("cuerpoReporte");
    const contadorReporte = document.getElementById("contadorReporte");
    const inputNumFactura = document.getElementById("inputNumFactura");
    const btnBuscar = document.getElementById("btnBuscarFactura");
    const btnLimpiar = document.getElementById("btnLimpiarBusqueda");

    const moneda = new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2
    });

    function textoSeguro(valor, alternativa = "---") {
        if (valor === null || valor === undefined || valor === "") {
            return alternativa;
        }

        return String(valor);
    }

    function numero(valor) {
        const resultado = Number(valor);
        return Number.isFinite(resultado) ? resultado : 0;
    }

    function obtenerFecha(fecha) {
        if (!fecha) return null;

        const valor = new Date(fecha);
        return Number.isNaN(valor.getTime()) ? null : valor;
    }

    function formatearFecha(fecha) {
        const valor = obtenerFecha(fecha);

        if (!valor) return textoSeguro(fecha, "---");

        return valor.toLocaleDateString("es-CR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "America/Costa_Rica"
        });
    }

    function obtenerFechaClave(fecha) {
        if (!fecha) return "sin-fecha";

        // Mantiene la fecha de calendario enviada por PostgreSQL.
        const coincidencia = String(fecha).match(/^(\d{4}-\d{2}-\d{2})/);

        return coincidencia ? coincidencia[1] : "sin-fecha";
    }

    function obtenerCliente(venta) {
        return venta.cliente
            || venta.nombre_cliente
            || venta.nombre
            || "Cliente General";
    }

    function obtenerTotal(venta) {
        return numero(
            venta.monto_total ??
            venta.total ??
            venta.monto ??
            0
        );
    }

    function obtenerProductos(venta) {
        // Admite distintos nombres de propiedades del backend.
        const productos = venta.detalles
            ?? venta.productos
            ?? venta.detalle_ventas
            ?? venta.items
            ?? [];

        if (Array.isArray(productos)) {
            return productos;
        }

        return [];
    }

    function obtenerDescripcion(venta) {
        const productos = obtenerProductos(venta);

        if (productos.length > 0) {
            return productos.map(producto => {
                const nombre = producto.nombre
                    ?? producto.producto_nombre
                    ?? producto.producto
                    ?? producto.descripcion
                    ?? "Producto";

                const cantidad = numero(
                    producto.cantidad ?? producto.qty ?? 1
                );

                return `${nombre} × ${cantidad}`;
            }).join(", ");
        }

        return venta.descripcion
            || venta.productos_descripcion
            || "Detalle de productos no disponible";
    }

    function obtenerReferencia(venta) {
        return referenciasPorId[String(venta.id)]?.referencia
            || venta.referencia
            || `VNT-${venta.id}`;
    }

    function crearReferencias(ventas) {
        referenciasPorId = {};

        const cronologicas = [...ventas].sort((a, b) => {
            const fechaA = obtenerFecha(a.fecha)?.getTime() ?? 0;
            const fechaB = obtenerFecha(b.fecha)?.getTime() ?? 0;

            return fechaA - fechaB || numero(a.id) - numero(b.id);
        });

        const conteoPorDia = {};

        cronologicas.forEach(venta => {
            const clave = obtenerFechaClave(venta.fecha);

            conteoPorDia[clave] = (conteoPorDia[clave] || 0) + 1;

            const fecha = formatearFecha(venta.fecha);
            const secuencia = String(conteoPorDia[clave]).padStart(3, "0");

            referenciasPorId[String(venta.id)] = {
                referencia: `${fecha}-${secuencia}`,
                fecha: fecha
            };
        });
    }

    function crearCelda(texto) {
        const td = document.createElement("td");
        td.textContent = texto;
        return td;
    }

    function mostrarMensajeTabla(mensaje, color = "") {
        if (!cuerpoReporte) return;

        cuerpoReporte.replaceChildren();

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.textContent = mensaje;
        celda.style.textAlign = "center";
        celda.style.padding = "20px";

        if (color) celda.style.color = color;

        fila.appendChild(celda);
        cuerpoReporte.appendChild(fila);
    }

    async function cargarReportesVentas() {
        if (!cuerpoReporte) return;

        mostrarMensajeTabla("Cargando comprobantes desde la base de datos...");

        try {
            const respuesta = await fetch(`${API_BASE}/api/reportes/ventas`);

            if (!respuesta.ok) {
                throw new Error(`El servidor respondió con HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            if (datos.status !== "ok" || !Array.isArray(datos.ventas)) {
                throw new Error(
                    datos.message || datos.mensaje || "La API no devolvió una lista de ventas."
                );
            }

            listaVentasGlobal = datos.ventas;
            crearReferencias(listaVentasGlobal);
            renderizarTablaReportes(listaVentasGlobal);

        } catch (error) {
            console.error("Error cargando reportes:", error);

            mostrarMensajeTabla(
                "No se pudieron cargar las facturas. Revisa la conexión con Render.",
                "#ef4444"
            );

            if (contadorReporte) {
                contadorReporte.textContent = "Error al cargar las facturas";
            }
        }
    }

    function renderizarTablaReportes(ventas) {
        if (!cuerpoReporte) return;

        cuerpoReporte.replaceChildren();

        if (!ventas.length) {
            mostrarMensajeTabla("No hay facturas para mostrar.");

            if (contadorReporte) {
                contadorReporte.textContent = "Mostrando 0 facturas";
            }

            return;
        }

        ventas.forEach(venta => {
            const fila = document.createElement("tr");

            const infoReferencia =
                referenciasPorId[String(venta.id)] || {};

            const fecha = infoReferencia.fecha || formatearFecha(venta.fecha);
            const referencia = obtenerReferencia(venta);
            const cliente = obtenerCliente(venta);
            const descripcion = obtenerDescripcion(venta);
            const total = obtenerTotal(venta);
            const estado = textoSeguro(venta.estado, "Completado");

            fila.appendChild(crearCelda(fecha));
            fila.appendChild(crearCelda(`#${referencia}`));

            // Cliente y productos se muestran en la misma celda.
            const celdaDetalle = document.createElement("td");

            const nombreCliente = document.createElement("strong");
            nombreCliente.textContent = cliente;

            const detalleProductos = document.createElement("div");
            detalleProductos.textContent = descripcion;
            detalleProductos.style.marginTop = "5px";
            detalleProductos.style.whiteSpace = "normal";

            celdaDetalle.append(nombreCliente, detalleProductos);
            fila.appendChild(celdaDetalle);

            fila.appendChild(crearCelda(moneda.format(total)));

            const celdaEstado = document.createElement("td");
            const etiquetaEstado = document.createElement("span");

            etiquetaEstado.textContent = estado;

            if (estado.toLowerCase() === "completado") {
                etiquetaEstado.className = "estado-completado";
            } else {
                etiquetaEstado.className = "estado-pendiente";
            }

            celdaEstado.appendChild(etiquetaEstado);
            fila.appendChild(celdaEstado);

            const celdaAccion = document.createElement("td");
            const botonPDF = document.createElement("button");

            botonPDF.type = "button";
            botonPDF.className = "btn-pdf";
            botonPDF.textContent = "PDF";

            botonPDF.addEventListener("click", () => {
                generarFacturaPDF({
                    numeroFactura: referencia,
                    fecha,
                    cliente,
                    productos: obtenerProductos(venta),
                    descripcion,
                    montoTotal: total,
                    estado
                });
            });

            celdaAccion.appendChild(botonPDF);
            fila.appendChild(celdaAccion);

            cuerpoReporte.appendChild(fila);
        });

        if (contadorReporte) {
            contadorReporte.textContent =
                `Mostrando ${ventas.length} factura${ventas.length === 1 ? "" : "s"} registradas`;
        }
    }

    function filtrarFacturas() {
        const busqueda = (inputNumFactura?.value || "")
            .trim()
            .toLowerCase();

        if (!busqueda) {
            renderizarTablaReportes(listaVentasGlobal);
            return;
        }

        const filtradas = listaVentasGlobal.filter(venta => {
            const referencia = obtenerReferencia(venta).toLowerCase();
            const referenciaOriginal =
                textoSeguro(venta.referencia, "").toLowerCase();
            const cliente = obtenerCliente(venta).toLowerCase();
            const id = String(venta.id ?? "");

            return referencia.includes(busqueda)
                || referenciaOriginal.includes(busqueda)
                || cliente.includes(busqueda)
                || id === busqueda;
        });

        renderizarTablaReportes(filtradas);
    }

    btnBuscar?.addEventListener("click", filtrarFacturas);

    inputNumFactura?.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            filtrarFacturas();
        }
    });

    btnLimpiar?.addEventListener("click", () => {
        if (inputNumFactura) inputNumFactura.value = "";
        renderizarTablaReportes(listaVentasGlobal);
    });

    cargarReportesVentas();
});


window.generarFacturaPDF = function(datos) {
    if (typeof html2pdf !== "function") {
        alert("No se pudo cargar la librería para generar PDF.");
        return;
    }

    const elementoPDF = document.getElementById("factura-pdf");
    const tbodyDetalle = document.getElementById("pdf-detalle-body");

    if (!elementoPDF || !tbodyDetalle) {
        console.error("No se encontró la plantilla de la factura.");
        return;
    }

    const moneda = new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2
    });

    const asignarTexto = (id, texto) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = texto;
    };

    asignarTexto("pdf-num-factura", `FACTURA #${datos.numeroFactura}`);
    asignarTexto("pdf-fecha", `Fecha: ${datos.fecha}`);

    // Se usa textContent para no interpretar datos como HTML.
    const clienteElemento = document.getElementById("pdf-cliente");
    const estadoElemento = document.getElementById("pdf-estado");

    if (clienteElemento) {
        clienteElemento.textContent = `Cliente: ${datos.cliente}`;
    }

    if (estadoElemento) {
        estadoElemento.textContent = `Estado: ${datos.estado}`;
    }

    tbodyDetalle.replaceChildren();

    const productos = Array.isArray(datos.productos)
        ? datos.productos
        : [];

    if (productos.length > 0) {
        productos.forEach(producto => {
            const nombre = producto.nombre
                ?? producto.producto_nombre
                ?? producto.producto
                ?? producto.descripcion
                ?? "Producto";

            const cantidad = Number(producto.cantidad ?? producto.qty ?? 1) || 1;

            const precioUnitario = Number(
                producto.precio_unitario
                ?? producto.precio
                ?? producto.precioUnitario
                ?? 0
            ) || 0;

            const subtotalLinea = Number(
                producto.subtotal
                ?? producto.total_linea
                ?? cantidad * precioUnitario
            ) || 0;

            const fila = document.createElement("tr");

            const celdaNombre = document.createElement("td");
            celdaNombre.textContent = nombre;

            const celdaCantidad = document.createElement("td");
            celdaCantidad.textContent = String(cantidad);
            celdaCantidad.style.textAlign = "center";

            const celdaSubtotal = document.createElement("td");
            celdaSubtotal.textContent = moneda.format(subtotalLinea);
            celdaSubtotal.style.textAlign = "right";

            fila.append(celdaNombre, celdaCantidad, celdaSubtotal);
            tbodyDetalle.appendChild(fila);
        });
    } else {
        // No inventar productos si la API solo devuelve el total.
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 3;
        celda.textContent =
            datos.descripcion || "El detalle de productos no está disponible en la API.";

        fila.appendChild(celda);
        tbodyDetalle.appendChild(fila);
    }

    const total = Number(datos.montoTotal) || 0;

    // Supone que el total recibido incluye el IVA del 13%.
    const subtotal = total / 1.13;
    const iva = total - subtotal;

    asignarTexto("pdf-subtotal", moneda.format(subtotal));
    asignarTexto("pdf-iva", moneda.format(iva));
    asignarTexto("pdf-total", moneda.format(total));

    const opciones = {
        margin: 10,
        filename: `Factura_${String(datos.numeroFactura).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf()
        .set(opciones)
        .from(elementoPDF)
        .save();
};
