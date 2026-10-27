const API_URL = "https://octo-erp.onrender.com/api";
const CLAVE_CARRITO = "octo_carrito";
const CLAVE_USUARIO = "usuario";
const CLAVE_TOKEN = "token";

const formatoMoneda = new Intl.NumberFormat("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
});

// ==================================================
// 1. OBTENER Y GUARDAR EL CARRITO
// ==================================================

function obtenerCarrito() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(CLAVE_CARRITO) || "[]"
        );

        if (!Array.isArray(datos)) return [];

        return datos
            .filter(item =>
                item &&
                item.id_producto !== null &&
                item.id_producto !== undefined &&
                String(item.id_producto).trim() !== "" &&
                Number.isFinite(Number(item.precio)) &&
                Number(item.precio) >= 0 &&
                Number.isFinite(Number(item.cantidad)) &&
                Number(item.cantidad) > 0
            )
            .map(item => ({
                id_producto: item.id_producto,
                nombre: String(item.nombre || "Producto"),
                precio: Number(item.precio),
                cantidad: Math.floor(Number(item.cantidad))
            }))
            .filter(item => item.cantidad > 0);
    } catch (error) {
        console.error("Error leyendo el carrito:", error);
        return [];
    }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem(
            CLAVE_CARRITO,
            JSON.stringify(carrito)
        );
    } catch (error) {
        console.error("No se pudo guardar el carrito:", error);
        alert("No se pudo guardar el carrito en el navegador.");
        return false;
    }

    actualizarCarritoUI();
    return true;
}

// ==================================================
// 2. AGREGAR PRODUCTOS
// Uso: agregarAlCarrito(idProducto, nombre, precio)
// ==================================================

function agregarAlCarrito(idProducto, nombre, precio) {
    if (
        idProducto === null ||
        idProducto === undefined ||
        String(idProducto).trim() === ""
    ) {
        alert("El producto no tiene un ID válido.");
        return;
    }

    const precioNumerico = Number(precio);

    if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
        alert("El precio del producto no es válido.");
        return;
    }

    const nombreSeguro = String(nombre || "Producto").trim();

    if (!nombreSeguro) {
        alert("El producto no tiene un nombre válido.");
        return;
    }

    const carrito = obtenerCarrito();

    const existente = carrito.find(item =>
        String(item.id_producto) === String(idProducto)
    );

    if (existente) {
        existente.cantidad += 1;
        existente.precio = precioNumerico;
        existente.nombre = nombreSeguro;
    } else {
        carrito.push({
            id_producto: idProducto,
            nombre: nombreSeguro,
            precio: precioNumerico,
            cantidad: 1
        });
    }

    if (guardarCarrito(carrito)) {
        console.log("Producto agregado al carrito:", nombreSeguro);
    }
}

// ==================================================
// 3. MODIFICAR CANTIDADES
// ==================================================

function cambiarCantidad(idProducto, cambio) {
    const carrito = obtenerCarrito();

    const item = carrito.find(producto =>
        String(producto.id_producto) === String(idProducto)
    );

    if (!item) return;

    const nuevaCantidad = item.cantidad + Number(cambio);

    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(idProducto);
        return;
    }

    if (!Number.isInteger(nuevaCantidad)) return;

    item.cantidad = nuevaCantidad;
    guardarCarrito(carrito);
}

// ==================================================
// 4. ELIMINAR PRODUCTOS
// ==================================================

function eliminarDelCarrito(idProducto) {
    const carrito = obtenerCarrito().filter(item =>
        String(item.id_producto) !== String(idProducto)
    );

    guardarCarrito(carrito);
}

// ==================================================
// 5. MOSTRAR LOS PRODUCTOS DEL CARRITO
// ==================================================

function renderizarListaCarrito() {
    const contenedor = document.getElementById("carrito-items-lista");
    const totalEl = document.getElementById("carrito-monto-total");

    if (!contenedor) return;

    const carrito = obtenerCarrito();
    contenedor.replaceChildren();

    if (carrito.length === 0) {
        const mensaje = document.createElement("p");
        mensaje.className = "carrito-vacio-msg";
        mensaje.textContent = "Tu carrito está vacío actualmente.";
        contenedor.appendChild(mensaje);

        if (totalEl) totalEl.textContent = "₡0";
        return;
    }

    let totalMonto = 0;

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        totalMonto += subtotal;

        const fila = document.createElement("article");
        fila.className = "item-carrito";

        const info = document.createElement("div");
        info.className = "item-carrito-info";

        const titulo = document.createElement("h4");
        titulo.textContent = item.nombre;

        const precio = document.createElement("p");
        precio.textContent =
            `₡${formatoMoneda.format(item.precio)} por unidad`;

        const subtotalEl = document.createElement("p");
        subtotalEl.textContent =
            `Subtotal: ₡${formatoMoneda.format(subtotal)}`;

        info.append(titulo, precio, subtotalEl);

        const acciones = document.createElement("div");
        acciones.className = "item-carrito-acciones";

        const menos = document.createElement("button");
        menos.type = "button";
        menos.textContent = "−";
        menos.className = "btn-cantidad-carrito";
        menos.setAttribute(
            "aria-label",
            `Reducir cantidad de ${item.nombre}`
        );
        menos.addEventListener("click", () => {
            cambiarCantidad(item.id_producto, -1);
        });

        const cantidad = document.createElement("span");
        cantidad.className = "cantidad-carrito";
        cantidad.textContent = String(item.cantidad);
        cantidad.setAttribute("aria-label", "Cantidad");

        const mas = document.createElement("button");
        mas.type = "button";
        mas.textContent = "+";
        mas.className = "btn-cantidad-carrito";
        mas.setAttribute(
            "aria-label",
            `Aumentar cantidad de ${item.nombre}`
        );
        mas.addEventListener("click", () => {
            cambiarCantidad(item.id_producto, 1);
        });

        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.className = "btn-eliminar-item";
        eliminar.textContent = "🗑️";
        eliminar.title = "Eliminar producto";
        eliminar.setAttribute(
            "aria-label",
            `Eliminar ${item.nombre}`
        );
        eliminar.addEventListener("click", () => {
            eliminarDelCarrito(item.id_producto);
        });

        acciones.append(menos, cantidad, mas, eliminar);
        fila.append(info, acciones);
        contenedor.appendChild(fila);
    });

    if (totalEl) {
        totalEl.textContent = `₡${formatoMoneda.format(totalMonto)}`;
    }
}

