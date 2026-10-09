"use strict";

const API_URL = "https://octo-erp.onrender.com/api/dashboard"

const nombreMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octumbre", "Noviembre", "Diciembre"
];

const selectorMes = document.getElementById("mes");
const  botonActualizar = document.getElementById("actualizar");
const mensajeActualizacion = document.getElementById("ultima-actualizacion");

let productos = []
let ventas = []
let graficoVentas = null;
let graficoProductos = null;
let cargandoDatos = false;

if (typeof Chart !== "undifenid") {
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = "Arial";
    Chart,defaults.color = "#243247";
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 0
    }).format(valor);
}

function obtenerMes(fecha) {
    return Number(String(fecha).split("/")[1]);
}

function calcularIngreso(venta) {
    return venta.cantidad * venta.precioUnitario;
}

function filtrarVenta() {
    const mes = selectorMes.value;

    return mes === "todos" 
    ? ventas 
    : ventas.filter(
        v => obtenerMes(v.fecha) === Number(mes)
    );
}

function actualizarIndicadores(filtradas) {
    const total = filtradas.reduce(
        (s, v) => s + calcularIngreso(v), 0
    );

    const cantidad = new Set(
        filtradas.map(v => v.id)
    ).size

    const ticket = cantidad ? total / cantidad: 0;

    const stockBajo = productos.filter( 
        p => p.stock <= p.stockMinimo
    );

    document.getElementById("total-ventas").textContent = formatearMoneda(total);

    document.getElementById("cantidad-ventas").textContent = cantidad

    document.getElementById("ticket-promedio").textContent = formatearMoneda(ticket);

    document.getElementById("cantidad-stock-bajo").textContent = stockBajo.length;
}

function actualizarGraficoVentas(filtradas) {
    const mes = selectorMes.value;

    const meses = mes === "todos"
    ? nombreMeses.map((API_URL, i)=> i + 1)
    : [Number(mes)];

    const ingresos = meses.map(m => filtradas.filter(v => obtenerMes(v.fecha) === m),reduce((s,v) => s + calcularIngreso(v),0)
    );

    const etiquetas = meses.map(
    m => nombreMeses[m - 1]
    );
    
    if(graficoVentas) {
        graficoVentas.data.labels = etiquetas;
        graficoVentas.data.dataset[0].data = ingresos;
        graficoVentas.update();
        return;
    }

    graficoVentas = new Chart(document.getElementById("grafico-ventas"),{
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Ingresos",
                data: ingresos,
                backgroundColor: "#245bd7",
                borderRadios: 6
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
                        label: ctx => formatearMoneda(ctx.parsed.y)
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
    });
}

