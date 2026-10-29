
const API_URL = "https://octo-erp.onrender.com/api/productos";
const LOGO = "../Imagenes/Logo.png";
const REFRESCO_MS = 20000;
const TIMEOUT_MS = 45000;
const LIMITE_INICIO = 8;

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

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[c]));

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initTema();
    initMenuMovil();
    initScrollReveal();
    initBurbujas();
    initCarrito();
    initProductos();
    actualizarCarritoUI();
    initSesionYPerfilDropdown();
    cargarProductos();

    setInterval(() => {
        if (!document.hidden) cargarProductos();
    }, REFRESCO_MS);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) cargarProductos();
    });
});

/* ==========================================================================
   SESIÓN, PERFIL Y BIENVENIDA
   ========================================================================== */

function initSesionYPerfilDropdown() {
    const usuarioGuardado = localStorage.getItem("usuario");
    const tituloBienvenida = $("titulo-bienvenida");

    if (!usuarioGuardado) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);

        const nombreUsuario =
            usuario.nombre || usuario.nombres || usuario.name || "Cliente";

        const rolUsuario = usuario.rol || usuario.rango || "Cliente";
        const fotoUsuario = usuario.foto || "";
        const esAdmin = String(rolUsuario).toLowerCase().includes("admin");

        const authGuest = $("auth-guest");
        if (authGuest) authGuest.style.display = "none";

        const authMobile = document.querySelector(".auth-buttons-mobile");
        if (authMobile) authMobile.style.display = "none";

        const navActions = document.querySelector(".nav-actions");

        if (navActions && !$("user-profile-menu-container")) {
            const menuContainer = document.createElement("div");
            menuContainer.id = "user-profile-menu-container";
            menuContainer.className = "octo-profile-container";

            const inicial = String(nombreUsuario).charAt(0).toUpperCase();

            const avatarContent = fotoUsuario
                ? `<img src="${esc(fotoUsuario)}" alt="Avatar"
                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : esc(inicial);

            menuContainer.innerHTML = `
                <button type="button" id="btn-perfil-trigger"
                    class="octo-profile-trigger">
                    <div class="octo-profile-avatar ${esAdmin ? "admin" : "client"}">
                        ${avatarContent}
                    </div>

                    <div class="octo-profile-info">
                        <span class="octo-profile-name">${esc(nombreUsuario)}</span>
                        <span class="octo-profile-role ${esAdmin ? "admin" : "client"}">
                            ${esc(rolUsuario)}
                        </span>
                    </div>

                    <span style="font-size:9px;opacity:.5;margin-left:2px;">▼</span>
                </button>

                <div id="perfil-dropdown" class="octo-profile-dropdown">
                    <a href="perfil.html" class="octo-dropdown-item">
                        Ver y Editar Perfil
                    </a>

                    ${esAdmin ? `
                        <a href="inventario.html"
                            class="octo-dropdown-item admin-link">
                            Panel de Control
                        </a>
                    ` : ""}

                    <div class="octo-dropdown-divider"></div>

                    <button type="button" id="btn-cerrar-sesion"
                        class="octo-dropdown-item logout">
                        Cerrar Sesión
                    </button>
                </div>
            `;

            navActions.appendChild(menuContainer);

            const trigger = $("btn-perfil-trigger");
            const dropdown = $("perfil-dropdown");

            trigger?.addEventListener("click", (e) => {
                e.stopPropagation();

                dropdown.style.display =
                    dropdown.style.display === "block" ? "none" : "block";
            });

            document.addEventListener("click", (e) => {
                if (!menuContainer.contains(e.target)) {
                    dropdown.style.display = "none";
                }
            });

            $("btn-cerrar-sesion")?.addEventListener("click", () => {
                localStorage.removeItem("token");
                localStorage.removeItem("usuario");
                window.location.href = "inicioSesion.html";
            });
        }

        if (tituloBienvenida) {
            tituloBienvenida.textContent = `¡Bienvenido, ${nombreUsuario}!`;
        }
    } catch (error) {
        console.error("Error al leer el usuario:", error);
    }
}

/* ==========================================================================
   TEMA
   ========================================================================== */

function initTema() {
    const html = document.documentElement;

    html.setAttribute(
        "data-theme",
        localStorage.getItem("octoerp_theme") || "dark"
    );

    $("btn-toggle-theme")?.addEventListener("click", () => {
        const nuevo =
            html.getAttribute("data-theme") === "dark" ? "light" : "dark";

        html.setAttribute("data-theme", nuevo);
        localStorage.setItem("octoerp_theme", nuevo);
    });
}

/* ==========================================================================
   MENÚ MÓVIL
   ========================================================================== */

function initMenuMovil() {
    const nav = $("nav-links");

    $("btn-mobile-menu")?.addEventListener("click", () => {
        nav?.classList.toggle("nav-active");
    });

    nav?.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
            nav.classList.remove("nav-active");
        }
    });
}

/* ==========================================================================
   ANIMACIONES
   ========================================================================== */

function initScrollReveal() {
    const elementos = document.querySelectorAll(".reveal-on-scroll");

    if (!("IntersectionObserver" in window)) {
        elementos.forEach((el) => el.classList.add("visible"));
        return;
    }

    const observador = new IntersectionObserver((entries) => {
        entries.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.12 });

    elementos.forEach((el) => observador.observe(el));
}

function initBurbujas() {
    const contenedor = $("burbujas");

    if (!contenedor || reducido) return;

    for (let i = 0; i < 14; i++) {
        const burbuja = document.createElement("span");

        burbuja.className = "burbuja";
        burbuja.style.setProperty("--s", `${5 + Math.random() * 14}px`);
        burbuja.style.setProperty("--x", `${Math.random() * 100}%`);
        burbuja.style.setProperty("--d", `${7 + Math.random() * 7}s`);
        burbuja.style.setProperty("--dl", `${-Math.random() * 12}s`);

        contenedor.appendChild(burbuja);
    }
}

/* ==========================================================================
   PRODUCTOS DESDE RENDER
   ========================================================================== */

function normalizarProducto(p, i) {
    const numero = (v) =>
        v === undefined || v === null || v === "" ? NaN : Number(v);

    const stock = numero(
        p.stock ?? p.cantidad ?? p.existencias ?? p.inventario
    );

    return {
        id: p.id ?? p.id_producto ?? p.idProducto ?? p.sku ?? p.codigo ?? `p${i}`,
        nombre: p.nombre ?? p.name ?? p.producto ?? p.nombre_producto ?? p.titulo ?? "",
        precio: numero(
            p.precio ?? p.price ?? p.precio_venta ?? p.precio_unitario
        ) || 0,
        stock: Number.isFinite(stock) ? stock : null,
        categoria: p.categoria ?? p.category ?? p.tipo ?? "Hardware",
        descripcion: p.descripcion ?? p.description ?? "Hardware de alto rendimiento",
        imagen: p.imagen ?? p.imagen_url ?? p.image ?? p.img ?? p.foto ?? ""
    };
}

function extraerProductos(data) {
    let lista = [];

    if (Array.isArray(data)) {
        lista = data;
    } else if (Array.isArray(data?.productos)) {
        lista = data.productos;
    } else if (Array.isArray(data?.data)) {
        lista = data.data;
    }

    return lista
        .map(normalizarProducto)
        .filter((p) => p.nombre);
}

async function obtenerProductos() {
    const controlador = new AbortController();

    const timeout = setTimeout(
        () => controlador.abort(),
        TIMEOUT_MS
    );

    try {
        const respuesta = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            signal: controlador.signal
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const data = await respuesta.json();

        if (data.status && data.status !== "ok") {
            throw new Error(data.message || "No se pudieron cargar los productos.");
        }

        return extraerProductos(data);
    } finally {
        clearTimeout(timeout);
    }
}

async function cargarProductos(manual = false) {
    if (cargando) return;

    cargando = true;

    if (manual || !productos.length) {
        mostrarSkeleton();
    }

    setEstadoBD("connecting");

    const aviso = setTimeout(() => {
        if (!productos.length) {
            $("carga-nota")?.classList.remove("hidden");
        }
    }, 6000);

    try {
        const lista = await obtenerProductos();

        productos = lista;
        setEstadoBD("online");

        const nuevaFirma = JSON.stringify(
            lista.map((p) => [p.id, p.precio, p.stock, p.nombre])
        );

        if (nuevaFirma !== firma || manual) {
            firma = nuevaFirma;

            renderProductos();
            actualizarStat(lista.length);
            iniciarDestacado();
        }

        if (!lista.length) {
            renderVacio();
        }
    } catch (error) {
        console.error("Error al consultar los productos:", error);

        setEstadoBD("offline");

        if (!productos.length) {
            renderError();
        }
    } finally {
        clearTimeout(aviso);
        $("carga-nota")?.classList.add("hidden");
        cargando = false;
    }
}

function setEstadoBD(estado) {
    const indicador = $("db-status-indicator");
    const texto = $("db-text");

    if (!indicador || !texto) return;

    indicador.classList.remove("connecting", "offline");

    if (estado === "connecting") {
        indicador.classList.add("connecting");
        texto.textContent = "Conectando";
    } else if (estado === "offline") {
        indicador.classList.add("offline");
        texto.textContent = "BD Offline";
    } else {
        texto.textContent = "BD Online";
    }
}

/* ==========================================================================
   TARJETAS DE PRODUCTOS
   ========================================================================== */

function initProductos() {
    const contenedor = $("contenedor-productos-bd");

    contenedor?.addEventListener("click", (e) => {
        const botonAgregar = e.target.closest("[data-add]");

        if (botonAgregar) {
            agregarAlCarrito(botonAgregar.dataset.add);
            return;
        }

        if (e.target.closest("[data-reintentar]")) {
            cargarProductos(true);
        }
    });

    contenedor?.addEventListener("error", (e) => {
        if (
            e.target.tagName === "IMG" &&
            !e.target.src.endsWith("Logo.png")
        ) {
            e.target.src = LOGO;
        }
    }, true);

    $("hero-featured-img")?.addEventListener("error", (e) => {
        if (!e.target.src.endsWith("Logo.png")) {
            e.target.src = LOGO;
        }
    });

    $("hero-featured-btn")?.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;

        if (id) {
            agregarAlCarrito(id);
        }
    });
}

function mostrarSkeleton() {
    const contenedor = $("contenedor-productos-bd");

    if (!contenedor) return;

    contenedor.classList.remove("anima");

    contenedor.innerHTML = Array.from(
        { length: 4 },
        () => '<div class="skeleton-card"></div>'
    ).join("");
}

function tarjetaProducto(p, i) {
    const agotado = p.stock === 0;
    const poco = p.stock !== null && p.stock > 0 && p.stock <= 5;

    const etiqueta = agotado
        ? "Agotado"
        : poco
            ? `Quedan ${p.stock}`
            : "Disponible";

    const claseEtiqueta = agotado
        ? "tag-agotado"
        : poco
            ? "tag-poco"
            : "";

    return `
        <article class="product-card ${agotado ? "agotado" : ""}" style="--i:${i}">
            <div class="product-img-box">
                <span class="product-tag ${claseEtiqueta}">
                    ${etiqueta}
                </span>

                <img
                    src="${esc(p.imagen || LOGO)}"
                    alt="${esc(p.nombre)}"
                    loading="lazy"
                >
            </div>

            <div class="product-info">
                <span class="product-category">${esc(p.categoria)}</span>
                <h3>${esc(p.nombre)}</h3>
                <p class="product-desc">${esc(p.descripcion)}</p>

                <div class="product-action-row">
                    <span class="product-price">${fmt(p.precio)}</span>

                    <button
                        class="btn-add-product"
                        data-add="${esc(p.id)}"
                        ${agotado ? "disabled" : ""}
                    >
                        ${agotado ? "Agotado" : "Agregar"}
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderProductos() {
    const contenedor = $("contenedor-productos-bd");

    if (!contenedor || !productos.length) return;

    contenedor.classList.toggle("anima", primeraRender);

    contenedor.innerHTML = productos
        .slice(0, LIMITE_INICIO)
        .map(tarjetaProducto)
        .join("");

    primeraRender = false;
}

function renderVacio() {
    const contenedor = $("contenedor-productos-bd");

    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="estado-error">
            <h3>Aún no hay productos</h3>
            <p>Cuando se registren en el inventario aparecerán aquí automáticamente.</p>
        </div>
    `;

    if ($("hero-featured-title")) {
        $("hero-featured-title").textContent = "Sin productos";
    }
}

function renderError() {
    const contenedor = $("contenedor-productos-bd");

    if (!contenedor) return;

    contenedor.classList.remove("anima");

    contenedor.innerHTML = `
        <div class="estado-error">
            <h3>No pudimos conectar con el servidor</h3>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button class="btn-reintentar" data-reintentar>
                Reintentar
            </button>
        </div>
    `;

    if ($("hero-featured-title")) {
        $("hero-featured-title").textContent = "Sin conexión";
    }
}

function actualizarStat(total) {
    const elemento = $("stat-total-productos");

    if (!elemento) return;

    if (reducido) {
        elemento.textContent = total;
        return;
    }

    const inicio = Number(elemento.textContent) || 0;
    const inicioTiempo = performance.now();

    const paso = (tiempo) => {
        const progreso = Math.min((tiempo - inicioTiempo) / 900, 1);

        elemento.textContent = Math.round(
            inicio + (total - inicio) * (1 - Math.pow(1 - progreso, 3))
        );

        if (progreso < 1) {
            requestAnimationFrame(paso);
        }
    };

    requestAnimationFrame(paso);
}

/* ==========================================================================
   PRODUCTO DESTACADO
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
    const tarjeta = $("hero-featured-card");

    const aplicar = () => {
        const imagen = $("hero-featured-img");
        const titulo = $("hero-featured-title");
        const descripcion = $("hero-featured-desc");
        const precio = $("hero-featured-price");
        const boton = $("hero-featured-btn");

        if (imagen) {
            imagen.src = p.imagen || LOGO;
            imagen.alt = p.nombre;
        }

        if (titulo) titulo.textContent = p.nombre;
        if (descripcion) descripcion.textContent = p.descripcion;
        if (precio) precio.textContent = fmt(p.precio);

        if (boton) {
            boton.dataset.id = p.id;
            boton.disabled = p.stock === 0;
        }

        tarjeta?.classList.remove("swap");
    };

    if (animar && tarjeta) {
        tarjeta.classList.add("swap");
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

        if (!Array.isArray(datos)) return [];

        return datos.map((item) => ({
            id: item.id ?? item.id_producto ?? item.producto_id ?? item.nombre,
            nombre: item.nombre || "Producto",
            precio: Number(item.precio) || 0,
            cantidad: Math.max(
                1,
                Number.parseInt(item.cantidad, 10) || 1
            )
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

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            toggleModalCarrito();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            modal &&
            !modal.classList.contains("hidden")
        ) {
            toggleModalCarrito();
        }
    });

    $("carrito-items-lista")?.addEventListener("click", (e) => {
        const boton = e.target.closest("[data-accion]");

        if (!boton) return;

        const indice = Number(boton.dataset.idx);
        const item = carrito[indice];

        if (!item) return;

        if (boton.dataset.accion === "mas") {
            cambiarCantidad(indice, 1);
        } else if (boton.dataset.accion === "menos") {
            cambiarCantidad(indice, -1);
        } else {
            carrito.splice(indice, 1);
            guardarCarrito();
            actualizarCarritoUI();
        }
    });
}

function toggleModalCarrito() {
    $("modal-carrito")?.classList.toggle("hidden");
}

function stockDe(id) {
    const producto = productos.find(
        (p) => String(p.id) === String(id)
    );

    return producto ? producto.stock : null;
}

function cambiarCantidad(indice, delta) {
    const item = carrito[indice];

    if (!item) return;

    const stock = stockDe(item.id);
    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad <= 0) {
        carrito.splice(indice, 1);
        guardarCarrito();
        actualizarCarritoUI();
        return;
    }

    if (
        delta > 0 &&
        stock !== null &&
        nuevaCantidad > stock
    ) {
        toast("Alcanzaste el stock disponible", "warn");
        return;
    }

    item.cantidad = nuevaCantidad;

    guardarCarrito();
    actualizarCarritoUI();
}

function agregarAlCarrito(id) {
    const producto = productos.find(
        (p) => String(p.id) === String(id)
    );

    if (!producto) return;

    if (producto.stock === 0) {
        toast("Este producto está agotado", "warn");
        return;
    }

    const item = carrito.find(
        (i) => String(i.id) === String(producto.id)
    );

    const cantidadActual = item ? item.cantidad : 0;

    if (
        producto.stock !== null &&
        cantidadActual >= producto.stock
    ) {
        toast("Alcanzaste el stock disponible", "warn");
        return;
    }

    if (item) {
        item.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarCarritoUI();

    toast(`${producto.nombre} agregado al carrito`);

    const botonCarrito = $("btn-cart");

    botonCarrito?.classList.remove("bump");
    void botonCarrito?.offsetWidth;
    botonCarrito?.classList.add("bump");
}

function actualizarCarritoUI() {
    const lista = $("carrito-items-lista");
    const totalElemento = $("carrito-monto-total");
    const insignia = $("cart-count");

    if (insignia) {
        insignia.textContent = carrito.reduce(
            (suma, item) => suma + item.cantidad,
            0
        );
    }

    if (!lista) return;

    if (!carrito.length) {
        lista.innerHTML = `
            <p class="carrito-vacio-msg">
                Tu carrito está vacío actualmente.
            </p>
        `;

        if (totalElemento) totalElemento.textContent = "₡0";

        return;
    }

    lista.innerHTML = carrito.map((item, indice) => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <h4>${esc(item.nombre)}</h4>
                <p>${fmt(item.precio * item.cantidad)}</p>
            </div>

            <div class="carrito-item-controles">
                <button
                    class="btn-cant"
                    data-accion="menos"
                    data-idx="${indice}"
                    aria-label="Quitar uno"
                >−</button>

                <span class="cant-num">${item.cantidad}</span>

                <button
                    class="btn-cant"
                    data-accion="mas"
                    data-idx="${indice}"
                    aria-label="Agregar uno"
                >+</button>

                <button
                    class="btn-eliminar-item"
                    data-accion="quitar"
                    data-idx="${indice}"
                    title="Eliminar"
                >&times;</button>
            </div>
        </div>
    `).join("");

    if (totalElemento) {
        totalElemento.textContent = fmt(
            carrito.reduce(
                (suma, item) => suma + item.precio * item.cantidad,
                0
            )
        );
    }
}

