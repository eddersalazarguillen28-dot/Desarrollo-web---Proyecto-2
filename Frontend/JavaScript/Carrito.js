
const API_URL = "https://octo-erp.onrender.com/api";
const CLAVE_CARRITO = "octo_carrito";

const formatoMoneda = new Intl.NumberFormat("es-CR", {
    maximumFractionDigits: 2
});

// ================================================
// 1. OBTENER Y GUARDAR EL CARRITO
// ================================================

function obtenerCarrito() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO));

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
            }));
    } catch (error) {
        console.error("Error leyendo el carrito:", error);
        return [];
    }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (error) {
        console.error("No se pudo guardar el carrito:", error);
        alert("No se pudo guardar el carrito en el navegador.");
        return false;
    }

    actualizarCarritoUI();
    return true;
}

// ================================================
// 2. AGREGAR PRODUCTOS
// ================================================

// IMPORTANTE: el orden de los parámetros es:
// agregarAlCarrito(idProducto, nombre, precio)

function agregarAlCarrito(idProducto, nombre, precio) {
    if (
        idProducto === null ||
        idProducto === undefined ||
        String(idProducto).trim() === ""
    ) {
        alert("No se puede agregar este producto porque no tiene un ID válido.");
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

    // Comparar como texto evita diferencias entre IDs numéricos y string.
    const existente = carrito.find(item =>
        String(item.id_producto) === String(idProducto)
    );

    if (existente) {
        existente.cantidad += 1;
        // Actualizar el precio por si la oferta cambió.
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
        console.log("Producto agregado:", {
            id_producto: idProducto,
            nombre: nombreSeguro,
            precio: precioNumerico
        });
    }
}

// ================================================
// 3. MODIFICAR CANTIDADES
// ================================================

function cambiarCantidad(idProducto, cambio) {
    const carrito = obtenerCarrito();

    const item = carrito.find(producto =>
        String(producto.id_producto) === String(idProducto)
    );

    if (!item) return;

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        const actualizado = carrito.filter(producto =>
            String(producto.id_producto) !== String(idProducto)
        );

        guardarCarrito(actualizado);
        return;
    }

    guardarCarrito(carrito);
}

// ================================================
// 4. ELIMINAR PRODUCTOS
// ================================================

function eliminarDelCarrito(idProducto) {
    const carrito = obtenerCarrito().filter(item =>
        String(item.id_producto) !== String(idProducto)
    );

    guardarCarrito(carrito);
}

// ================================================
// 5. RENDERIZAR LOS PRODUCTOS DEL MODAL
// ================================================

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
        menos.setAttribute("aria-label", `Reducir cantidad de ${item.nombre}`);

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
        mas.setAttribute("aria-label", `Aumentar cantidad de ${item.nombre}`);

        mas.addEventListener("click", () => {
            cambiarCantidad(item.id_producto, 1);
        });

        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.className = "btn-eliminar-item";
        eliminar.textContent = "🗑️";
        eliminar.title = "Eliminar producto";
        eliminar.setAttribute("aria-label", `Eliminar ${item.nombre}`);

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

// ================================================
// 6. ACTUALIZAR EL CONTADOR DE LA NAVEGACIÓN
// ================================================

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

// ================================================
// 7. MOSTRAR Y OCULTAR EL MODAL
// ================================================

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

// ================================================
// 8. FINALIZAR LA COMPRA EN RENDER
// ================================================

async function procesarCompra() {
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    // Validar todos los artículos antes de enviar la venta.
    const articulosInvalidos = carrito.some(item =>
        item.id_producto === null ||
        item.id_producto === undefined ||
        !Number.isFinite(item.precio) ||
        item.precio < 0 ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad < 1
    );

    if (articulosInvalidos) {
        alert("Hay productos con datos incorrectos. Revisa el carrito.");
        return;
    }

    let usuarioSesion = null;

    try {
        usuarioSesion = JSON.parse(localStorage.getItem("octo_usuario"));
    } catch (error) {
        console.error("No se pudo leer la sesión:", error);
    }

    if (!usuarioSesion || usuarioSesion.id_usuario == null) {
        alert("Inicia sesión antes de finalizar la compra.");
        return;
    }

    const totalMonto = carrito.reduce(
        (suma, item) => suma + item.precio * item.cantidad,
        0
    );

    const payload = {
        id_usuario: usuarioSesion.id_usuario,
        items: carrito.map(item => ({
            id_producto: item.id_producto,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad
        })),
        total: totalMonto
    };

    const botonComprar = document.getElementById("btn-finalizar-compra");

    if (botonComprar) {
        botonComprar.disabled = true;
        botonComprar.textContent = "Procesando compra...";
    }

    try {
        const respuesta = await fetch(`${API_URL}/ventas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const texto = await respuesta.text();

        let resultado = {};

        try {
            resultado = texto ? JSON.parse(texto) : {};
        } catch {
            resultado = {};
        }

        if (!respuesta.ok) {
            const mensaje = resultado.error ||
                resultado.mensaje ||
                `Error HTTP ${respuesta.status}`;

            throw new Error(mensaje);
        }

        alert(
            `¡Compra realizada con éxito!${
                resultado.id_venta != null
                    ? ` Número de orden #${resultado.id_venta}`
                    : ""
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

    } catch (error) {
        console.error("Error procesando la compra:", error);

        alert(
            "No se pudo procesar la compra: " +
            error.message +
            ". Revisa la API de Render."
        );
    } finally {
        if (botonComprar) {
            botonComprar.disabled = false;
            botonComprar.textContent = "Finalizar Compra";
        }
    }
}

// ================================================
// 9. DISPONER LAS FUNCIONES PARA EL HTML
// ================================================

window.obtenerCarrito = obtenerCarrito;
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