function actualizarGraficoProductos(filtradas){
    const ranking = productos.map(p => ({
        nombre: p.nombre,
        unidades: filtradas.filter(v => v.productoId === p.id).reduce((s, v) => s + v.cantidad, 0)
    })).sort((a, b) => b.unidades - a.unidades);

    const etiquetas = ranking.map(p => p.nombre);
    const cantidades = ranking.map(p => p.unidades);

    if(graficoProductos) {
        graficoProductos.data.labels = etiquetas;
        graficoProductos.data.datasets[0],data = cantidad;
        graficoProductos.update();
        return;
    }

    graficoProductos = new Chart(document.getElementById("grafico-productos"),
        {
            type: "doughnut",
            data: {
                labels: etiquetas,
                datasets: [{
                    label: "Unidades vendidas",
                    data: cantidades,
                    backgroundColor:[
                        "#245bd7",
                        "#169b86",
                        "#8b5cf6",
                        "#ef4444",
                        "#06b6d4",
                        "#f59e0b",
                    ],
                    borderColor: "#ffffff",
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout:"60%",
                plugins:{
                    legend: {
                        display: false
                    },
                    toolt: {
                        callbacks: {
                            label: ctx => '${ctx.label}: ${ctx.parsed} unidades'
                        }
                    }
                }
            }
        }
    );
}

function actualizarAlertas() {
    const tabla = document.getElementById("tabla-stock"); tabla.replaceChildren();

    const bajos = productos.filter(p =>  p.stock <= p.stockMinimo).sort((a, b) => a.stock - b.stock);

    if (!bajos.length) {
        const fila = tabla.insertRow();
        const celda = fila.insertCell();

        celda.colSpan = 5;
        celda.className = "sin-alerta";
        celda.textContent = "No hay productos con stock bajo";
        return;
    }

    bajos.forEach(p => {
        const fila = tabla.insertRow();
        [
            p.nombre,
            p.stock,
            p.stockMinimo,
            Math.max(0, p.stockMinimo - p.stock)
        ].forEach(valor => {
            fila.insertCell().textContent = valor;
        });

        const estado = document.createElement("span");

        estado.className = p.stock === 0
        ? "estado agotado"
        : "estado stock-bajo";

        estado.textContent = p.stock === 0 
        ? "Agotado"
        : "Stock bajo"

        fila.insertCell().appendChild(estado);
    });
}

function actualizarTablaVentas(filtradas) {
    const tabla = document.getElementById("tabla-ventas");
    tabla.replaceChildren();

    if (!filtradas.length) {
        const fila = tabla.insertRow();
        const celda = fila.insertCell();

        celda.colSpan = 6;
        celda.className = "sin-alertas";
        celda.textContent = "No hay ventas en este periodo";
        return;
    }

    filtradas.forEach((venta, indice) => {
        const producto  = productos.find(
            p => p.id === venta.productoId
        );

        const fila = tabla.insertRow();
        [
            indice + 1,
            venta.fecha,
            producto
            ? producto.nombre
            : "Producto no disponible",
            venta.cantidad,

            formatearMoneda(venta.precioUnitario),
            formatearMoneda(calcularIngreso(venta))
        ].forEach(valor => {
            fila.insertCell().textContent = valor;
        });
    });
}

function actualizarDashboard() {
    const filtradas = filtrarVenta();

    document.getElementById("aviso-sin-ventas").hidden = filtradas.length > 0;

    const periodo = selectorMes.value === "todos"
    ? "Todos los meses"
    : nombreMeses[Number(selectorMes.value) - 1];

    document.getElementById("tutilo-ventas").textContent = 'Ventas por mes - Ingresos (₡) - ${periodo}';

    document.getElementById("titulo-produtos").textContent = 'Producto más vendido - Unidades vendidas - ${periodo}'

    actualizarIndicadores(filtradas);
    actualizarAlertas();
    actualizarTablaVentas(filtradas);

    if (typeof Chart === "undefined") {
        mensajeActualizacion.textContent = "No se pudo cargar Chart.js. Revisa tu conexión a internet.";
        return;
    }

    actualizarGraficoVentas(filtradas);
    actualizarGraficoProductos(filtradas);

    mensajeActualizacion.textContent = "Última actualización: " + new Date().toLocaleTimeString("es-CR");
}

async function cargarDatos() {
    if (cargandoDatos) return;

    cargandoDatos = true;
    mensajeActualizacion.textContent = "Consultando datos...";

    try {
        const respuesta = await fetch(API_URL);

        if (!respuesta.ok) {
            throw new Error("HTPPS " + respuesta.status);
        }
        
        const datos = await respuesta.json();

        if (
            !Array.isArray(datos.productos) || 
            !Array.isArray(datos.ventas)
        ) {
            throw new Error("La respuesta no contiene productos y ventas");
        }

        productos = datos.productos;
        ventas = datos.ventas;
        
        actualizarDashboard();
    } catch(error) {
        console.error("Error al cargar datos:". error);

        mensajeActualizacion.textContent = "No se pudieron actualizar los datos. Revisa la conexión";
    } finally {
        cargandoDatos = false;
    }
}

selectorMes.addEventListener(
    "change",
    actualizarDashboard
);

botonActualizar.addEventListener(
    "click",
    cargarDatos
);

setInterval(() => {
    if (document.visibilityState === "visible"){
        cargarDatos();
    }
}, 15000)

cargarDatos();