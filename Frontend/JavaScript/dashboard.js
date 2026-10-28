
"use strict";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const API_URL = "https://octo-erp.onrender.com/api/dashboard";
const API_BASE = "https://octo-erp.onrender.com/api";

// VARIABLES GLOBALES
let productos = [];
let ventas = [];

const nombreMeses = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const selectorMes = document.getElementById("mes");
const botonActualizar = document.getElementById("actualizar");
const mensajeActualizacion = document.getElementById("ultima-actualizacion");

let graficoVentas = null;
let graficoProductos = null;
let cargandoDatos = false;

// Configuración de Chart.js
if (typeof Chart !== "undefined") {
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = "Arial";
    Chart.defaults.color = "#243247";
}

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

function obtenerMes(fecha) {
    if (!fecha) return 0;

    // Admite DD/MM/YYYY y fechas ISO YYYY-MM-DD.
    const texto = String(fecha);

    let mes;

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        mes = Number(texto.substring(5, 7));
    } else {
        const partes = texto.split("/");
        mes = partes.length >= 2 ? Number(partes[1]) : 0;
    }

    return mes >= 1 && mes <= 12 ? mes : 0;
}

function calcularIngreso(venta) {
    return (Number(venta.cantidad) || 0) *
           (Number(venta.precioUnitario) || 0);
}

function obtenerToken() {
    return localStorage.getItem("token");
}

function obtenerCabeceras(incluirJson = false) {
    const cabeceras = {
        "Accept": "application/json"
    };

    const token = obtenerToken();

    if (token) {
        cabeceras.Authorization = `Bearer ${token}`;
    }

    if (incluirJson) {
        cabeceras["Content-Type"] = "application/json";
    }

    return cabeceras;
}

async function leerRespuesta(respuesta) {
    const texto = await respuesta.text();

    if (!texto) return {};

    try {
        return JSON.parse(texto);
    } catch {
        return { message: texto };
    }
}

// ======================================================
// FILTRAR VENTAS POR MES
// ======================================================

function filtrarVentas() {
    if (!selectorMes) return ventas;

    const mesSeleccionado = selectorMes.value;

    if (mesSeleccionado === "todos") {
        return ventas;
    }

    return ventas.filter(
        venta => obtenerMes(venta.fecha) === Number(mesSeleccionado)
    );
}

// ======================================================
// INDICADORES DEL DASHBOARD
// ======================================================

function actualizarIndicadores(ventasFiltradas) {
    const totalVentas = ventasFiltradas.reduce(
        (total, venta) => total + calcularIngreso(venta),
        0
    );

    // Cada venta puede contener varios productos.
    const idsVentas = new Set(
        ventasFiltradas
            .map(venta => venta.id)
            .filter(id => id !== null && id !== undefined && !Number.isNaN(id))
    );

    const cantidadVentas = idsVentas.size;
    const ticketPromedio = cantidadVentas > 0
        ? totalVentas / cantidadVentas
        : 0;

    const stockBajo = productos.filter(
        producto => producto.stock <= producto.stockMinimo
    );

    const elTotal = document.getElementById("total-ventas");
    const elCantidad = document.getElementById("cantidad-ventas");
    const elTicket = document.getElementById("ticket-promedio");
    const elStockBajo = document.getElementById("cantidad-stock-bajo");

    if (elTotal) elTotal.textContent = formatearMoneda(totalVentas);
    if (elCantidad) elCantidad.textContent = cantidadVentas;
    if (elTicket) elTicket.textContent = formatearMoneda(ticketPromedio);
    if (elStockBajo) elStockBajo.textContent = stockBajo.length;
}

// ======================================================
// GRÁFICO DE VENTAS
// ======================================================

function actualizarGraficoVentas(ventasFiltradas) {
    const canvas = document.getElementById("grafico-ventas");

    if (!canvas || typeof Chart === "undefined") return;

    const mesSeleccionado = selectorMes
        ? selectorMes.value
        : "todos";

    const mesesVisibles = mesSeleccionado === "todos"
        ? nombreMeses.map((_, indice) => indice + 1)
        : [Number(mesSeleccionado)];

    const ingresos = mesesVisibles.map(mes =>
        ventasFiltradas
            .filter(venta => obtenerMes(venta.fecha) === mes)
            .reduce((total, venta) => total + calcularIngreso(venta), 0)
    );

    const etiquetas = mesesVisibles.map(
        mes => nombreMeses[mes - 1]
    );

    if (graficoVentas) {
        graficoVentas.data.labels = etiquetas;
        graficoVentas.data.datasets[0].data = ingresos;
        graficoVentas.update();
        return;
    }

    graficoVentas = new Chart(canvas, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Ingresos",
                data: ingresos,
                backgroundColor: "#245bd7",
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: contexto =>
                            formatearMoneda(contexto.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: valor => formatearMoneda(valor)
                    }
                }
            }
        }
    });
}

