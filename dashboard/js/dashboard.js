"use strict";
const nombreMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octumbre", "Noviembre", "Diciembre"
];
const selectorMes =
    document.getElementById("mes");
const botonActualizar = document.getElementById("actualizar");
const mensajeActualizacion = document.getElementById("ultima-actualizacion");

let graficoVentas = null
let graficoProductos = null

if (typeof Chart !== "undefined") {
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = "Arial";
    Chart.defaults.color = "#243247"
}

// Formato para cantidad como colones
function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 0
    }).format(valor);
}

// Extraer el mes de una fecha 
//Evita problemas de conversion por zona horaria
function obtenerMes(fecha) {
    return Number(fecha.split("/")[1]);
}
function calcularIngreso(venta) {
    return venta.cantidad * venta.precioUnitario;
}

//Devolver todas las ventas o solo las del mes seleccionado
function filtrarVentas() {
    const mesSeleccionado = selectorMes.value;

    if (mesSeleccionado === "todos") {
        return ventas;
    }

    return ventas.filter(
        venta => obtenerMes(venta.fecha) === Number(mesSeleccionado)
    );
}

//Actualizar las tarjetas
function actualizarIndicadores(ventasFiltradas) {
    const totalVentas = ventasFiltradas.reduce((total, venta) => total + calcularIngreso(venta), 0);

    const cantidadVentas = new Set(
        ventasFiltradas.map(venta => venta.id)
    ).size;

    // Evitar dividir entre cero cuando no se registra venta
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    const stockBajo = productos.filter(producto => producto.stock <= producto.stockMinimo);

    document.getElementById("total-ventas").textContent = formatearMoneda(totalVentas);

    document.getElementById("cantidad-ventas").textContent = cantidadVentas;

    document.getElementById("ticket-promedio").textContent = formatearMoneda(ticketPromedio);

    document.getElementById("cantidad-stock-bajo").textContent = stockBajo.length;
}

//Crear gráfico mensual o actualizar el existente
function actualizarGraficoVentas(ventasFiltradas) {
    const mesSeleccionado = selectorMes.value;

    const mesesVisibles = mesSeleccionado === "todos" ? nombreMeses.map((nombre, indice) => indice + 1) : [Number(mesSeleccionado)];

    const ingresos = mesesVisibles.map(mes => ventasFiltradas.filter(venta => obtenerMes(venta.fecha) === mes).reduce((total, venta) => total + calcularIngreso(venta), 0));

    const etiquetas = mesesVisibles.map(mes => nombreMeses[mes - 1]);

    if (graficoVentas) {
        graficoVentas.data.labels = etiquetas;

        graficoVentas.data.datasets[0].data = ingresos; graficoVentas.update();
        return;
    }

    graficoVentas = new Chart(
        document.getElementById("grafico-ventas"),
        {
            type: "bar",
            data: {
                labels: etiquetas,
                datasets: [
                    {
                        label: "Ingresos",
                        data: ingresos,
                        backgroundColor: "#245bd7",
                        borderRadius: 6

                    }
                ]
            },
            options: {
                resposive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltrip: {
                        callbacks: {
                            label: contexto => formatearMoneda(contexto.parsed.y)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callbacks: valor => formatearMoneda(valor)
                        }
                    }
                }
            }
        }
    )
};


//Ordena los productos por unidades vendidas
function actualizarGraficoProductos(ventasFiltradas) {
    const ranking = productos.map(producto => {
        const unidades = ventasFiltradas.filter(venta => venta.productoId === producto.id).reduce((total, venta) => total + venta.cantidad, 0);
        return {
            nombre: producto.nombre, unidades
        };
    });

    ranking.sort((a, b) => b.unidades - a.unidades);

    const etiquetas = ranking.map(producto => producto.nombre);
    const cantidades = ranking.map(producto => producto.unidades);

    if (graficoProductos) {
        graficoProductos.data.labels = etiquetas;
        graficoProductos.data.datasets[0].data = cantidades;
        graficoProductos.update();
        return;
    }

    graficoProductos = new Chart(document.getElementById("grafico-productos"), {
        type: "doughnut",
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: "Unidades vendidas",
                    data: cantidades,
                    backgroundColor: [
                        "#245bd7",
                        "#169b86",
                        "#8b5cf6",
                        "#ef4444",
                        "#06b6d4",
                    ],
                    borderRadius: "#ffffff",
                    borderWidth: 3
                }
            ]
        },
        options: {
            indexAxis: "y",
            resposive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                legend: {
                    display: false,
                    position: "bottom"
                },
                tooltip: {
                    callbacks:{
                        label: contexto => contexto.label + ": " + contexto.parsed + "unidades"
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    }
    );
}

