document.addEventListener('DOMContentLoaded', () => {
    const btnBuscar = document.getElementById('btnBuscarFactura');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
    const inputFactura = document.getElementById('inputNumFactura');

    if (btnBuscar && inputFactura) {
        btnBuscar.addEventListener('click', filtrarFacturas);
        inputFactura.addEventListener('keyup', () => {
            filtrarFacturas(); // Búsqueda en tiempo real al escribir
        });
    }

    if (btnLimpiar && inputFactura) {
        btnLimpiar.addEventListener('click', () => {
            inputFactura.value = '';
            filtrarFacturas();
        });
    }
});

/**
 * Filtra las filas de la tabla según la referencia, cliente o descripción ingresada.
 */
function filtrarFacturas() {
    const termino = document.getElementById('inputNumFactura').value.trim().toLowerCase();
    const filas = document.querySelectorAll('#cuerpoReporte tr');
    let encontrados = 0;

    filas.forEach(fila => {
        const textoFila = fila.innerText.toLowerCase();
        if (termino === '' || textoFila.includes(termino)) {
            fila.style.display = '';
            encontrados++;
        } else {
            fila.style.display = 'none';
        }
    });

    const contador = document.getElementById('contadorReporte');
    if (contador) {
        contador.innerText = `Mostrando ${encontrados} de ${filas.length} facturas registradas`;
    }
}

/**
 * Genera y descarga el documento PDF de la factura correspondiente al reporte seleccionado.
 * @param {Object} reporte Objeto con los datos de la transacción.
 */
async function generarFacturaPDF(reporte) {
    try {
        if (typeof html2pdf === 'undefined') {
            alert('La librería html2pdf no está cargada. Por favor verifica tu conexión.');
            return;
        }

        // Llenar la información del encabezado y cliente
        document.getElementById('pdf-num-factura').innerText = `FACTURA #${reporte.numeroFactura || '000'}`;
        document.getElementById('pdf-fecha').innerText = `Fecha: ${reporte.fecha || 'N/A'}`;
        document.getElementById('pdf-cliente').innerHTML = `<strong>Cliente:</strong> ${reporte.cliente || 'N/A'}`;
        document.getElementById('pdf-estado').innerHTML = `<strong>Estado:</strong> ${reporte.estado || 'Completado'}`;

        // Cálculo de importes e impuestos
        const total = Number(reporte.montoTotal) || 0;
        const subtotal = Math.round(total / 1.13);
        const iva = Math.round(total - subtotal);

        // Renderizar la fila de descripción de la factura
        const tbody = document.getElementById('pdf-detalle-body');
        tbody.innerHTML = `
            <tr>
                <td class="text-left">${reporte.descripcion || 'Venta de productos'}</td>
                <td class="text-center">1</td>
                <td class="text-right">₡${subtotal.toLocaleString()}</td>
            </tr>
        `;

        // Actualizar valores numéricos
        document.getElementById('pdf-subtotal').innerText = `₡${subtotal.toLocaleString()}`;
        document.getElementById('pdf-iva').innerText = `₡${iva.toLocaleString()}`;
        document.getElementById('pdf-total').innerText = `₡${total.toLocaleString()}`;

        const elemento = document.getElementById('factura-pdf');

        // Configuración de html2pdf
        const opciones = {
            margin:       [10, 10, 10, 10],
            filename:     `Factura_${reporte.numeroFactura || 'Reporte'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Pausa breve para asegurar el renderizado del DOM antes de la captura
        await new Promise(resolve => setTimeout(resolve, 100));

        // Descarga del documento
        await html2pdf().set(opciones).from(elemento).save();

    } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Ocurrió un error al generar el PDF. Consulta la consola para más detalles.');
    }
}