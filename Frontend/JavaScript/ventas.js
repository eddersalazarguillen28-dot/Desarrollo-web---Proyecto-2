
// ==================================================
// 1. CONFIGURACIÓN
// ==================================================

const API = "https://octo-erp.onrender.com";

const CLAVE_TOKEN = "token";

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

const IVA = 0.13;

// ==================================================
// 2. FORMATO DE MONEDA
// ==================================================

function moneda(numero) {
    const valor = Number(numero);

    if (!Number.isFinite(valor)) {
        return "₡0";
    }

    return "₡" + valor.toLocaleString("es-CR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// ==================================================
// 3. MENSAJES
// ==================================================

function avisar(texto, error = false) {
    if (!mensaje) {
        alert(texto);
        return;
    }

    mensaje.textContent = texto;
    mensaje.style.color = error ? "red" : "green";

    if (contenedor) {
        contenedor.hidden = false;
    }
}

if (cerrar) {
    cerrar.addEventListener("click", function () {
        if (contenedor) {
            contenedor.hidden = true;
        }
    });
}

// ==================================================
// 4. CONSULTAR LA API
// ==================================================

async function consultar(ruta, opciones = {}) {
    const token = localStorage.getItem(CLAVE_TOKEN);

    const headers = {
        ...(opciones.headers || {})
    };

    if (opciones.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    // Las rutas protegidas pueden utilizar el token de sesión.
    if (token && !headers["Authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let respuesta;

    try {
        respuesta = await fetch(API + ruta, {
            ...opciones,
            headers
        });
    } catch (error) {
        console.error("Error de conexión con la API:", error);

        throw new Error(
            "No se pudo conectar con el servidor de Render. " +
            "Comprueba tu conexión e inténtalo nuevamente."
        );
    }

    const texto = await respuesta.text();

    let datos = {};

    try {
        datos = texto ? JSON.parse(texto) : {};
    } catch {
        console.error("Respuesta no JSON de la API:", texto);

        throw new Error(
            "El servidor devolvió una respuesta no válida."
        );
    }

    if (!respuesta.ok || datos.status === "error") {
        if (respuesta.status === 401) {
            throw new Error(
                "Tu sesión venció o no es válida. Inicia sesión nuevamente."
            );
        }

        if (respuesta.status === 403) {
            throw new Error(
                "Tu usuario no tiene permisos para realizar esta operación."
            );
        }

        throw new Error(
            datos.message ||
            datos.mensaje ||
            datos.error ||
            `Error del servidor: HTTP ${respuesta.status}`
        );
    }

    return datos;
}

// ==================================================
// 5. CARGAR CLIENTES
// ==================================================

async function cargarClientes() {
    const datos = await consultar("/api/clientes");

    const lista = Array.isArray(datos)
        ? datos
        : datos.clientes;

    if (!Array.isArray(lista)) {
        throw new Error("No se recibieron clientes del servidor.");
    }

    if (!cliente) {
        throw new Error("No se encontró el selector de clientes en el HTML.");
    }

    cliente.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar cliente";

    cliente.appendChild(opcionInicial);

    lista.forEach(function (c) {
        const opcion = document.createElement("option");

        opcion.value = c.id;
        opcion.textContent = c.nombre || c.correo || `Cliente ${c.id}`;

        cliente.appendChild(opcion);
    });
}

// ==================================================
// 6. CARGAR PRODUCTOS
// ==================================================

async function cargarProductos() {
    const datos = await consultar("/api/productos");

    productos = Array.isArray(datos)
        ? datos
        : datos.productos;

    if (!Array.isArray(productos)) {
        throw new Error("No se recibieron productos del servidor.");
    }

    if (!producto) {
        throw new Error("No se encontró el selector de productos en el HTML.");
    }

    producto.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar producto";

    producto.appendChild(opcionInicial);

    productos.forEach(function (p) {
        const opcion = document.createElement("option");

        opcion.value = p.id;
        opcion.textContent =
            `${p.nombre} - ${moneda(p.precio)}`;

        if (Number(p.stock) <= 0) {
            opcion.disabled = true;
            opcion.textContent += " (Sin stock)";
        }

        producto.appendChild(opcion);
    });

    if (precio) {
        precio.value = "";
    }
}

// ==================================================
// 7. MOSTRAR PRECIO DEL PRODUCTO SELECCIONADO
// ==================================================

if (producto) {
    producto.addEventListener("change", function () {
        const seleccionado = productos.find(function (p) {
            return String(p.id) === producto.value;
        });

        if (precio) {
            precio.value = seleccionado
                ? moneda(seleccionado.precio)
                : "";
        }

        if (cantidad) {
            cantidad.max = seleccionado
                ? String(Number(seleccionado.stock))
                : "";
        }
    });
}

// ==================================================
// 8. AGREGAR PRODUCTOS A LA VENTA
// ==================================================

if (agregar) {
    agregar.addEventListener("click", function () {
        if (guardando) {
            return;
        }

        const seleccionado = productos.find(function (p) {
            return producto &&
                String(p.id) === producto.value;
        });

        if (!seleccionado) {
            avisar("Selecciona un producto válido.", true);
            return;
        }

        const unidades = Number(cantidad ? cantidad.value : 0);

        if (!Number.isInteger(unidades) || unidades < 1) {
            avisar("Introduce una cantidad entera mayor que cero.", true);
            return;
        }

        const stockDisponible = Number(seleccionado.stock);

        if (!Number.isFinite(stockDisponible) || stockDisponible < 0) {
            avisar("El stock de este producto no es válido.", true);
            return;
        }

        const existente = carrito.find(function (p) {
            return String(p.id) === String(seleccionado.id);
        });

        const acumulado = existente
            ? existente.cantidad
            : 0;

        if (acumulado + unidades > stockDisponible) {
            avisar(
                `Stock insuficiente. Disponibles: ${stockDisponible}.`,
                true
            );
            return;
        }

        const precioProducto = Number(seleccionado.precio);

        if (!Number.isFinite(precioProducto) || precioProducto < 0) {
            avisar("El precio del producto no es válido.", true);
            return;
        }

        if (existente) {
            existente.cantidad += unidades;
            existente.precio = precioProducto;
            existente.nombre = seleccionado.nombre;
        } else {
            carrito.push({
                id: seleccionado.id,
                nombre: seleccionado.nombre,
                precio: precioProducto,
                cantidad: unidades
            });
        }

        if (cantidad) {
            cantidad.value = "1";
        }

        avisar("Producto agregado a la venta.");
        mostrarCarrito();
    });
}

// ==================================================
// 9. MOSTRAR CARRITO DE VENTA Y TOTALES
// ==================================================

function mostrarCarrito() {
    if (!tabla) {
        console.error("No se encontró la tabla cuerpo-venta.");
        return;
    }

    tabla.replaceChildren();

    carrito.forEach(function (p) {
        const fila = document.createElement("tr");

        const nombre = document.createElement("td");
        nombre.textContent = p.nombre;

        const unidades = document.createElement("td");
        unidades.textContent = String(p.cantidad);

        const precioUnidad = document.createElement("td");
        precioUnidad.textContent = moneda(p.precio);

        const importe = document.createElement("td");
        importe.textContent = moneda(p.precio * p.cantidad);

        const accion = document.createElement("td");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.textContent = "Eliminar";
        boton.className = "btn-delete";
        boton.disabled = guardando;

        boton.addEventListener("click", function () {
            if (guardando) {
                return;
            }

            carrito = carrito.filter(function (item) {
                return String(item.id) !== String(p.id);
            });

            mostrarCarrito();
        });

        accion.appendChild(boton);

        fila.append(
            nombre,
            unidades,
            precioUnidad,
            importe,
            accion
        );

        tabla.appendChild(fila);
    });

    if (carrito.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.textContent = "No hay productos agregados.";

        fila.appendChild(celda);
        tabla.appendChild(fila);
    }

    const suma = carrito.reduce(function (acumulado, p) {
        return acumulado + p.precio * p.cantidad;
    }, 0);

    const iva = suma * IVA;
    const totalConIva = suma + iva;

    if (subtotal) {
        subtotal.textContent = moneda(suma);
    }

    if (impuesto) {
        impuesto.textContent = moneda(iva);
    }

    if (total) {
        total.textContent = moneda(totalConIva);
    }

    if (registrar) {
        registrar.disabled = guardando || carrito.length === 0;
    }

    if (agregar) {
        agregar.disabled = guardando;
    }
}

// ==================================================
// 10. REGISTRAR VENTA EN POSTGRESQL
// ==================================================

if (registrar) {
    registrar.addEventListener("click", async function () {
        if (guardando) {
            return;
        }

        if (!cliente || !cliente.value) {
            avisar("Selecciona un cliente.", true);
            return;
        }

        if (carrito.length === 0) {
            avisar("Agrega al menos un producto a la venta.", true);
            return;
        }

        const token = localStorage.getItem(CLAVE_TOKEN);

        if (!token) {
            avisar(
                "No hay una sesión activa. Inicia sesión nuevamente.",
                true
            );
            return;
        }

        const detallesInvalidos = carrito.some(function (p) {
            return (
                p.id === null ||
                p.id === undefined ||
                !Number.isInteger(Number(p.cantidad)) ||
                Number(p.cantidad) < 1
            );
        });

        if (detallesInvalidos) {
            avisar("Hay productos con cantidades inválidas.", true);
            return;
        }

        const venta = {
            cliente_id: Number(cliente.value),
            detalles: carrito.map(function (p) {
                return {
                    producto_id: Number(p.id),
                    cantidad: Number(p.cantidad)
                };
            })
        };

        if (
            !Number.isInteger(venta.cliente_id) ||
            venta.cliente_id < 1 ||
            venta.detalles.some(function (p) {
                return !Number.isInteger(p.producto_id) ||
                    p.producto_id < 1;
            })
        ) {
            avisar("El cliente o los productos tienen IDs inválidos.", true);
            return;
        }

        guardando = true;

        const textoOriginal = registrar.textContent;
        registrar.textContent = "Guardando...";
        mostrarCarrito();

        try {
            /*
             * Esta ruta es para ventas del panel administrativo.
             * El backend debe permitir el rol correspondiente
             * y comprobar el stock y los precios en PostgreSQL.
             */
            const datos = await consultar("/api/ventas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(venta)
            });

            carrito = [];
            mostrarCarrito();

            const idVenta =
                datos.venta_id ??
                datos.id_venta ??
                datos.id;

            avisar(
                "Venta registrada correctamente." +
                (
                    idVenta != null
                        ? ` Número: ${idVenta}`
                        : ""
                )
            );

            await cargarProductos();

            if (producto) {
                producto.value = "";
            }

            if (precio) {
                precio.value = "";
            }

            if (cantidad) {
                cantidad.value = "1";
            }

        } catch (error) {
            console.error("Error registrando la venta:", error);

            avisar(
                "No se pudo registrar la venta: " + error.message,
                true
            );
        } finally {
            guardando = false;
            registrar.textContent = textoOriginal || "Registrar venta";
            mostrarCarrito();
        }
    });
}

// ==================================================
// 11. INICIALIZAR MÓDULO
// ==================================================

async function iniciar() {
    if (agregar) {
        agregar.disabled = true;
    }

    if (registrar) {
        registrar.disabled = true;
    }

    try {
        await Promise.all([
            cargarClientes(),
            cargarProductos()
        ]);

        if (agregar) {
            agregar.disabled = false;
        }

        avisar("Clientes y productos cargados correctamente.");

    } catch (error) {
        console.error("Error al cargar datos:", error);

        avisar(
            "Error al cargar datos: " + error.message,
            true
        );
    }

    mostrarCarrito();
}

iniciar();
