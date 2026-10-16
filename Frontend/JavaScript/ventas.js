"use strict";

const API = "https://octo-erp.onrender.com"

let productos = [];
let carrito = [];
let guardando = false;

const cliente = document.getElementById("cliente");
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
    
    if (!mensaje) {
        alert(texto);
        return;
    }

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

    const lista = Array.isArray(datos) ? datos : datos.clientes;

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
    if (precio){
        precio.value = "";
    }
}

producto.addEventListener("change", function () {
    const seleccionado = productos.find(function (p) {
        return String(p.id) === producto.value;
    });

    if (precio){
        precio.value = seleccionado 
        ? moneda(seleccionado.precio)
        : "";
    }
});

agregar.addEventListener("click", function () {
    if (guardando) return;

    const seleccionado = productos.find(function (p){
        return String(p.id) === producto.value;
    });

    const unidades = Number(cantidad.value);

    if (!seleccionado) {
        avisar("Introduce una cantidad válida", true);
    }

    const existente = carrito.find(function (p){
        return p.id === seleccionado.id;
    });

    const acumulado = existente ? existente.cantidad : 0;

    if (acumulado + unidades > Number(seleccionado.stock)) { 
        avisar("No hay suficiente stock", true);
        return;
    }

    if (existente) { 
        existente.cantidad += unidades;
    } else {
        carrito.push({
            id: seleccionado.id,
            nombre: seleccionado.nombre,
            precio: Number(seleccionado.precio),
            cantidad: unidades
        });
    }
    cantidad.value = 1;
    if (contenedor) {
        contenedor.hidden = false;
    }
    mostrarCarrito();
});

function mostrarCarrito() {
    tabla.innerHTML = "";

    carrito.forEach(function (p) {
        const fila = document.createElement("tr");
        const nombre = document.createElement("td");
        nombre.textContent = p.nombre;

        const unidades = document.createElement("td");
        unidades.textContent = p.cantidad;

        const precioUnidad = document.createElement("td");
        precioUnidad.textContent = moneda(p.precio);

        const importe = document.createElement("td");
        importe.textContent = moneda(p.precio * p.cantidad)

        const accion = document.createElement("td");
        const boton = document.createElement("button");

        boton.textContent = "Eliminar";
        boton.className = "btn-delete";
        boton.disabled = guardando;

        boton.addEventListener("click", function (){
            carrito = carrito.filter(function(item){
                return item.id !== p.id;
            });
            mostrarCarrito();
        });

        accion.appendChild(boton);

        fila.appendChild(nombre);
        fila.appendChild(unidades);
        fila.appendChild(precioUnidad);
        fila.appendChild(importe);
        fila.appendChild(accion);

        tabla.appendChild(fila);
    });

    if (carrito.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.textContent = "No hay productos agregados";

        fila.appendChild(celda);
        tabla.appendChild(fila);
    }

    const suma = carrito.reduce(function (acumulado, p) {
        return acumulado + p.precio * p.cantidad;
    }, 0);

    const iva = suma * 0.13;
    const totalConIva = suma + iva;

    subtotal.textContent = moneda(suma);
    impuesto.textContent = moneda(iva);
    total.textContent = moneda(totalConIva);

    registrar.disabled = guardando || carrito.length === 0;
    agregar.disabled = guardando;
}

registrar.addEventListener("click", async function () {
    if (guardando) return;

    if (!cliente.value) {
        avisar("Selecciona un cliente", true);
        return;
    }

    if (carrito.length === 0) {
        avisar("Agrega productos al carrito", true);
        return;
    }

    const venta = {
        cliente_id: Number(cliente.value),
        detalles: carrito.map(function (p) {
            return {
                producto_id: Number(p.id),
                cantidad: p.cantidad
            };
        })
    };

    guardando = true;
    registrar.textContent = "Guardando...";
    mostrarCarrito();

    try {
        const datos = await consultar("/api/ventas", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(venta)
        });

        carrito = [];
        mostrarCarrito();
        
        avisar("Venta registrada correctamente. Numero: " + (datos.venta_id || "confirmado"));
        
        await cargarProdutos();
    } catch (error) {
        avisar("Error: " + error.message, true);
    } finally {
        guardando = false;
        registrar.textContent = "Registrar venta";
        mostrarCarrito();
    }
});

async function iniciar() {
    agregar.disabled = true;
    registrar.disabled = true;

    try {
        await Promise.all([
            cargarCliente(),
            cargarProdutos()
        ]);
        agregar.disabled = false;
    } catch (error) {
       console.error("Error al cargar datos:", error);
       avisar("Error al cargar datos: " + error.message, true)
    }
    mostrarCarrito();
}

iniciar();