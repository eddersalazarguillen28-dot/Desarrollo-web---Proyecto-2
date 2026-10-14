"use strict";

const API = "https://octo-erp.onrender.com"

let productos = [];
let carrito = [];
let guardando = false;

const cliente = document.getElementById("clientes");
const producto = document.getElementById("producto");
const cantidad = document.getElementById("cantidad");
const precio = document.getElementById("precio");
const agregar = document.getElementById("btn-agregar");
const registrar = document.getElementById("btn-factura");
const tabla = document.getElementById("cuerpo-venta");
const subtotal = document.getElementById("subtotal-venta");
const impuesto = document.getElementById("iva-venta");
const total = document.getElementById("total-venta");
const mensaje = document.getElementById("mensaje-venta");
const contenedor = document.getElementById("cotenedor-mensaje");
const cerrar = document.getElementById("cerrar-mensaje");

function moneda(numero) {
    return "₡" + Number(numero).toLocaleString("es-CR");
}

function avisar(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.style.color = error ? "red" :
    "green" ;
    contenedor.hidden = false;
}

cerrar.addEventListener("click", function () {
    contenedor.hidden = true;
});

async function consultar(ruta, opciones = {}) {
    const respuesta = await fetch(API + ruta, opciones);
    const datos = await respuesta.json();

    if (!respuesta.ok || datos.status === "error") {
        throw new Error(
            datos.message || datos.error || "Error del servidor"
        );
    }
    return datos;
}

async function cargarCliente() {
    const datos = await consultar("/api/clientes");

    const list = Array.isArray(datos) ? datos : datos.clientes;

    if (!Array.isArray(lista)) {
        throw new Error("No se recibieron clientes");
    }

    cliente.innerHTML = '<option value="">Seleccionar cliente</option>';

    lista.forEach(function (c) {
        const opcion = document.createElement("option");

        opcion.value = c.id;
        opcion.textContent = c.nombre;

        cliente.appendChild(opcion);
    });
}

async function cargarProdutos() {
    const datos = await consultar("/api/productos");

    productos = Array.isArray(datos)
    ? datos
    : datos.productos;

    if (!Array.isArray(productos)) {
        throw new Error("No se recibieron productos");
    }

    producto.innerHTML = '<option value="">Seleccionar producto</option>';

    productos.forEach(function (p) {
        const opcion = document.createElement("option");

        opcion.value = p.id;
        opcion.textContent = p.nombre + " - " + moneda(p.precio);

        if (Number(p.stock) <= 0) {
            opcion.disabled = true;
            opcion.textContent += " (Sin stock)";
        }
        producto.appendChild(opcion);
    });
    precio.value = "";
}

producto.addEventListener("change", function () {
    const seleccionado = productos.find(function (p) {
        return String(p.id) === producto.value;
    });

    precio.value = seleccionado 
    ? moneda(seleccionado.precio)
    : "";
});

//Continuar desde agregar al carrito