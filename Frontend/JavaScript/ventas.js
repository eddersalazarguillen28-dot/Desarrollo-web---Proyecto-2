"use strict";

const API_BASE = "https://octo-erp.onrender.com";

let clientes = [];
let productos = [];
let ventasDashboard = [];
let carrito = [];
let guardandoVenta = false;
let datosCargados = false;

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

const mensajeElemento = document.getElementById("mensaje-venta");
const contenedorMensaje = document.getElementById("contenedor-mensaje");
const botonCerrarMensaje = document.getElementById("cerrar-mensaje");

function moneda(valor) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2
    }).format(valor);
}

function mostrarFecha() {
    const ahora = new Date();
    const fechaElemento = document.getElementById("fecha-actual");
    const diaElemento = document.getElementById("dia-actual");

    if (fechaElemento) {
        fechaElemento.textContent = ahora.toLocaleDateString("es-CR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    if (diaElemento) {
        diaElemento.textContent = ahora.toLocaleDateString("es-CR", {
            weekday: "long"
        });
    }
}

function mostrarUsuario() {
    const nombre = document.getElementById("nombre-usuario");
    const rol = document.getElementById("rol-usuario");
    const avatar = document.getElementById("avatar-usuario");

    if (nombre) nombre.textContent = "Usuario";
    if (rol) rol.textContent = "";
    if (avatar) avatar.textContent = "?";
}

function mostrarMensaje(texto, esError = false) {
    if (mensajeElemento) {
        mensajeElemento.textContent = texto;
        mensajeElemento.style.color = esError ? "#b91c1c" : "#15803d";
    }

    if (contenedorMensaje) {
        contenedorMensaje.hidden = false;
    }
}

if (botonCerrarMensaje) {
    botonCerrarMensaje.addEventListener("click", () => {
        if (contenedorMensaje) {
            contenedorMensaje.hidden = true;
        }
    });
}

async function consultarApi(ruta, opciones = {}) {
    const headers = {
        ...(opciones.headers || {})
    };

    if (opciones.body) {
        headers["Content-Type"] = "application/json";
    }

    const respuesta = await fetch(API_BASE + ruta, {
        ...opciones,
        headers
    });

    const texto = await respuesta.text();
    let datos = {};

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            throw new Error(
                `La API devolvió una respuesta no válida (HTTP ${respuesta.status}).`
            );
        }
    }

    if (!respuesta.ok) {
        throw new Error(
            datos.error ||
            datos.message ||
            `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}

async function cargarCliente() {
    const respuesta = await consultarApi("/api/clientes");

    // Admite tanto un arreglo como { clientes: [...] }.
    clientes = Array.isArray(respuesta)
        ? respuesta
        : respuesta.clientes;

    if (!Array.isArray(clientes)) {
        throw new Error("La API de clientes no devolvió una lista.");
    }

    selectCliente.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar cliente";
    selectCliente.appendChild(opcionInicial);

    clientes.forEach(cliente => {
        const opcion = document.createElement("option");
        opcion.value = cliente.id;
        opcion.textContent = cliente.nombre;
        selectCliente.appendChild(opcion);
    });
}

async function cargarProductos() {
    const seleccionAnterior = selectProducto.value;
    const respuesta = await consultarApi("/api/productos");

    productos = Array.isArray(respuesta)
        ? respuesta
        : respuesta.productos;

    if (!Array.isArray(productos)) {
        throw new Error("La API de productos no devolvió una lista.");
    }

    selectProducto.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar producto";
    selectProducto.appendChild(opcionInicial);

    productos.forEach(producto => {
        const opcion = document.createElement("option");

        opcion.value = producto.id;
        opcion.textContent =
            `${producto.nombre} - ${moneda(Number(producto.precio))} ` +
            `(${producto.stock} en stock)`;

        opcion.disabled = Number(producto.stock) <= 0;
        selectProducto.appendChild(opcion);
    });

    if (productos.some(producto =>
        String(producto.id) === seleccionAnterior &&
        Number(producto.stock) > 0
    )) {
        selectProducto.value = seleccionAnterior;
    }

    actualizarPrecio();
}

function actualizarPrecio() {
    const id = Number(selectProducto.value);
    const producto = productos.find(p => Number(p.id) === id);

    inputPrecio.value = producto
        ? moneda(Number(producto.precio))
        : "";
}

function agregarProducto() {
    if (!datosCargados || guardandoVenta) return;

    const id = Number(selectProducto.value);
    const cantidad = Number(inputCantidad.value);
    const producto = productos.find(p => Number(p.id) === id);

    if (!producto) {
        mostrarMensaje("Selecciona un producto.", true);
        return;
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        mostrarMensaje("Introduce una cantidad entera mayor que cero.", true);
        return;
    }

    const existente = carrito.find(p => p.id === id);
    const cantidadActual = existente ? existente.cantidad : 0;

    if (cantidadActual + cantidad > Number(producto.stock)) {
        mostrarMensaje(
            `Stock insuficiente. Disponible: ${producto.stock}.`,
            true
        );
        return;
    }

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            id: Number(producto.id),
            nombre: producto.nombre,
            precio: Number(producto.precio),
            cantidad
        });
    }

    renderizarCarrito();
    inputCantidad.value = "1";

    if (contenedorMensaje) contenedorMensaje.hidden = true;
}

function eliminarProducto(id) {
    if (guardandoVenta) return;

    carrito = carrito.filter(p => p.id !== id);
    renderizarCarrito();
}

function renderizarCarrito() {
    cuerpoVenta.replaceChildren();

    if (carrito.length === 0) {
        const fila = cuerpoVenta.insertRow();
        const celda = fila.insertCell();

        celda.colSpan = 5;
        celda.textContent = "Todavía no hay productos agregados.";
    } else {
        carrito.forEach(producto => {
            const fila = cuerpoVenta.insertRow();

            fila.insertCell().textContent = producto.nombre;
            fila.insertCell().textContent = `x${producto.cantidad}`;
            fila.insertCell().textContent = moneda(producto.precio);
            fila.insertCell().textContent = moneda(
                producto.precio * producto.cantidad
            );

            const celdaBoton = fila.insertCell();
            const boton = document.createElement("button");

            boton.type = "button";
            boton.className = "btn-delete";
            boton.textContent = "Eliminar";
            boton.disabled = guardandoVenta;

            boton.addEventListener("click", () => {
                eliminarProducto(producto.id);
            });

            celdaBoton.appendChild(boton);
        });
    }

    actualizarTotales();
    actualizarBotones();
}

function actualizarTotales() {
    const subtotal = carrito.reduce(
        (total, producto) =>
            total + producto.precio * producto.cantidad,
        0
    );

    subtotalElemento.textContent = moneda(subtotal);
    ivaElemento.textContent = "No configurado";
    totalElemento.textContent = moneda(subtotal);
}

function actualizarBotones() {
    botonAgregar.disabled = !datosCargados || guardandoVenta;

    botonFactura.disabled =
        !datosCargados ||
        guardandoVenta ||
        carrito.length === 0;
}

async function cargarPopulares() {
    const contenedor = document.getElementById("productos-populares-lista");
    if (!contenedor) return;

    contenedor.replaceChildren();

    const datos = await consultarApi("/api/dashboard");

    if (!Array.isArray(datos.ventas)) {
        throw new Error("El dashboard no devolvió la lista de ventas.");
    }

    ventasDashboard = datos.ventas;

    const ranking = productos.map(producto => {
        const unidades = ventasDashboard
            .filter(venta =>
                Number(venta.productoId) === Number(producto.id)
            )
            .reduce(
                (suma, venta) => suma + Number(venta.cantidad),
                0
            );

        return { ...producto, unidades };
    });

    ranking.sort((a, b) => b.unidades - a.unidades);

    const vendidos = ranking.filter(p => p.unidades > 0).slice(0, 5);

    if (vendidos.length === 0) {
        contenedor.textContent = "Todavía no hay productos vendidos.";
        return;
    }

    vendidos.forEach(producto => {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "pill-producto";
        boton.textContent = producto.nombre;
        boton.disabled = Number(producto.stock) <= 0;

        boton.addEventListener("click", () => {
            selectProducto.value = String(producto.id);
            actualizarPrecio();
        });

        contenedor.appendChild(boton);
    });
}

async function registrarVenta() {
    if (guardandoVenta || !datosCargados) return;

    const clienteId = Number(selectCliente.value);

    if (!clienteId) {
        mostrarMensaje("Selecciona un cliente.", true);
        return;
    }

    if (carrito.length === 0) {
        mostrarMensaje("Agrega al menos un producto.", true);
        return;
    }

    // El backend espera la propiedad "detalles", no "productos".
    const datosVenta = {
        cliente_id: clienteId,
        detalles: carrito.map(producto => ({
            producto_id: producto.id,
            cantidad: producto.cantidad
        }))
    };

    guardandoVenta = true;
    actualizarBotones();
    botonFactura.textContent = "Guardando venta...";
    renderizarCarrito();

    try {
        const resultado = await consultarApi("/api/ventas", {
            method: "POST",
            body: JSON.stringify(datosVenta)
        });

        carrito = [];
        renderizarCarrito();

        await cargarProductos();

        try {
            await cargarPopulares();
        } catch (error) {
            console.warn("No se pudo actualizar el ranking:", error);
        }

        mostrarMensaje(
            `Venta #${resultado.venta_id} registrada correctamente.`
        );
    } catch (error) {
        console.error("Error al registrar la venta:", error);

        mostrarMensaje(
            "No se pudo registrar la venta: " + error.message,
            true
        );
    } finally {
        guardandoVenta = false;
        botonFactura.textContent = "Registrar venta";
        renderizarCarrito();
    }
}

selectProducto.addEventListener("change", actualizarPrecio);
botonAgregar.addEventListener("click", agregarProducto);
botonFactura.addEventListener("click", registrarVenta);

async function iniciarPagina() {
    mostrarFecha();
    mostrarUsuario();
    renderizarCarrito();

    try {
        await Promise.all([
            cargarCliente(),
            cargarProductos()
        ]);

        datosCargados = true;
        actualizarBotones();

        try {
            await cargarPopulares();
        } catch (error) {
            console.warn(
                "No se pudieron cargar los productos populares:",
                error
            );
        }
    } catch (error) {
        console.error("Error al iniciar Ventas:", error);

        mostrarMensaje(
            "No se pudieron cargar los datos. Comprueba la API de Render.",
            true
        );
    }
}

iniciarPagina();