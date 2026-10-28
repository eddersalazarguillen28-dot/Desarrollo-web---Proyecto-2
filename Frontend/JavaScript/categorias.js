
const API_URL = "https://octo-erp.onrender.com/api/productos";
const LOGO = "../Imagenes/Logo.png";

let productosGlobales = [];
let carrito = cargarCarrito();
let productoModalActualId = null;

const $ = (id) => document.getElementById(id);

const fmt = (n) =>
    `₡${Number(n || 0).toLocaleString("es-CR", {
        maximumFractionDigits: 2
    })}`;

const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    cambiarTema();
    cargarProductosDeCategoria();
    initCarrito();
    actualizarCarritoUI();
    initSesionYPerfilDropdown();
    initModalDetalle();
    initBuscaadorProductos();
});

/* =========================================================
   PRECIOS Y DESCUENTOS
   ========================================================= */

function obtenerPreciosProducto(producto) {
    const base = Number(producto.precio) || 0;

    const ofertaValida =
        producto.precio_oferta !== null &&
        producto.precio_oferta !== undefined &&
        producto.precio_oferta !== "";

    const oferta = ofertaValida
        ? Number(producto.precio_oferta)
        : NaN;

    const tieneOferta =
        ofertaValida &&
        Number.isFinite(oferta) &&
        oferta > 0 &&
        oferta < base;

    const final = tieneOferta ? oferta : base;

    return {
        base,
        final,
        tieneOferta,
        porcentaje: tieneOferta
            ? Math.round(((base - final) / base) * 100)
            : 0,
        ahorro: base - final
    };
}

function generarHTMLPrecios(producto) {
    const precios = obtenerPreciosProducto(producto);

    if (!precios.tieneOferta) {
        return `
            <div class="precios-categoria">
                <span class="precio-normal-categoria">
                    ${fmt(precios.base)}
                </span>
            </div>
        `;
    }

    return `
        <div class="precios-categoria">
            <span class="precio-anterior-categoria">
                ${fmt(precios.base)}
            </span>

            <span class="precio-oferta-categoria">
                ${fmt(precios.final)}
            </span>

            <span class="badge-descuento-categoria">
                -${precios.porcentaje}%
            </span>
        </div>
    `;
}

/* =========================================================
   SESIÓN, PERFIL Y MENÚ DESPLEGABLE
   ========================================================= */

function initSesionYPerfilDropdown() {
    const usuarioGuardado = localStorage.getItem("usuario");
    const tituloBienvenida = $("titulo-bienvenida");

    if (!usuarioGuardado) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);

        const nombreUsuario =
            usuario.nombre ||
            usuario.nombres ||
            usuario.name ||
            "Cliente";

        const rolUsuario =
            usuario.rol ||
            usuario.rango ||
            "Cliente";

        const fotoUsuario = usuario.foto || "";
        const esAdmin = String(rolUsuario).toLowerCase().includes("admin");

        const authGuest = $("auth-guest");
        if (authGuest) authGuest.style.display = "none";

        const authMobile = document.querySelector(".auth-buttons-mobile");
        if (authMobile) authMobile.style.display = "none";

        const navActions = document.querySelector(".nav-actions");

        if (
            navActions &&
            !$("user-profile-menu-container")
        ) {
            const menuContainer = document.createElement("div");

            menuContainer.id = "user-profile-menu-container";
            menuContainer.className = "octo-profile-container";

            const iniciales = esc(nombreUsuario.charAt(0).toUpperCase());

            const avatarContent = fotoUsuario
                ? `<img src="${esc(fotoUsuario)}"
                        alt="Avatar"
                        style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : iniciales;

            menuContainer.innerHTML = `
                <button type="button"
                        id="btn-perfil-trigger"
                        class="octo-profile-trigger">

                    <div class="octo-profile-avatar ${esAdmin ? "admin" : "client"}">
                        ${avatarContent}
                    </div>

                    <div class="octo-profile-info">
                        <span class="octo-profile-name">
                            ${esc(nombreUsuario)}
                        </span>

                        <span class="octo-profile-role ${esAdmin ? "admin" : "client"}">
                            ${esc(rolUsuario)}
                        </span>
                    </div>

                    <span style="font-size:9px;opacity:.5;margin-left:2px;">
                        ▼
                    </span>
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

                    <button type="button"
                            id="btn-cerrar-sesion"
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
                    dropdown.style.display === "block"
                        ? "none"
                        : "block";
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
            tituloBienvenida.textContent =
                `¡Bienvenido, ${nombreUsuario}!`;
        }

    } catch (error) {
        console.error(
            "Error al procesar los datos del usuario:",
            error
        );
    }
}

