document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://octo-erp.onrender.com"; // Asegúrate de que sea tu URL correcta
    let listaVentasGlobal = [];

    const cuerpoReporte = document.getElementById("cuerpoReporte");
    const contadorReporte = document.getElementById("contadorReporte");
    const inputNumFactura = document.getElementById("inputNumFactura");
    const btnBuscar = document.getElementById("btnBuscarFactura");
    const btnLimpiar = document.getElementById("btnLimpiarBusqueda");

    // 1. Cargar las ventas reales desde la Base de Datos al abrir la página
    async function cargarReportesVentas() {
        if (!cuerpoReporte) return;

        cuerpoReporte.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Cargando comprobantes desde la base de datos...</td></tr>`;

        try {
            const respuesta = await fetch(`${API_BASE}/api/reportes/ventas`);
            const datos = await respuesta.json();

            if (datos.status === "ok" && Array.isArray(datos.ventas)) {
                listaVentasGlobal = datos.ventas;
                renderizarTablaReportes(listaVentasGlobal);
            } else {
                cuerpoReporte.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #ef4444;">No se encontraron registros de ventas.</td></tr>`;
            }
        } catch (error) {
            console.error("Error al conectar con la API:", error);
            cuerpoReporte.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #ef4444;">Error al conectar con el servidor de Render.</td></tr>`;
        }
    }

    // 2. Renderizar los datos en la tabla HTML
    function renderizarTablaReportes(ventas) {
        cuerpoReporte.innerHTML = "";

        if (ventas.length === 0) {
            cuerpoReporte.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay resultados para mostrar.</td></tr>`;
            if (contadorReporte) contadorReporte.textContent = "Mostrando 0 registros";
            return;
        }

        ventas.forEach((venta) => {
            const tr = document.createElement("tr");
            
            // Adaptación de nombres de propiedades según devuelva tu base de datos
            const referencia = venta.referencia || `VNT-${venta.id}`;
            const fecha = venta.fecha || "2026-10-22";
            const cliente = venta.cliente || venta.nombre_cliente || "Cliente General";
            const descripcion = venta.descripcion || "Artículos de Tecnología";
            const monto = Number(venta.monto_total || venta.total || 0);
            const estado = venta.estado || "Completado";
            const claseEstado = estado.toLowerCase() === "completado" ? "estado-completado" : "estado-pendiente";

            tr.innerHTML = `
                <td>${fecha}</td>
                <td>#${referencia}</td>
                <td>${cliente} - ${descripcion}</td>
                <td>₡${monto.toLocaleString()}</td>
                <td><span class="${claseEstado}">${estado}</span></td>
                <td>
                    <button class="btn-pdf" type="button">PDF</button>
                </td>
            `;

            // Vincular evento al botón de PDF de manera segura
            const btnPdf = tr.querySelector(".btn-pdf");
            btnPdf.addEventListener("click", () => {
                generarFacturaPDF({
                    numeroFactura: referencia,
                    fecha: fecha,
                    cliente: cliente,
                    descripcion: descripcion,
                    montoTotal: monto,
                    estado: estado
                });
            });

            cuerpoReporte.appendChild(tr);
        });

        if (contadorReporte) {
            contadorReporte.textContent = `Mostrando ${ventas.length} facturas registradas`;
        }
    }

    // 3. Funcionalidad de Búsqueda por número o referencia
    function filtrarFacturas() {
        const textoBusqueda = (inputNumFactura.value || "").trim().toLowerCase();
        
        if (!textoBusqueda) {
            renderizarTablaReportes(listaVentasGlobal);
            return;
        }

        const filtradas = listaVentasGlobal.filter(v => {
            const ref = (v.referencia || `VNT-${v.id}`).toLowerCase();
            const cli = (v.cliente || "").toLowerCase();
            return ref.includes(textoBusqueda) || cli.includes(textoBusqueda);
        });

        renderizarTablaReportes(filtradas);
    }

    if (btnBuscar) {
        btnBuscar.addEventListener("click", filtrarFacturas);
    }

    if (inputNumFactura) {
        inputNumFactura.addEventListener("keyup", (e) => {
            if (e.key === "Enter") filtrarFacturas();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            inputNumFactura.value = "";
            renderizarTablaReportes(listaVentasGlobal);
        });
    }

    // Carga inicial al abrir la página
    cargarReportesVentas();
});

// 4. Función global para generar y descargar el PDF con html2pdf.js
window.generarFacturaPDF = function(datos) {
    document.getElementById("pdf-num-factura").textContent = `FACTURA #${datos.numeroFactura}`;
    document.getElementById("pdf-fecha").textContent = `Fecha: ${datos.fecha}`;
    document.getElementById("pdf-cliente").innerHTML = `<strong>Cliente:</strong> ${datos.cliente}`;
    document.getElementById("pdf-estado").innerHTML = `<strong>Estado:</strong> ${datos.estado}`;

    const tbodyDetalle = document.getElementById("pdf-detalle-body");
    tbodyDetalle.innerHTML = `
        <tr>
            <td>${datos.descripcion}</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">₡${Number(datos.montoTotal).toLocaleString()}</td>
        </tr>
    `;

    // Cálculo estimado de subtotal e IVA (13%)
    const total = Number(datos.montoTotal);
    const subtotal = (total / 1.13).toFixed(2);
    const iva = (total - subtotal).toFixed(2);

    document.getElementById("pdf-subtotal").textContent = `₡${Number(subtotal).toLocaleString()}`;
    document.getElementById("pdf-iva").textContent = `₡${Number(iva).toLocaleString()}`;
    document.getElementById("pdf-total").textContent = `₡${total.toLocaleString()}`;

    const elementoPDF = document.getElementById("factura-pdf");

    const opciones = {
        margin:       10,
        filename:     `Factura_${datos.numeroFactura}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(elementoPDF).set(opciones).save();
};