// ==================================================
// 6. ACTUALIZAR EL CONTADOR DEL CARRITO
// ==================================================

function actualizarCarritoUI() {
    const carrito = obtenerCarrito();

    const totalItems = carrito.reduce(
        (suma, item) => suma + item.cantidad,
        0
    );

    const contador = document.getElementById("cart-count");

    if (contador) {
        contador.textContent = String(totalItems);
        contador.setAttribute(
            "aria-label",
            `${totalItems} productos en el carrito`
        );
    }

    renderizarListaCarrito();
}

// ==================================================
// 7. ABRIR Y CERRAR EL MODAL
// ==================================================

function toggleModalCarrito() {
    const modal = document.getElementById("modal-carrito");

    if (!modal) return;

    const oculto = modal.classList.contains("hidden");

    if (oculto) {
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        renderizarListaCarrito();
    } else {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }
}

// ==================================================
// 8. FINALIZAR COMPRA
// Requiere token válido y ruta de ventas adaptada.
// ==================================================

async function procesarCompra() {
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const token = localStorage.getItem(CLAVE_TOKEN);

    if (!token) {
        alert("Inicia sesión antes de finalizar la compra.");
        return;
    }

    let usuarioSesion;

    try {
        usuarioSesion = JSON.parse(
            localStorage.getItem(CLAVE_USUARIO) || "null"
        );
    } catch (error) {
        console.error("No se pudo leer el usuario:", error);
        usuarioSesion = null;
    }

    if (!usuarioSesion || usuarioSesion.id == null) {
        alert("No se encontró tu sesión. Inicia sesión nuevamente.");
        return;
    }

    const articulosInvalidos = carrito.some(item =>
        item.id_producto === null ||
        item.id_producto === undefined ||
        String(item.id_producto).trim() === "" ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad < 1
    );

    if (articulosInvalidos) {
        alert("Hay productos con datos incorrectos. Revisa el carrito.");
        return;
    }

    const botonComprar = document.getElementById("btn-finalizar-compra");

    if (botonComprar) {
        botonComprar.disabled = true;
        botonComprar.textContent = "Procesando compra...";
    }

    try {
        /*
         * El backend debe identificar al cliente mediante el token.
         * No enviamos el precio ni el total como datos confiables.
         */
        const payload = {
            detalles: carrito.map(item => ({
                producto_id: item.id_producto,
                cantidad: item.cantidad
            }))
        };

        const respuesta = await fetch(`${API_URL}/ventas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const texto = await respuesta.text();
        let resultado = {};

        try {
            resultado = texto ? JSON.parse(texto) : {};
        } catch {
            throw new Error("El servidor devolvió una respuesta no válida.");
        }

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                throw new Error(
                    "Tu sesión venció. Inicia sesión nuevamente."
                );
            }

            throw new Error(
                resultado.message ||
                resultado.mensaje ||
                resultado.error ||
                `Error HTTP ${respuesta.status}`
            );
        }

        if (resultado.status && resultado.status !== "ok") {
            throw new Error(
                resultado.message || "No se pudo registrar la compra."
            );
        }

        const idVenta = resultado.venta_id ?? resultado.id_venta;

        alert(
            `¡Compra realizada con éxito!${
                idVenta != null ? ` Número de orden #${idVenta}` : ""
            }`
        );

        localStorage.removeItem(CLAVE_CARRITO);
        actualizarCarritoUI();

        const modal = document.getElementById("modal-carrito");

        if (modal) {
            modal.classList.add("hidden");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        // Avisar a otros componentes que el carrito cambió.
        window.dispatchEvent(new CustomEvent("carritoActualizado"));

    } catch (error) {
        console.error("Error procesando la compra:", error);

        alert(
            "No se pudo procesar la compra: " +
            error.message
        );
    } finally {
        if (botonComprar) {
            botonComprar.disabled = false;
            botonComprar.textContent = "Finalizar Compra";
        }
    }
}

// ==================================================
// 9. DISPONER LAS FUNCIONES PARA EL HTML
// ==================================================

window.obtenerCarrito = obtenerCarrito;
window.guardarCarrito = guardarCarrito;
window.agregarAlCarrito = agregarAlCarrito;
window.cambiarCantidad = cambiarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
window.renderizarListaCarrito = renderizarListaCarrito;
window.actualizarCarritoUI = actualizarCarritoUI;
window.toggleModalCarrito = toggleModalCarrito;
window.procesarCompra = procesarCompra;

document.addEventListener("DOMContentLoaded", () => {
    actualizarCarritoUI();
});

window.addEventListener("storage", event => {
    if (event.key === CLAVE_CARRITO) {
        actualizarCarritoUI();
    }
});