
let carrito = JSON.parse(localStorage.getItem('octo_carrito')) || [];

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initScrollReveal();
    actualizarCarritoUI();
});

/* --- 1. CAMBIO DE TEMA CLARO / OSCURO --- */
function initThemeToggle() {
    const btnTheme = document.getElementById('btn-toggle-theme');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('octoerp_theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);

    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('octoerp_theme', newTheme);
        });
    }
}

/* --- 2. ANIMACIONES AL HACER SCROLL --- */
function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.12
    });

    elements.forEach(el => observer.observe(el));
}

/* --- 3. LÓGICA COMPLETA DEL CARRITO DE COMPRAS --- */

/**
 * Despliega u oculta la ventana lateral del carrito
 */
function toggleModalCarrito() {
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

/**
 * Agrega un producto al carrito
 */
function agregarAlCarrito(nombre, precio) {
    carrito.push({ nombre, precio: Number(precio) });
    localStorage.setItem('octo_carrito', JSON.stringify(carrito));
    actualizarCarritoUI();

    // Despliega automáticamente el modal del carrito
    const modal = document.getElementById('modal-carrito');
    if (modal && modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
    }
}

/**
 * Elimina un item del carrito por su índice
 */
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    localStorage.setItem('octo_carrito', JSON.stringify(carrito));
    actualizarCarritoUI();
}

/**
 * Renderiza los items y suma el total acumulado
 */
function actualizarCarritoUI() {
    const countBadge = document.getElementById('cart-count');
    const lista = document.getElementById('carrito-items-lista');
    const totalElement = document.getElementById('carrito-monto-total');

    if (countBadge) {
        countBadge.innerText = carrito.length;
    }

    if (!lista) return;

    if (carrito.length === 0) {
        lista.innerHTML = '<p class="carrito-vacio-msg">Tu carrito está vacío actualmente.</p>';
        if (totalElement) totalElement.innerText = '₡0';
        return;
    }

    let total = 0;
    lista.innerHTML = '';

    carrito.forEach((item, index) => {
        total += item.precio;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <div class="carrito-item-info">
                <h4>${item.nombre}</h4>
                <p>₡${item.precio.toLocaleString()}</p>
            </div>
            <button class="btn-eliminar-item" onclick="eliminarDelCarrito(${index})" title="Eliminar">&times;</button>
        `;
        lista.appendChild(div);
    });

    if (totalElement) {
        totalElement.innerText = `₡${total.toLocaleString()}`;
    }
}

/**
 * Procesa la compra y vacía el carrito
 */
function procesarCompra() {
    if (carrito.length === 0) {
        alert('Tu carrito está vacío.');
        return;
    }
    alert('¡Gracias por tu compra en OctoERP! Tu pedido se ha registrado con éxito.');
    carrito = [];
    localStorage.setItem('octo_carrito', JSON.stringify(carrito));
    actualizarCarritoUI();
    toggleModalCarrito();
}