// ======================================================
// COLORES PARA EL GRÁFICO DE PRODUCTOS
// ======================================================

function generarColores(cantidad) {
    return Array.from({ length: cantidad }, (_, indice) => {
        const tono = (indice * 137.508) % 360;
        return `hsl(${tono}, 75%, 55%)`;
    });
}

// ======================================================
// GRÁFICO DE PRODUCTOS MÁS VENDIDOS
// ======================================================

function actualizarGraficoProductos(ventasFiltradas) {
    const canvas = document.getElementById("grafico-productos");

    if (!canvas || typeof Chart === "undefined") return;

    const ranking = productos.map(producto => {
        const unidades = ventasFiltradas
            .filter(venta =>
                Number(venta.productoId) === Number(producto.id)
            )
            .reduce(
                (total, venta) => total + (Number(venta.cantidad) || 0),
                0
            );

        return {
            id: producto.id,
            nombre: producto.nombre,
            unidades
        };
    });

    // Orden descendente: más vendidos primero.
    ranking.sort((a, b) => b.unidades - a.unidades);

    const etiquetas = ranking.map(producto => producto.nombre);
    const cantidades = ranking.map(producto => producto.unidades);
    const colores = generarColores(ranking.length);

    if (graficoProductos) {
        graficoProductos.data.labels = etiquetas;
        graficoProductos.data.datasets[0].data = cantidades;
        graficoProductos.data.datasets[0].backgroundColor = colores;
        graficoProductos.data.datasets[0].hoverBackgroundColor = colores;
        graficoProductos.update();
        return;
    }

    graficoProductos = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Unidades vendidas",
                data: cantidades,
                backgroundColor: colores,
                hoverBackgroundColor: colores,
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: contexto =>
                            `${contexto.label}: ${contexto.parsed} unidades`
                    }
                }
            }
        }
    });
}

// ======================================================
// ALERTAS DE STOCK BAJO
// ======================================================

