"use strict";

const API_BASE = "https://octo-erp.onrender.com";

let clientes = [];
let productos = [];
let ventasDashboard = [];
let carrito = [];
let guardarVenta = [];

const selectCliente = document.getElementById("cliente");
const selectProducto = document.getElementById("producto");
const inputCantidad = document.getElementById("cantidad");
const inputPrecio = document.getElementById("precio");

const botonAgregar = document.getElementById("btn-agregar");
const botonFactura = document.getElementById("btn-factura");
const cuerpoVenta = document.getElementById("cuerpo-venta");
const subtotalElemento = document.getElementById("subtotal-venta");
const ivaElemento = document.getElementById("iva-venta");
const totalElemento = document.getElementById("total-venta");

function moneda(valor) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2
    }).format(valor);
}

function mostrarHora() {
    const ahora = new Date();

    document.getElementById("fecha-actual").textContent = ahora.toLocaleDateString("es-CR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    document.getElementById("dia-actual").textContent = ahora.toLocaleTimeString("es-CR", {
        weekday: "long"
    });
}

function mostrarUsuario() {
    document.getElementById("nombre-usuario").textContent = "Sesion pendiente";

    document.getElementById("rol-usuario").textContent = "";

    document.getElementById("avatar-usuario").textContent = "?";
}

function mostrarMensaje(texto, esError = false) {
    mensajeElemento.textContent = texto;
    contenedorMensaje.hidden = false;

    mensajeElemento.style.color = esError ? "#b91c1c" : "#15803d"
}

document.getElementById("cerrar-mensaje").addEventListener("click", () => {
    contenedorMensaje.hidden = true;
});

async function consultarApi(ruta, opciones = {}) {
    const respuesta = await fetch(API_BASE + ruta, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            ...(opciones.headers || {})
        }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje || 'Error HTTP ${respuesta.status}'
        );
    }
    return datos;
}

async function cargarCliente() {
    clientes = await consultarApi("/api/clientes");

    selectCliente.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar cliente";
    selectCliente.appendChild(opcionInicial);

    clientes.forEach(cliente => {
        const opcion = document.createElement("option")

        opcion.value = cliente.id;
        opcion.textContent = cliente.nombre

        selectCliente.appendChild(opcion);
    });
}

async function cargarProductos() {
    productos = await consultarApi("api/productos");

    const seleccionAnterior = selectCliente.value;
    selectProducto.replaceChildren();

    const opcionInicial = document.createElement("option")
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar producto";
    selectProducto.appendChild(opcionInicial);

    productos.forEach(producto => {
        const opcion = document.createElement("option");

        opcion.value = producto.id;
        opcion.textContent = '${producto.nombre} - ${moneda(producto.precio)} ' + '(Stock: ${producto.stock})';

        opcion.disabled = producto.stock <= 0;

        selectProducto.appendChild(opcion);
    });

    if (
        productos.some(p => 
            String(p.id) === seleccionAnterior && 
            p.stock > 0)
    ) {
        selectProducto.value = seleccionAnterior;
    }
    actualizarPrecio();
}

function actualizarPrecio() {
    const id = Numbre(selectProducto.value);

    const producto = productos.find(p => p.id === id);

    if (!producto) {
        inputPrecio.value = "";
        return;
    }
    inputPrecio.value = moneda(producto.precio);
}