/* =========================================================
   CAMBIO DE TEMA
   ========================================================= */

function cambiarTema() {
    const btnTema = $("btn-toggle-theme");
    const htmlElement = document.documentElement;

    const savedTheme =
        localStorage.getItem("octoerp_theme") || "light";

    htmlElement.setAttribute("data-theme", savedTheme);

    if (btnTema) {
        btnTema.addEventListener("click", () => {
            const currentTheme =
                htmlElement.getAttribute("data-theme");

            const newTheme =
                currentTheme === "light" ? "dark" : "light";

            htmlElement.setAttribute("data-theme", newTheme);

            localStorage.setItem("octoerp_theme", newTheme);
        });
    }
}

/* =========================================================
   CARGAR PRODUCTOS DESDE RENDER
   ========================================================= */

async function cargarProductosDeCategoria() {
    const params = new URLSearchParams(window.location.search);
    const categoriaSeleccionada = params.get("cat");

    const tituloCatElem = $("titulo-categoria");
    const subtituloCatElem = $("subtitulo-categoria");
    const gridContainer = $("grid-productos-categoria");

    if (!categoriaSeleccionada) {
        if (tituloCatElem) {
            tituloCatElem.textContent = "Categoría no especificada";
        }

        if (gridContainer) {
            gridContainer.innerHTML = `
                <p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">
                    Selecciona una categoría del menú.
                </p>
            `;
        }

        return;
    }

    if (tituloCatElem) {
        tituloCatElem.textContent = categoriaSeleccionada;
    }

    if (subtituloCatElem) {
        subtituloCatElem.textContent =
            `Mostrando existencias en tiempo real para ${categoriaSeleccionada}`;
    }

    if (!gridContainer) return;

    gridContainer.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;color:var(--text-muted);">
            Cargando productos...
        </p>
    `;

    try {
        const respuesta = await fetch(API_URL);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        const productos = Array.isArray(datos)
            ? datos
            : (datos.productos || []);

        productosGlobales = productos.map((p, i) => ({
            id: p.id ?? p.id_producto ?? `p${i}`,
            nombre: p.nombre ?? "",

            precio: Number(p.precio) || 0,

            // Conservar el precio de oferta de PostgreSQL.
            precio_oferta:
                p.precio_oferta !== null &&
                p.precio_oferta !== undefined &&
                p.precio_oferta !== ""
                    ? Number(p.precio_oferta)
                    : null,

            stock: Number(p.stock ?? p.cantidad ?? 0),

            categoria: p.categoria
                ? String(p.categoria).trim()
                : "General",

            descripcion: p.descripcion ?? p.detalle ?? "",

            imagen: p.imagen_url ?? p.imagen ?? LOGO
        }));

        const categoriaNormalizada =
            categoriaSeleccionada.trim().toLowerCase();

        const productosFiltrados = productosGlobales.filter(
            (producto) =>
                producto.categoria.trim().toLowerCase() ===
                categoriaNormalizada
        );

        renderizarProductos(productosFiltrados);

    } catch (error) {
        console.error("Error al cargar productos:", error);

        gridContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:30px;color:red;">
                <p>No se pudieron cargar los productos.</p>
                <p>Comprueba la conexión con el servidor.</p>
            </div>
        `;
    }
}

/* =========================================================
   MOSTRAR TARJETAS DE PRODUCTOS
   ========================================================= */