function actualizarAlertas() {
    const tabla = document.getElementById("tabla-stock");

    if (!tabla) return;

    tabla.replaceChildren();

    const productosStockBajo = productos
        .filter(producto => producto.stock <= producto.stockMinimo)
        .sort((a, b) => a.stock - b.stock);

    if (productosStockBajo.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.className = "sin-alertas";
        celda.textContent = "No hay productos con stock bajo";

        fila.appendChild(celda);
        tabla.appendChild(fila);
        return;
    }

    productosStockBajo.forEach(producto => {
        const fila = document.createElement("tr");

        const valores = [
            producto.nombre,
            producto.stock,
            producto.stockMinimo,
            Math.max(0, producto.stockMinimo - producto.stock)
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        const celdaEstado = document.createElement("td");
        const estado = document.createElement("span");
        const agotado = producto.stock <= 0;

        estado.className = agotado
            ? "estado agotado"
            : "estado stock-bajo";

        estado.textContent = agotado
            ? "Agotado"
            : "Stock bajo";

        celdaEstado.appendChild(estado);
        fila.appendChild(celdaEstado);
        tabla.appendChild(fila);
    });
}

// ======================================================
// TABLA DE DETALLES DE VENTAS
// ======================================================

function actualizarTablaVentas(ventasFiltradas) {
    const tabla = document.getElementById("tabla-ventas");

    if (!tabla) return;

    tabla.replaceChildren();

    if (ventasFiltradas.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.textContent = "No hay ventas en este periodo";

        fila.appendChild(celda);
        tabla.appendChild(fila);
        return;
    }

    ventasFiltradas.forEach(venta => {
        const producto = productos.find(
            p => Number(p.id) === Number(venta.productoId)
        );

        const fila = document.createElement("tr");

        const valores = [
            venta.id,
            venta.fecha || "Fecha no disponible",
            producto ? producto.nombre : "Producto no disponible",
            venta.cantidad,
            formatearMoneda(venta.precioUnitario),
            formatearMoneda(calcularIngreso(venta))
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        const celdaAccion = document.createElement("td");
        const botonEliminar = document.createElement("button");

        botonEliminar.type = "button";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.className = "btn-eliminar-venta";

        botonEliminar.addEventListener("click", () => {
            eliminarVenta(venta.id);
        });

        celdaAccion.appendChild(botonEliminar);
        fila.appendChild(celdaAccion);
        tabla.appendChild(fila);
    });
}

// ======================================================
// ELIMINAR UNA VENTA
// ======================================================

async function eliminarVenta(ventaId) {
    const confirmar = window.confirm(
        `¿Estás seguro de que deseas eliminar la venta número ${ventaId}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    const token = obtenerToken();

    if (!token) {
        window.alert(
            "No se encontró el token de sesión. Inicia sesión nuevamente."
        );
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_BASE}/ventas/${encodeURIComponent(ventaId)}`,
            {
                method: "DELETE",
                headers: obtenerCabeceras()
            }
        );

        const datos = await leerRespuesta(respuesta);

        if (!respuesta.ok || datos.status === "error") {
            throw new Error(
                datos.message ||
                datos.error ||
                `Error HTTP ${respuesta.status}`
            );
        }

        window.alert("Venta eliminada correctamente.");
        await cargarDatos();

    } catch (error) {
        console.error("Error al eliminar la venta:", error);
        window.alert(
            error.message || "Ocurrió un error al eliminar la venta."
        );
    }
}

// ======================================================
// ACTUALIZAR TODO EL DASHBOARD
// ======================================================

function actualizarDashboard() {
    const ventasFiltradas = filtrarVentas();

    const aviso = document.getElementById("aviso-sin-ventas");

    if (aviso) {
        aviso.hidden = ventasFiltradas.length > 0;
    }

    const periodo = !selectorMes || selectorMes.value === "todos"
        ? "Todos los meses"
        : nombreMeses[Number(selectorMes.value) - 1];

    const tituloVentas = document.getElementById("titulo-ventas");
    const tituloProductos = document.getElementById("titulo-productos");

    if (tituloVentas) {
        tituloVentas.textContent =
            `Ventas por mes - Ingresos (₡) - ${periodo}`;
    }

    if (tituloProductos) {
        tituloProductos.textContent =
            `Productos más vendidos - Unidades vendidas - ${periodo}`;
    }

    actualizarIndicadores(ventasFiltradas);
    actualizarTablaVentas(ventasFiltradas);
    actualizarAlertas();

    if (typeof Chart === "undefined") {
        if (mensajeActualizacion) {
            mensajeActualizacion.textContent =
                "No se pudo cargar Chart.js. Revisa tu conexión.";
        }
        return;
    }

    actualizarGraficoVentas(ventasFiltradas);
    actualizarGraficoProductos(ventasFiltradas);

    if (mensajeActualizacion) {
        mensajeActualizacion.textContent =
            "Última actualización: " +
            new Date().toLocaleTimeString("es-CR");
    }
}

// ======================================================
// CARGAR DATOS DESDE FLASK / RENDER
// ======================================================

async function cargarDatos() {
    if (cargandoDatos) return;

    cargandoDatos = true;

    if (mensajeActualizacion) {
        mensajeActualizacion.textContent = "Consultando datos...";
    }

    try {
        const token = obtenerToken();

        if (!token) {
            throw new Error(
                "No se encontró el token de sesión. Inicia sesión nuevamente."
            );
        }

        const respuesta = await fetch(API_URL, {
            method: "GET",
            headers: obtenerCabeceras()
        });

        const datos = await leerRespuesta(respuesta);

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                throw new Error(
                    "El servidor no autorizó la consulta. " +
                    "Tu sesión puede haber vencido o el token no ser válido."
                );
            }

            throw new Error(
                datos.message ||
                datos.error ||
                `Error HTTP ${respuesta.status}`
            );
        }

        if (!Array.isArray(datos.productos)) {
            throw new Error(
                "La respuesta del servidor no contiene el arreglo 'productos'."
            );
        }

        const datosVentas = Array.isArray(datos.ventas)
            ? datos.ventas
            : Array.isArray(datos.detalles)
                ? datos.detalles
                : [];

        productos = datos.productos.map(producto => ({
            ...producto,
            id: Number(producto.id),
            nombre: producto.nombre ?? "Producto sin nombre",
            precio: Number(producto.precio) || 0,
            stock: Number(producto.stock) || 0,
            stockMinimo: Number(
                producto.stockMinimo ??
                producto.stock_minimo ??
                5
            )
        }));

        ventas = datosVentas.map(venta => ({
            ...venta,
            id: Number(venta.id),
            productoId: Number(
                venta.productoId ??
                venta.producto_id
            ),
            cantidad: Number(venta.cantidad) || 0,
            precioUnitario: Number(
                venta.precioUnitario ??
                venta.precio_unitario
            ) || 0,
            fecha: venta.fecha ?? ""
        }));

        actualizarDashboard();

    } catch (error) {
        console.error("Error al cargar datos:", error);

        if (mensajeActualizacion) {
            mensajeActualizacion.textContent =
                error.message ||
                "No se pudieron actualizar los datos.";
        }
    } finally {
        cargandoDatos = false;
    }
}

// ======================================================
// EVENTOS
// ======================================================

if (selectorMes) {
    selectorMes.addEventListener("change", actualizarDashboard);
}

if (botonActualizar) {
    botonActualizar.addEventListener("click", cargarDatos);
}

// Actualización automática cada 15 segundos.
// No se consulta si la página está oculta.
setInterval(() => {
    if (document.visibilityState === "visible") {
        cargarDatos();
    }
}, 15000);

// ======================================================
// CARGA INICIAL
// ======================================================

cargarDatos();