// Tabla de alertas con el inventario actual
function actualizarAlertas() {
    const tabla = document.getElementById("tabla-stock"); tabla.replaceChildren();

    const productosStockBajo = productos.filter(producto => producto.stock <= producto.stockMinimo).sort((a,b) => a.stock -b.stock);

    if (productosStockBajo.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.className = "sin-alertas";
        celda.textContent = "No hay productos con stokc bajo";

        fila.appendChild(celda);
        tabla.appendChild(fila);
        return;
    }

    productosStockBajo.forEach(producto => {
        const fila = document.createElement("tr");
        [
            producto.nombre,
            producto.stock,
            producto.stockMinimo,
            producto.stockMinimo - producto.stock
        ].forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda)
        });
        const celdaEstado = document.createElement("td");
        const estado = document.createElement("span");

        const agotado = producto.stock === 0;

        estado.className = agotado
            ? "estado agotado"
            : "estado stock-bajo"

        estado.textContent = agotado ? "Agotado" : "Stock bajo";

        celdaEstado.appendChild(estado);
        fila.appendChild(celdaEstado);
        tabla.appendChild(fila);
    });
}

function actualizarTablaVentas(ventasFiltradas) {
    const tabla = document.getElementById("tabla-ventas");
    tabla.replaceChildren();

    if (ventasFiltradas.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "sin-alertas";
        celda.textContent = "No hay ventas en este periodo";

        fila.appendChild(celda);
        tabla.appendChild(fila);
        return;
    }

    ventasFiltradas.forEach((venta, indice) => {
        const producto = productos.find(producto => producto.id === venta.productoId);

        const fecha = venta.fecha;

        const valores = [
            indice + 1,
            venta.fecha,
            producto ? producto.nombre: "Producto no disponible",
            venta.cantidad,

            formatearMoneda(venta.precioUnitario),
            formatearMoneda(calcularIngreso(venta))
        ];

        const fila = document.createElement("tr");

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });
        tabla.appendChild(fila);
    })
}

//Ejecutar todas las actualizaciones del dashboard
function actualizarDashboard() {
    const ventasFiltradas = filtrarVentas();

    document.getElementById("aviso-sin-ventas").hidden = ventasFiltradas.length > 0;


    const periodo = selectorMes.value === "todos" 
        ? " Todos los meses"
        :nombreMeses[Number(selectorMes.value) - 1];

        document.getElementById("titulo-ventas").textContent = "Ventas por mes - Ingresos (₡) - " + periodo

        document.getElementById("titulo-productos").textContent = "Productos más vendidos - Unidades vendidas - " + periodo;
    actualizarIndicadores(ventasFiltradas);
    actualizarAlertas();

    //Las alertas e indicadores funcionan aunque chart no cargue
    if (typeof Chart === "undefined") {
        mensajeActualizacion.textContent = "No se pudo cargar Chart.js. Revisa tu conexión a internet.";
        return;
    }

    actualizarGraficoVentas(ventasFiltradas);
    actualizarGraficoProductos(ventasFiltradas);
    actualizarIndicadores(ventasFiltradas);
    actualizarTablaVentas(ventasFiltradas);
    actualizarAlertas();

    const hora = new Date().toLocaleTimeString("es-CR");

    mensajeActualizacion.textContent = "Última actualización: " + hora;
}

//Interacción del usuario
let cargandoDatos = false;

async function cargarDatos() {
    if (cargandoDatos) return;
    cargandoDatos = true;

    mensajeActualizacion.textContent = "Consultando datos...";

    try {
        const respuesta = await fetch(`${API_URL}/api/dashboard`);

        if (!respuesta.ok){
            throw new Error("Error HTTP " + respuesta.status);
        }

        const datos = await respuesta.json(); 

        if (!Array.isArray(datos.productos) || !Array.isArray(datos.ventas)){
            throw new Error("La respuesta no contiene los datos esperados");
        } 

        productos = datos.productos;
        ventas = datos.ventas;

        actualizarDashboard();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        mensajeActualizacion.textContent = "No se pudieron actualizar los datos. Revisar la conexión";
    } finally {
        cargandoDatos = false;
    }

}

//Cambiar el mes usando los datos cargados
selectorMes.addEventListener("change",actualizarDashboard);

//Consultar nuevamente la base de datos
botonActualizar.addEventListener("click", cargarDatos);

//Consultar cada 15 segundos
setInterval(() => {
    if (document.visibilityState === "visible") {
        cargarDatos();
    }
}, 15000)

cargarDatos();