/* ==========================================================================
   FINALIZAR COMPRA Y GUARDAR EN POSTGRESQL A TRAVÉS DE RENDER
   ========================================================================== */

async function procesarCompra() {
    if (!carrito.length) {
        toast("Tu carrito está vacío", "warn");
        return;
    }

    const token = localStorage.getItem("token");
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!token || !usuarioGuardado) {
        toast("Inicia sesión para completar tu compra.", "warn");
        return;
    }

    let usuario;

    try {
        usuario = JSON.parse(usuarioGuardado);
    } catch {
        toast("Tu sesión no es válida. Inicia sesión nuevamente.", "warn");
        return;
    }

    const rol = String(usuario?.rol || "").trim().toLowerCase();

    if (rol !== "cliente") {
        toast(
            "Inicia sesión con una cuenta de cliente para comprar.",
            "warn"
        );
        return;
    }

    const boton = $("btn-finalizar-compra");

    if (boton?.disabled) return;

    const textoOriginal = boton?.textContent;

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Procesando compra...";
    }

    const detalles = carrito.map((item) => ({
        producto_id: Number(item.id),
        cantidad: Number(item.cantidad)
    }));

    try {
        const detallesInvalidos = detalles.some((item) =>
            !Number.isInteger(item.producto_id) ||
            item.producto_id <= 0 ||
            !Number.isInteger(item.cantidad) ||
            item.cantidad <= 0
        );

        if (detallesInvalidos) {
            throw new Error(
                "Hay productos con identificadores o cantidades inválidos. " +
                "Elimina esos productos y agrégalos nuevamente."
            );
        }

        const respuesta = await fetch(
            "https://octo-erp.onrender.com/api/ventas/cliente",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                },
                body: JSON.stringify({ detalles })
            }
        );

        const resultado = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok || resultado.status !== "ok") {
            if (respuesta.status === 401) {
                throw new Error(
                    "Tu sesión venció o no es válida. Inicia sesión nuevamente."
                );
            }

            if (respuesta.status === 403) {
                throw new Error(
                    "Esta cuenta no tiene permiso para comprar como cliente."
                );
            }

            throw new Error(
                resultado.message ||
                resultado.mensaje ||
                `No se pudo registrar la compra. Error HTTP ${respuesta.status}.`
            );
        }

        // Vaciar el carrito únicamente después de una respuesta exitosa.
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();

        const modal = $("modal-carrito");

        if (modal && !modal.classList.contains("hidden")) {
            toggleModalCarrito();
        }

        const ventaId =
            resultado.venta_id ??
            resultado.id_venta ??
            resultado.venta?.id;

        toast(
            ventaId
                ? `¡Compra registrada! Número de venta: ${ventaId}`
                : "¡Compra registrada correctamente!"
        );

        // Actualiza las existencias que se muestran en el catálogo.
        await cargarProductos(true);

    } catch (error) {
        console.error("Error al registrar la compra:", error);

        toast(
            error.message ||
            "No se pudo confirmar la compra. Inténtalo de nuevo.",
            "warn"
        );
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = textoOriginal || "Finalizar compra";
        }
    }
}

