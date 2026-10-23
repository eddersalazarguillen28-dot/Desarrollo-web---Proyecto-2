const API_URL = "https://octo-erp.onrender.com/api/dashboard";
const LOGO = "../Imagenes/Logo.png";
const REFRESCO_MS = 20000;   // Actualización automática
const TIMEOUT_MS = 45000;    // Render puede tardar en despertar
const LIMITE_INICIO = 8;     // Productos mostrados en el inicio

const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let productos = [];
let firma = "";
let cargando = false;
let primeraRender = true;
let carrito = cargarCarrito();
let idxDestacado = 0;
let timerDestacado = null;

const $ = (id) => document.getElementById(id);
const fmt = (n) => `₡${Number(n || 0).toLocaleString("es-CR")}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

document.addEventListener("DOMContentLoaded", () => {
    initTema();
    initMenuMovil();
    initScrollReveal();
    initBurbujas();
    initCarrito();
    initProductos();
    actualizarCarritoUI();
    cargarProductos();

    setInterval(() => { if (!document.hidden) cargarProductos(); }, REFRESCO_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) cargarProductos(); });
});

/* --- Tema claro / oscuro --- */
function initTema() {
    const html = document.documentElement;
    html.setAttribute("data-theme", localStorage.getItem("octoerp_theme") || "dark");

    $("btn-toggle-theme")?.addEventListener("click", () => {
        const nuevo = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", nuevo);
        localStorage.setItem("octoerp_theme", nuevo);
    });
}

/* --- Menú móvil --- */
function initMenuMovil() {
    const nav = $("nav-links");
    $("btn-mobile-menu")?.addEventListener("click", () => nav.classList.toggle("nav-active"));
    nav?.addEventListener("click", (e) => { if (e.target.closest("a")) nav.classList.remove("nav-active"); });
}

/* --- Animación al hacer scroll --- */
function initScrollReveal() {
    const els = document.querySelectorAll(".reveal-on-scroll");
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (en.isIntersecting) {
                en.target.classList.add("visible");
                obs.unobserve(en.target);
            }
        });
    }, { threshold: 0.12 });
    els.forEach((el) => obs.observe(el));
}

/* --- Burbujas flotantes del hero --- */
function initBurbujas() {
    const cont = $("burbujas");
    if (!cont || reducido) return;

    for (let i = 0; i < 14; i++) {
        const b = document.createElement("span");
        b.className = "burbuja";
        b.style.setProperty("--s", `${5 + Math.random() * 14}px`);
        b.style.setProperty("--x", `${Math.random() * 100}%`);
        b.style.setProperty("--d", `${7 + Math.random() * 7}s`);
        b.style.setProperty("--dl", `${-Math.random() * 12}s`);
        cont.appendChild(b);
    }
}

/* ==========================================================================
   CONEXIÓN CON LA BASE DE DATOS
   ========================================================================== */

/* Busca todas las listas de objetos dentro de la respuesta */
function candidatos(data, profundidad = 0, salida = []) {
    if (Array.isArray(data)) {
        if (data.length && typeof data[0] === "object") salida.push(data);
        return salida;
    }
    if (!data || typeof data !== "object" || profundidad > 3) return salida;

    const claves = Object.keys(data);
    const prioridad = claves.filter((k) => /product|invent|item|stock|articul/i.test(k));
    [...prioridad, ...claves.filter((k) => !prioridad.includes(k))]
        .forEach((k) => candidatos(data[k], profundidad + 1, salida));
    return salida;
}

/* Unifica los nombres de campos del backend */
function normalizar(p, i) {
    const num = (v) => (v === undefined || v === null || v === "" ? NaN : Number(v));
    const stock = num(p.stock ?? p.cantidad ?? p.existencias ?? p.inventario);
    return {
        id: p.id ?? p.id_producto ?? p.idProducto ?? p.sku ?? p.codigo ?? `p${i}`,
        nombre: p.nombre ?? p.name ?? p.producto ?? p.nombre_producto ?? p.titulo ?? "",
        precio: num(p.precio ?? p.price ?? p.precio_venta ?? p.precio_unitario) || 0,
        stock: Number.isFinite(stock) ? stock : null,
        categoria: p.categoria ?? p.category ?? p.tipo ?? "Hardware",
        descripcion: p.descripcion ?? p.description ?? "Hardware de alto rendimiento",
        imagen: p.imagen ?? p.imagen_url ?? p.image ?? p.img ?? p.foto ?? ""
    };
}

function extraerProductos(data) {
    for (const lista of candidatos(data)) {
        const res = lista.map(normalizar).filter((p) => p.nombre);
        if (res.length) return res;
    }
    return [];
}

async function obtenerProductos() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(API_URL, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return extraerProductos(await res.json());
    } finally {
        clearTimeout(t);
    }
}

async function cargarProductos(manual = false) {
    if (cargando) return;
    cargando = true;

    if (manual || !productos.length) mostrarSkeleton();
    setEstadoBD("connecting");

    // Aviso si el servidor tarda en responder (arranque en frío)
    const aviso = setTimeout(() => {
        if (!productos.length) $("carga-nota")?.classList.remove("hidden");
    }, 6000);

    try {
        const lista = await obtenerProductos();
        productos = lista;
        setEstadoBD("online");

        const nuevaFirma = JSON.stringify(lista.map((p) => [p.id, p.precio, p.stock, p.nombre]));
        if (nuevaFirma !== firma || manual) {
            firma = nuevaFirma;
            renderProductos();
            actualizarStat(lista.length);
            iniciarDestacado();
        }
        if (!lista.length) renderVacio();
    } catch (err) {
        console.warn("OctoERP API:", err);
        setEstadoBD("offline");
        if (!productos.length) renderError();
    } finally {
        clearTimeout(aviso);
        $("carga-nota")?.classList.add("hidden");
        cargando = false;
    }
}

function setEstadoBD(estado) {
    const badge = $("db-status-indicator");
    const txt = $("db-text");
    if (!badge || !txt) return;
    badge.classList.remove("connecting", "offline");
    if (estado === "connecting") { badge.classList.add("connecting"); txt.textContent = "Conectando"; }
    else if (estado === "offline") { badge.classList.add("offline"); txt.textContent = "BD Offline"; }
    else { txt.textContent = "BD Online"; }
}

/* ==========================================================================
   RENDER DE PRODUCTOS
   ========================================================================== */
function initProductos() {
    const cont = $("contenedor-productos-bd");

    cont?.addEventListener("click", (e) => {
        const add = e.target.closest("[data-add]");
        if (add) return agregarAlCarrito(add.dataset.add);
        if (e.target.closest("[data-reintentar]")) cargarProductos(true);
    });

    // Si la imagen falla, se usa el logo
    cont?.addEventListener("error", (e) => {
        if (e.target.tagName === "IMG" && !e.target.src.endsWith("Logo.png")) e.target.src = LOGO;
    }, true);

    $("hero-featured-img")?.addEventListener("error", (e) => {
        if (!e.target.src.endsWith("Logo.png")) e.target.src = LOGO;
    });

    $("hero-featured-btn")?.addEventListener("click", (e) => {
        if (e.currentTarget.dataset.id) agregarAlCarrito(e.currentTarget.dataset.id);
    });
}

function mostrarSkeleton() {
    const cont = $("contenedor-productos-bd");
    if (!cont) return;
    cont.classList.remove("anima");
    cont.innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton-card"></div>').join("");
}

function tarjetaProducto(p, i) {
    const agotado = p.stock === 0;
    const poco = p.stock !== null && p.stock > 0 && p.stock <= 5;
    const tag = agotado ? "Agotado" : poco ? `Quedan ${p.stock}` : "Disponible";
    const claseTag = agotado ? "tag-agotado" : poco ? "tag-poco" : "";

    return `
        <article class="product-card ${agotado ? "agotado" : ""}" style="--i:${i}">
            <div class="product-img-box">
                <span class="product-tag ${claseTag}">${tag}</span>
                <img src="${esc(p.imagen || LOGO)}" alt="${esc(p.nombre)}" loading="lazy">
            </div>
            <div class="product-info">
                <span class="product-category">${esc(p.categoria)}</span>
                <h3>${esc(p.nombre)}</h3>
                <p class="product-desc">${esc(p.descripcion)}</p>
                <div class="product-action-row">
                    <span class="product-price">${fmt(p.precio)}</span>
                    <button class="btn-add-product" data-add="${esc(p.id)}" ${agotado ? "disabled" : ""}>
                        ${agotado ? "Agotado" : "Agregar"}
                    </button>
                </div>
            </div>
        </article>`;
}

function renderProductos() {
    const cont = $("contenedor-productos-bd");
    if (!cont || !productos.length) return;
    cont.classList.toggle("anima", primeraRender);
    cont.innerHTML = productos.slice(0, LIMITE_INICIO).map(tarjetaProducto).join("");
    primeraRender = false;
}

function renderVacio() {
    const cont = $("contenedor-productos-bd");
    if (!cont) return;
    cont.innerHTML = `
        <div class="estado-error">
            <h3>Aún no hay productos</h3>
            <p>Cuando se registren en el inventario aparecerán aquí automáticamente.</p>
        </div>`;
    const titulo = $("hero-featured-title");
    if (titulo) titulo.textContent = "Sin productos";
}

function renderError() {
    const cont = $("contenedor-productos-bd");
    if (!cont) return;
    cont.classList.remove("anima");
    cont.innerHTML = `
        <div class="estado-error">
            <h3>No pudimos conectar con el servidor</h3>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button class="btn-reintentar" data-reintentar>Reintentar</button>
        </div>`;
    const titulo = $("hero-featured-title");
    if (titulo) titulo.textContent = "Sin conexión";
}

/* Contador animado de equipos */
function actualizarStat(total) {
    const el = $("stat-total-productos");
    if (!el) return;
    if (reducido) { el.textContent = total; return; }

    const inicio = Number(el.textContent) || 0;
    const t0 = performance.now();
    const paso = (t) => {
        const k = Math.min((t - t0) / 900, 1);
        el.textContent = Math.round(inicio + (total - inicio) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
}

/* ==========================================================================
   PRODUCTO DESTACADO (rota entre los disponibles)
   ========================================================================== */
function iniciarDestacado() {
    clearInterval(timerDestacado);
    const disponibles = productos.filter((p) => p.stock !== 0);
    if (!disponibles.length) return;

    idxDestacado %= disponibles.length;
    pintarDestacado(disponibles[idxDestacado], false);

    if (disponibles.length > 1 && !reducido) {
        timerDestacado = setInterval(() => {
            idxDestacado = (idxDestacado + 1) % disponibles.length;
            pintarDestacado(disponibles[idxDestacado], true);
        }, 6000);
    }
}

function pintarDestacado(p, animar) {
    const card = $("hero-featured-card");
    const aplicar = () => {
        $("hero-featured-img").src = p.imagen || LOGO;
        $("hero-featured-img").alt = p.nombre;
        $("hero-featured-title").textContent = p.nombre;
        $("hero-featured-desc").textContent = p.descripcion;
        $("hero-featured-price").textContent = fmt(p.precio);
        const btn = $("hero-featured-btn");
        btn.dataset.id = p.id;
        btn.disabled = false;
        card?.classList.remove("swap");
    };

    if (animar && card) {
        card.classList.add("swap");
        setTimeout(aplicar, 260);
    } else {
        aplicar();
    }
}

/* ==========================================================================
   CARRITO
   ========================================================================== */
function cargarCarrito() {
    try {
        const datos = JSON.parse(localStorage.getItem("octo_carrito")) || [];
        return datos.map((i) => ({
            id: i.id ?? i.nombre,
            nombre: i.nombre,
            precio: Number(i.precio) || 0,
            cantidad: i.cantidad || 1
        }));
    } catch {
        return [];
    }
}

function guardarCarrito() {
    localStorage.setItem("octo_carrito", JSON.stringify(carrito));
}

function initCarrito() {
    $("btn-cart")?.addEventListener("click", toggleModalCarrito);
    $("btn-cerrar-carrito")?.addEventListener("click", toggleModalCarrito);
    $("btn-finalizar-compra")?.addEventListener("click", procesarCompra);

    const modal = $("modal-carrito");
    modal?.addEventListener("click", (e) => { if (e.target === modal) toggleModalCarrito(); });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) toggleModalCarrito();
    });

    $("carrito-items-lista")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-accion]");
        if (!btn) return;
        const i = Number(btn.dataset.idx);
        const item = carrito[i];
        if (!item) return;

        if (btn.dataset.accion === "mas") cambiarCantidad(i, 1);
        else if (btn.dataset.accion === "menos") cambiarCantidad(i, -1);
        else carrito.splice(i, 1);

        guardarCarrito();
        actualizarCarritoUI();
    });
}

function toggleModalCarrito() {
    $("modal-carrito")?.classList.toggle("hidden");
}

function stockDe(id) {
    const p = productos.find((x) => String(x.id) === String(id));
    return p ? p.stock : null;
}

function cambiarCantidad(i, delta) {
    const item = carrito[i];
    const stock = stockDe(item.id);
    const nueva = item.cantidad + delta;

    if (nueva <= 0) return carrito.splice(i, 1);
    if (delta > 0 && stock !== null && nueva > stock) return toast("Alcanzaste el stock disponible", "warn");
    item.cantidad = nueva;
}

function agregarAlCarrito(id) {
    const p = productos.find((x) => String(x.id) === String(id));
    if (!p) return;

    const item = carrito.find((i) => String(i.id) === String(p.id));
    const enCarrito = item ? item.cantidad : 0;
    if (p.stock !== null && enCarrito >= p.stock) return toast("Alcanzaste el stock disponible", "warn");

    if (item) item.cantidad++;
    else carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 });

    guardarCarrito();
    actualizarCarritoUI();
    toast(`${p.nombre} agregado al carrito`);

    const btn = $("btn-cart");
    btn?.classList.remove("bump");
    void btn?.offsetWidth;
    btn?.classList.add("bump");
}

function actualizarCarritoUI() {
    const lista = $("carrito-items-lista");
    const totalEl = $("carrito-monto-total");
    const badge = $("cart-count");

    if (badge) badge.textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
    if (!lista) return;

    if (!carrito.length) {
        lista.innerHTML = '<p class="carrito-vacio-msg">Tu carrito está vacío actualmente.</p>';
        if (totalEl) totalEl.textContent = "₡0";
        return;
    }

    lista.innerHTML = carrito.map((item, i) => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <h4>${esc(item.nombre)}</h4>
                <p>${fmt(item.precio * item.cantidad)}</p>
            </div>
            <div class="carrito-item-controles">
                <button class="btn-cant" data-accion="menos" data-idx="${i}" aria-label="Quitar uno">−</button>
                <span class="cant-num">${item.cantidad}</span>
                <button class="btn-cant" data-accion="mas" data-idx="${i}" aria-label="Agregar uno">+</button>
                <button class="btn-eliminar-item" data-accion="quitar" data-idx="${i}" title="Eliminar">&times;</button>
            </div>
        </div>`).join("");

    if (totalEl) totalEl.textContent = fmt(carrito.reduce((s, i) => s + i.precio * i.cantidad, 0));
}

function procesarCompra() {
    if (!carrito.length) return toast("Tu carrito está vacío", "warn");
    carrito = [];
    guardarCarrito();
    actualizarCarritoUI();
    toggleModalCarrito();
    toast("¡Gracias por tu compra en OctoERP! Pedido registrado.");
}


/* --- Notificaciones --- */
function toast(msg, tipo = "ok") {
    let pila = document.querySelector(".toast-stack");
    if (!pila) {
        pila = document.createElement("div");
        pila.className = "toast-stack";
        document.body.appendChild(pila);
    }
    const t = document.createElement("div");
    t.className = `toast ${tipo === "warn" ? "warn" : ""}`;
    t.textContent = msg;
    pila.appendChild(t);

    setTimeout(() => {
        t.classList.add("salida");
        setTimeout(() => t.remove(), 300);
    }, 2600);
}

const productosInicio = inventario.filter(prod => 
    productoPerteneceAUbicacion(prod, "inicio")
);