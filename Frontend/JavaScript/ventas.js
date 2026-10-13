"use strict";

const API_BASE = "https://octo-erp.onrender.com";

let clientes = [];
let productos = [];
let ventasDashboard = [];
let carrito = [];
let guardarVenta = [];
let datosCargados = [];

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
    const nombre = document.getElementById("nombre-usuario");

    const rol = document.getElementById("rol-usuario");

    const avatar = document.getElementById("avatar-usuario");

    if (nombre) {
        nombre.textContent = "Sesión prendiente";
    }

    if (rol) {
        rol.textContent = "";
    }

    if (avatar) {
        avatar.textContent = "?"
    }
}

function mostrarMensaje(texto, esError = false) {
    const mensajeElemento = document.getElementById("mensaje-venta");
    const contenedorMensaje = document.getElementById("contenedor-mensaje");

    mensajeElemento.style.color = esError ? "#b91c1c" : "#15803d"
}

document.getElementById("cerrar-mensaje").addEventListener("click", () => {
    contenedorMensaje.hidden = true;
});

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

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            datos.message || 'Error HTTP ${respuesta.status}'
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

function agregarProducto() {
    if (!datosCargados || guardarVenta) 
        return;

    const id = Number(selectProducto.value);
    const cantidad = Number(inputCantidad.value)

    const producto = productos.find(p => p.id === id);

    if (!producto) {
        mostrarMensaje("Seleccione un producto", true);
        return;
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        mostrarMensaje("Introduce una cantidad váalida", true);
        return;
    }

    const existente = carrito.find(p => p.id === id);
    const cantidadActual = existente ? existente.cantidad : 0;

    if (existente) {
        existente.cantidad += cantidad;
    }
    else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            cantidad
        });
    }
    renderizarCarrito();
    inputCantidad.value = 1;
    contenedorMensaje.hidden = true;
}

function eliminarProducto(id) {
    if (guardarVenta)
        return;

    carrito = carrito.filter(p => p.id !== id);
    renderizarCarrito();
}

function renderizarCarrito() {
    cuerpoVenta.replaceChildren();

    if (carrito.length === 0) {
        const fila = cuerpoVenta.insertRow();
        const celda = fila.insertCell();

        celda.colSpan = 5;
        celda.textContent = "Todavia no hay productos agregados";
        }
        carrito.forEach(producto => {
            const fila = cuerpoVenta.insertRow();

            fila.insertCell().textContent = producto.nombre

            fila.insertCell().textContent ='x${producto.cantidad}';

            fila.insertCell().textContent = moneda(producto.precio);

            fila.insertCell().textContent = moneda(producto.precio + producto.cantidad);

            const celdaBoton = fila.insertCell();
            const boton = document.createElement("button");
            
            boton.type = "button";
            boton.className = "btn-delete";
            boton.textContent = "Eliminar";
            boton.disabled = guardarVenta;

            boton.addEventListener("click", () => {
                eliminarProducto(producto.id);
            });

            celdaBoton.appendChild(boton);
        });
        
        actualizarTotales();
        actualizarBotones();
}

function actualizarTotales() {
    const subtotal = carrito.reduce(
        (total, p) => total + p.precio * p.cantidad, 0
    );

    subtotalElemento.textContent = moneda(subtotal);

    ivaElemento.textContent = "No configurado";

    totalElemento.textContent = moneda(subtotal);
}

function actualizarBotones() {
    botonAgregar.disabled = !datosCargados ||guardarVenta;

    botonFactura.disabled = !datosCargados || guardarVenta || carrito.length === 0;
}

async function cargarPopulares() {
    const contenedor = document.getElementById("productos-populares-lista");

    contenedor.replaceChildren();

    const datos = await consultarApi("/api/dashboard")

    if (!Array.isArray(datos.ventas)) {
        throw new Error("El dashboard no devolvió ventas");
    }

    ventasDashboard = datos.ventas;

    const ranking = productos.map(productos => {
        const unidades = ventasDashboard.filter(v => v.productoId === productos.id).reduce((suma, v) => suma + v.cantidad, 0);

        return{
            ...producto, unidades
        };
    });

    ranking.sort((a, b) => b.unidades - a.unidades);

    const vendidos = ranking.filter(p => p.unidades > 0).slice(0, 5);

    if (vendidos.length === 0) {
        contenedor.textContent = "Todavia no hay productos vendidos";
        return;
    }

    vendidos.forEach(producto => {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "pill-producto";
        boton.textContent = producto.nombre;
        boton.disabled = producto.stock <= 0;

        boton.addEventListener("click", () => {
            selectProducto.value = String(producto.id);
            actualizarPrecio();
        });
        contenedor.appendChild(boton);
    });
}

async function registrarVenta() {
    if (guardarVenta || !datosCargados)
        return;

    const clienteId = Number(selectCliente.value);

    if (!clienteId) {
        mostrarMensaje("Selecciona un cliente", true);
        return;
    }

    if (carrito.length === 0) {
        mostrarMensaje("Agrega al menos un producto", true);
        return;
    }

    const datosVenta = {
        cliente_id: clienteId,
        productos: carrito.map(p => ({
            producto_id: p.id,
            cantidad: p.cantidad
        }))
    };

    guardarVenta = true;
    actualizarBotones();
    botonFactura.textContent = "Guardando venta...";
    renderizarCarrito();

    try {
        const resultado = await consultarApi("/api/ventas", {
            method: "POST",
            body: JSON.stringify(datosVenta)
        }
    );

    carrito = [];
        renderizarCarrito();

        await cargarProductos();

        try {
            await cargarPopulares();
        } catch (error) {
            console.warn("No se pudo actualizar el ranking", error);
        }

        mostrarMensaje('Venta #${resultado.venta_id} registada correctamente');

    }catch (error) {
        console.error("Error al registrar venta:", error);

        mostrarMensaje("No se pudo registrar la venta: " + error.message, true);
    } finally {
        guardarVenta = false;
        botonFactura.textContent = "Registrar venta";
        renderizarCarrito();
    }
}

selectProducto.addEventListener("change", actualizarPrecio);

botonAgregar.addEventListener("click", agregarProducto);

botonFactura.addEventListener("click", registrarVenta);

//Menu sin ruta configurada
document.querySelectorAll("[data-pagina]").forEach(enlace => {
    enlace.addEventListener("click", evento => {
        evento.preventDefault();

        mostrarMensaje("Esta seccion todavia no tiene una ruta configurada", true);
    });
});

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
                "No se pudieron cargar los productos populares", error
            );
        }
    } catch (error) {
        console.error("Error al iniciar ventas:", error);

        mostrarMensaje(
            "No se pudieron cargar los datos desde PostgresSQL" + "Compruebe que la API esté funcionando", true
        );
    }
}

function mostrarFecha() {
    const ahora = new Date();

    const fechaElemento = document.getElementById("fecha-actual");

    const diaElemento = document.getElementById("dia=actual");

    if (fechaElemento) {
        diaElemento,textContent = ahora.toLocaleDateString("es-CR", {
            weekday: "long"
        });
    }
}

iniciarPagina();