const API_URL = "https://octo-erp.onrender.com/api";

function obtenerCarrito() {
    return JSON.parse(localStorage.getItem('octo_carrito')) || [];
}

function guardarCarrito(carrito) {
    localStorage.setItem('octo_carrito', JSON.stringify(carrito));
    actualizarCarritoUI();
}

// Alternar la visibilidad del desplegable
function toggleModalCarrito() {
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.classList.toggle('hidden');
        renderizarListaCarrito();
    }
}

// Agregar producto y renderizar
function agregarAlCarrito(idProducto, nombre, precio) {
    let carrito = obtenerCarrito();
    let item = carrito.find(p => p.id_producto === idProducto);

    if (item) {
        item.cantidad += 1;
    } else {
        carrito.push({ id_producto: idProducto, nombre: nombre, precio: precio, cantidad: 1 });
    }

    guardarCarrito(carrito);
    alert(`✅ ¡${nombre} agregado al carrito!`);
}

// Eliminar un producto del carrito
function eliminarDelCarrito(idProducto) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(p => p.id_producto !== idProducto);
    guardarCarrito(carrito);
}

// Renderizar dinámicamente la lista de compras dentro del modal
function renderizarListaCarrito() {
    const carrito = obtenerCarrito();
    const contenedor = document.getElementById('carrito-items-lista');
    const totalEl = document.getElementById('carrito-monto-total');

    if (!contenedor) return;

    if (carrito.length === 0) {
        contenedor.innerHTML = `<p class="carrito-vacio-msg">Tu carrito está vacío actualmente.</p>`;
        if (totalEl) totalEl.innerText = 0;
        return;
    }

    let html = '';
    let totalMonto = 0;

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        totalMonto += subtotal;

        html += `
            <div class="item-carrito">
                <div class="item-carrito-info">
                    <h4>${item.nombre}</h4>
                    <p>₡${subtotal.toLocaleString()} (${item.cantidad}x ₡${item.precio.toLocaleString()})</p>
                </div>
                <div class="item-carrito-acciones">
                    <button class="btn-eliminar-item" onclick="eliminarDelCarrito(${item.id_producto})">🗑️</button>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
    if (totalEl) totalEl.innerText = `₡${totalMonto.toLocaleString()}`;
}

// Actualizar el número rojo/púrpura del navbar
function actualizarCarritoUI() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.innerText = totalItems;
    }
    renderizarListaCarrito();
}

// Enviar la compra a la API en Render
async function procesarCompra() {
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const usuarioSesion = JSON.parse(localStorage.getItem('octo_usuario')) || { id_usuario: 1 };
    const totalMonto = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    const payload = {
        id_usuario: usuarioSesion.id_usuario,
        items: carrito,
        total: totalMonto
    };

    try {
        const respuesta = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert(`✅ ¡Compra realizada con éxito! Número de Orden #${resultado.id_venta}`);
            localStorage.removeItem('octo_carrito');
            actualizarCarritoUI();
            toggleModalCarrito();
        } else {
            alert(`❌ Error al procesar la venta: ${resultado.error}`);
        }
    } catch (error) {
        console.error("Error al conectar con Render:", error);
        alert("Error de conexión con la base de datos.");
    }
}

document.addEventListener('DOMContentLoaded', actualizarCarritoUI);