function renderizarProductos(productosAMostrar) {
    const gridContainer = $("grid-productos-categoria");

    if (!gridContainer) return;

    gridContainer.innerHTML = "";

    if (productosAMostrar.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">
                <p>No hay productos registrados que coincidan con tu búsqueda.</p>
            </div>
        `;

        return;
    }

    productosAMostrar.forEach((prod) => {
        const agotado = prod.stock <= 0;

        const poco =
            prod.stock > 0 &&
            prod.stock <= 5;

        const tag = agotado
            ? "Agotado"
            : poco
                ? `Quedan ${prod.stock}`
                : "Disponible";

        const precios = obtenerPreciosProducto(prod);

        const precioHTML = generarHTMLPrecios(prod);

        const cardHTML = `
            <article
                class="card-producto-cat ${agotado ? "agotado" : ""}"
                data-id-card="${esc(prod.id)}"
                style="cursor:pointer;">

                <div class="box-imagen-prod" style="position:relative;">

                    <span style="
                        position:absolute;
                        top:5px;
                        right:5px;
                        font-size:10px;
                        padding:3px 8px;
                        background:var(--primary-purple);
                        color:#fff;
                        border-radius:4px;
                        font-weight:700;
                        z-index:2;">
                        ${tag}
                    </span>

                    ${precios.tieneOferta ? `
                        <span class="etiqueta-oferta-categoria">
                            -${precios.porcentaje}%
                        </span>
                    ` : ""}

                    <img
                        src="${esc(prod.imagen || LOGO)}"
                        alt="${esc(prod.nombre)}"
                        class="img-producto-item"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='../Imagenes/Logo.png'">
                </div>

                <div class="contenido-producto-categoria">
                    <h3 class="titulo-prod-item">
                        ${esc(prod.nombre)}
                    </h3>

                    <p class="stock-prod-item">
                        Stock: ${prod.stock} disp.
                    </p>

                    ${precioHTML}

                    <div class="footer-card-prod">
                        <button
                            class="btn-add-carrito-cat"
                            data-add="${esc(prod.id)}"
                            ${agotado ? "disabled" : ""}>
                            ${agotado ? "Agotado" : "Agregar"}
                        </button>
                    </div>
                </div>
            </article>
        `;

        gridContainer.insertAdjacentHTML("beforeend", cardHTML);
    });

    gridContainer.onclick = (e) => {
        const btn = e.target.closest("[data-add]");

        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            agregarAlCarrito(btn.dataset.add);
            return;
        }

        const card = e.target.closest("[data-id-card]");

        if (card) {
            abrirModalDetalle(card.dataset.idCard);
        }
    };
}

/* =========================================================
   BUSCADOR DE PRODUCTOS
   ========================================================= */

function initBuscaadorProductos() {
    const inputBuscador = $("input-buscador-prod");

    if (!inputBuscador) return;

    inputBuscador.addEventListener("input", (e) => {
        const textoBusqueda =
            e.target.value.toLowerCase().trim();

        const params = new URLSearchParams(window.location.search);
        const categoriaSeleccionada = params.get("cat") || "";

        const filtrados = productosGlobales.filter((prod) => {
            const coincideCat =
                categoriaSeleccionada === "" ||
                prod.categoria.trim().toLowerCase() ===
                categoriaSeleccionada.trim().toLowerCase();

            const coincideTexto =
                prod.nombre.toLowerCase().includes(textoBusqueda) ||
                prod.descripcion.toLowerCase().includes(textoBusqueda);

            return coincideCat && coincideTexto;
        });

        renderizarProductos(filtrados);
    });
}

/* =========================================================
   MODAL DE DETALLES DEL PRODUCTO
   ========================================================= */

function abrirModalDetalle(id) {
    const producto = productosGlobales.find(
        p => String(p.id) === String(id)
    );

    if (!producto) return;

    productoModalActualId = producto.id;

    if ($("modal-prod-img")) {
        $("modal-prod-img").src = producto.imagen || LOGO;
        $("modal-prod-img").onerror = function () {
            this.onerror = null;
            this.src = LOGO;
        };
    }

    if ($("modal-prod-titulo")) {
        $("modal-prod-titulo").textContent = producto.nombre;
    }

    if ($("modal-prod-categoria")) {
        $("modal-prod-categoria").textContent = producto.categoria;
    }

    const descElem = $("modal-prod-descripcion");

    if (descElem) {
        descElem.textContent =
            producto.descripcion?.trim()
                ? producto.descripcion
                : "Sin descripción disponible";
    }

    const precios = obtenerPreciosProducto(producto);
    const precioModal = $("modal-prod-precio");

    if (precioModal) {
        precioModal.innerHTML = precios.tieneOferta
            ? `
                <span class="precio-anterior-categoria">
                    ${fmt(precios.base)}
                </span>
                <span class="precio-oferta-categoria">
                    ${fmt(precios.final)}
                </span>
                <span class="badge-descuento-categoria">
                    -${precios.porcentaje}%
                </span>
            `
            : fmt(precios.base);
    }

    const btnModalAdd = $("modal-btn-add-carrito");

    if (btnModalAdd) {
        btnModalAdd.textContent =
            producto.stock <= 0 ? "Agotado" : "Agregar";

        btnModalAdd.disabled = producto.stock <= 0;
    }

    $("modal-detalle-producto")?.classList.remove("hidden");
}

function initModalDetalle() {
    const modal = $("modal-detalle-producto");
    const btnCerrar = $("btn-cerrar-modal-prod");
    const btnModalAdd = $("modal-btn-add-carrito");

    btnCerrar?.addEventListener("click", () => {
        modal?.classList.add("hidden");
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            modal &&
            !modal.classList.contains("hidden")
        ) {
            modal.classList.add("hidden");
        }
    });

    btnModalAdd?.addEventListener("click", () => {
        if (productoModalActualId !== null) {
            agregarAlCarrito(productoModalActualId);
            modal?.classList.add("hidden");
        }
    });
}

/* =========================================================
   CARRITO
   ========================================================= */

function cargarCarrito() {
    try {
        const datos =
            JSON.parse(localStorage.getItem("octo_carrito")) || [];

        return datos.map((i) => ({
            id: i.id ?? i.nombre,
            nombre: i.nombre,
            precio: Number(i.precio) || 0,
            cantidad: Number(i.cantidad) || 1
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

    document.addEventListener("click", (e) => {
        if (e.target.closest("#btn-cerrar-carrito")) {
            toggleModalCarrito();
        }
    });

    $("btn-finalizar-compra")?.addEventListener(
        "click",
        procesarCompra
    );

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
        const btn = e.target.closest("[data-accion]");

        if (!btn) return;

        const i = Number(btn.dataset.idx);
        const item = carrito[i];

        if (!item) return;

        if (btn.dataset.accion === "mas") {
            cambiarCantidad(i, 1);
        } else if (btn.dataset.accion === "menos") {
            cambiarCantidad(i, -1);
        } else {
            carrito.splice(i, 1);
            guardarCarrito();
            actualizarCarritoUI();
        }
    });
}

function toggleModalCarrito() {
    const modal = $("modal-carrito");

    if (modal) {
        modal.classList.toggle("hidden");
    }
}

function stockDe(id) {
    const producto = productosGlobales.find(
        p => String(p.id) === String(id)
    );

    return producto ? producto.stock : null;
}

function cambiarCantidad(i, delta) {
    const item = carrito[i];

    if (!item) return;

    const stock = stockDe(item.id);
    const nueva = Number(item.cantidad) + delta;

    if (nueva <= 0) {
        carrito.splice(i, 1);
    } else if (
        delta > 0 &&
        stock !== null &&
        nueva > stock
    ) {
        toast("Alcanzaste el stock disponible", "warn");
        return;
    } else {
        item.cantidad = nueva;
    }

    guardarCarrito();
    actualizarCarritoUI();
}

/* =========================================================
   AGREGAR AL CARRITO CON PRECIO DE OFERTA
   ========================================================= */

function agregarAlCarrito(id) {
    const producto = productosGlobales.find(
        p => String(p.id) === String(id)
    );

    if (!producto) {
        toast("No se encontró el producto", "warn");
        return;
    }

    const precios = obtenerPreciosProducto(producto);

    const item = carrito.find(
        i => String(i.id) === String(producto.id)
    );

    const cantidadActual = item
        ? Number(item.cantidad)
        : 0;

    if (cantidadActual >= producto.stock) {
        toast("Alcanzaste el stock disponible", "warn");
        return;
    }

    if (item) {
        item.cantidad++;
        item.precio = precios.final;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: precios.final,
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarCarritoUI();

    toast(
        precios.tieneOferta
            ? `${producto.nombre} agregado con descuento`
            : `${producto.nombre} agregado al carrito`
    );

    const btn = $("btn-cart");

    btn?.classList.remove("bump");
    void btn?.offsetWidth;
    btn?.classList.add("bump");
}

/* =========================================================
   ACTUALIZAR INTERFAZ DEL CARRITO
   ========================================================= */

function actualizarCarritoUI() {
    const lista = $("carrito-items-lista");
    const totalEl = $("carrito-monto-total");
    const badge = $("cart-count");

    if (badge) {
        badge.textContent = carrito.reduce(
            (s, i) => s + Number(i.cantidad),
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
                <button
                    class="btn-cant"
                    data-accion="menos"
                    data-idx="${i}"
                    aria-label="Quitar uno">−</button>

                <span class="cant-num">${item.cantidad}</span>

                <button
                    class="btn-cant"
                    data-accion="mas"
                    data-idx="${i}"
                    aria-label="Agregar uno">+</button>

                <button
                    class="btn-eliminar-item"
                    data-accion="quitar"
                    data-idx="${i}"
                    title="Eliminar">&times;</button>
            </div>
        </div>
    `).join("");

    if (totalEl) {
        totalEl.textContent = fmt(
            carrito.reduce(
                (s, i) => s + i.precio * i.cantidad,
                0
            )
        );
    }
}

/*
 * Esta función conserva el comportamiento que tenías.
 * Vaciar el carrito no registra por sí solo una venta en PostgreSQL.
 */
function procesarCompra() {
    if (!carrito.length) {
        return toast("Tu carrito está vacío", "warn");
    }

    toast(
        "Para registrar la compra, utiliza el proceso de pago conectado a la API.",
        "warn"
    );
}

/* =========================================================
   NOTIFICACIONES
   ========================================================= */

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