/* ==========================================================================
   NOTIFICACIONES
   ========================================================================== */

function toast(mensaje, tipo = "ok") {
    let pila = document.querySelector(".toast-stack");

    if (!pila) {
        pila = document.createElement("div");
        pila.className = "toast-stack";
        document.body.appendChild(pila);
    }

    const notificacion = document.createElement("div");

    notificacion.className = `toast ${tipo === "warn" ? "warn" : ""}`;
    notificacion.textContent = mensaje;

    pila.appendChild(notificacion);

    setTimeout(() => {
        notificacion.classList.add("salida");

        setTimeout(() => {
            notificacion.remove();
        }, 300);
    }, 2600);
}

/* ==========================================================================
   MÚSICA SECRETA: CTRL + SHIFT + M
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const boton = $("boton-musica-secreto");
    const musica = $("musica-secreta");

    if (!boton || !musica) return;

    document.addEventListener("keydown", (evento) => {
        if (
            evento.ctrlKey &&
            evento.shiftKey &&
            evento.key.toLowerCase() === "m"
        ) {
            boton.classList.toggle("visible");
        }
    });

    boton.addEventListener("click", async () => {
        try {
            if (musica.paused) {
                await musica.play();

                boton.textContent = "⏸️";
                boton.title = "Pausar música";
            } else {
                musica.pause();

                boton.textContent = "🎵";
                boton.title = "Reproducir música";
            }
        } catch (error) {
            console.error("No se pudo reproducir la música:", error);

            alert(
                "No se pudo reproducir la canción. Comprueba el archivo de audio."
            );
        }
    });

    musica.addEventListener("ended", () => {
        boton.textContent = "🎵";
        boton.title = "Reproducir música";
    });
});

// ============================================================
// CARGAR Y MOSTRAR OFERTAS EN LA PÁGINA DE INICIO (VISTA PREVIA)
// ============================================================

async function cargarOfertas() {
    const contenedor = document.getElementById("contenedor-ofertas");
    const contenedorBoton = document.getElementById("contenedor-btn-ofertas");
    
    if (!contenedor) return; 

    const API_URL = "https://octo-erp.onrender.com/api/productos";

    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) throw new Error("Error al cargar productos");

        const data = await respuesta.json();
        const productos = data.productos || [];

        // 1. Filtrar solo los que tienen precio de oferta válido
        const todasLasOfertas = productos.filter(p => 
            p.precio_oferta && 
            parseFloat(p.precio_oferta) > 0 && 
            parseFloat(p.precio_oferta) < parseFloat(p.precio)
        );

        if (todasLasOfertas.length === 0) {
            contenedor.innerHTML = `
                <p style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 20px;">
                    No hay ofertas disponibles en este momento.
                </p>
            `;
            if (contenedorBoton) contenedorBoton.style.display = "none";
            return;
        }

        // 2. Tomar solo las primeras 4 ofertas
        const ofertasMostradas = todasLasOfertas.slice(0, 6);

        // 3. Renderizar las 4 ofertas
        contenedor.innerHTML = ofertasMostradas.map(producto => {
            const precioBase = parseFloat(producto.precio).toLocaleString('es-CR');
            const precioOferta = parseFloat(producto.precio_oferta).toLocaleString('es-CR');
            
            const descuento = Math.round(
                ((producto.precio - producto.precio_oferta) / producto.precio) * 100
            );

            const imagen = producto.imagen_url || "../Imagenes/Logo.png";

            return `
                <div class="product-card" onclick="verDetalleProducto(${producto.id})" style="cursor: pointer;">
                    <div class="product-img-box" style="position: relative;">
                        <span class="oferta-badge" style="
                            position: absolute; top: 10px; right: 10px;
                            background: #ef4444; color: white;
                            padding: 4px 10px; border-radius: 20px;
                            font-size: 12px; font-weight: 700;
                            z-index: 2;
                        ">-${descuento}%</span>
                        <img src="${imagen}" alt="${producto.nombre}" 
                             onerror="this.src='../Imagenes/Logo.png'">
                    </div>
                    <div class="product-info">
                        <span class="product-category">${producto.categoria || 'General'}</span>
                        <h3>${producto.nombre}</h3>
                        <p class="product-desc" style="
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                            min-height: 2.8em;
                        ">${producto.descripcion || 'Producto en oferta especial'}</p>
                        <div class="product-action-row">
                            <div>
                                <span style="
                                    text-decoration: line-through;
                                    color: #94a3b8;
                                    font-size: 13px;
                                    display: block;
                                ">₡${precioBase}</span>
                                <span class="product-price" style="color: #ef4444;">
                                    ₡${precioOferta}
                                </span>
                            </div>
                            <button class="btn-add-product" 
                                    onclick="event.stopPropagation(); agregarAlCarrito(${producto.id})">
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 4. Mostrar el botón "Ver todas las ofertas" si hay más de 4 ofertas
        if (contenedorBoton) {
            if (todasLasOfertas.length > 6) {
                contenedorBoton.style.display = "block"; // Hay más, mostrar botón
            } else {
                contenedorBoton.style.display = "none";  // Solo hay 4 o menos, ocultar botón
            }
        }

    } catch (error) {
        console.error("Error cargando ofertas:", error);
        contenedor.innerHTML = `
            <p style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 20px;">
                No se pudieron cargar las ofertas. Intenta de nuevo más tarde.
            </p>
        `;
        if (contenedorBoton) contenedorBoton.style.display = "none";
    }
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", cargarOfertas);