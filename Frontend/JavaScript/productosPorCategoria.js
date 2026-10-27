const API_URL = "https://octo-erp.onrender.com/api/dashboard";
const LOGO = "../Imagenes/Logo.png";

//
let productosGlobales = [];
let carrito = cargarCarrito();
let productoModalActualId=null;

const $ = (id) => document.getElementById(id);
const fmt = (n) => `₡${Number(n || 0).toLocaleString("es-CR")}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

//

document.addEventListener('DOMContentLoaded',() =>{
    cambiarTema();
    cargarProductosDeCategoria();
    initCarrito();
    actualizarCarritoUI();
    initSesionYPerfilDropdown();
    initModalDetalle();
    initBuscaadorProductos();


})

/* ==========================================================================
   GESTIÓN DE SESIÓN, PERFIL DROPDOWN Y BIENVENIDA (ESTILO ÉLITE)
   ========================================================================== */
function initSesionYPerfilDropdown() {
    const usuarioGuardado = localStorage.getItem("usuario");
    const tituloBienvenida = document.getElementById("titulo-bienvenida");

    if (!usuarioGuardado) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);
        
        // Extraer nombre, rol y foto de perfil de forma flexible
        const nombreUsuario = usuario.nombre || usuario.nombres || usuario.name || "Cliente";
        const rolUsuario = usuario.rol || usuario.rango || "Cliente";
        const fotoUsuario = usuario.foto || ""; 
        const esAdmin = rolUsuario.toLowerCase().includes("admin");

        // 1. Ocultar botones de "Iniciar Sesión" y "Registrarse" (Escritorio y Móvil)
        const authGuest = document.getElementById("auth-guest");
        if (authGuest) authGuest.style.display = "none";

        const authMobile = document.querySelector(".auth-buttons-mobile");
        if (authMobile) authMobile.style.display = "none";

        // 2. Inyectar el menú desplegable del perfil en la barra de navegación
        const navActions = document.querySelector(".nav-actions");
        if (navActions && !document.getElementById("user-profile-menu-container")) {
            
            const menuContainer = document.createElement("div");
            menuContainer.id = "user-profile-menu-container";
            menuContainer.className = "octo-profile-container";

            const iniciales = nombreUsuario.charAt(0).toUpperCase();

            // Si el usuario subió una foto personalizada, se usa la etiqueta <img>, de lo contrario muestra la inicial
            const avatarContent = fotoUsuario 
                ? `<img src="${fotoUsuario}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                : iniciales;

            menuContainer.innerHTML = `
                <button type="button" id="btn-perfil-trigger" class="octo-profile-trigger">
                    <div class="octo-profile-avatar ${esAdmin ? 'admin' : 'client'}">
                        ${avatarContent}
                    </div>
                    <div class="octo-profile-info">
                        <span class="octo-profile-name">${nombreUsuario}</span>
                        <span class="octo-profile-role ${esAdmin ? 'admin' : 'client'}">${rolUsuario}</span>
                    </div>
                    <span style="font-size: 9px; opacity: 0.5; margin-left: 2px;">▼</span>
                </button>

                <!-- Menú Desplegable con Estilo Élite y SVGs -->
                <div id="perfil-dropdown" class="octo-profile-dropdown">
                    <a href="perfil.html" class="octo-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Ver y Editar Perfil
                    </a>
                    
                    ${esAdmin ? `
                    <a href="inventario.html" class="octo-dropdown-item admin-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        Panel de Control
                    </a>` : ''}

                    <div class="octo-dropdown-divider"></div>

                    <button type="button" id="btn-cerrar-sesion" class="octo-dropdown-item logout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Cerrar Sesión
                    </button>
                </div>
            `;

            navActions.appendChild(menuContainer);

            // Eventos del dropdown
            const trigger = document.getElementById("btn-perfil-trigger");
            const dropdown = document.getElementById("perfil-dropdown");

            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                const visible = dropdown.style.display === "block";
                dropdown.style.display = visible ? "none" : "block";
            });

            document.addEventListener("click", (e) => {
                if (!menuContainer.contains(e.target)) {
                    dropdown.style.display = "none";
                }
            });

            // Evento para cerrar sesión
            document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
                localStorage.removeItem("token");
                localStorage.removeItem("usuario");
                window.location.href = "inicioSesion.html";
            });
        }

        // 3. Actualizar el mensaje de bienvenida en grande
        if (tituloBienvenida) {
            tituloBienvenida.textContent = `¡Bienvenido, ${nombreUsuario}!`;
        }

    } catch (e) {
        console.error("Error al procesar los datos del usuario en localStorage:", e);
    }
}


function cambiarTema(){
    const btnTema = document.getElementById('btn-toggle-theme');
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('octoerp_theme')||'light';
    htmlElement.setAttribute('data-theme',savedTheme);

    if (btnTema){
        btnTema.addEventListener('click', () => {
            const currentTheme =htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' :'light';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('octoerp_theme',newTheme);
        })
    }

}



async function cargarProductosDeCategoria(){
    const params = new URLSearchParams(window.location.search);
    const categoriaSeleccionada = params.get("cat");
    const tituloCatElem = document.getElementById("titulo-categoria");
    const subtituloCatElem = document.getElementById("subtitulo-categoria");
    const gridContainer = document.getElementById("grid-productos-categoria");

    if(!categoriaSeleccionada){
        if(tituloCatElem) tituloCatElem.textContent = "Categoría no especificada";
        if(gridContainer) {
            gridContainer.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">Selecciona una categoría del menú</p>`;
        }
        return;
    }

    if(tituloCatElem) tituloCatElem.textContent=`${categoriaSeleccionada}`;
    if(subtituloCatElem)subtituloCatElem.textContent=`Mostrando existencias en tiempo real para ${categoriaSeleccionada}`;

    if(!gridContainer)return;
    gridContainer.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);">Cargando productos...</p>`;

    try{
        const respuesta = await fetch(API_URL);
        const texto = await respuesta.text();
        let datos = texto ? JSON.parse(texto) : [];
        const productos = Array.isArray(datos) ? datos : (datos.productos || []);

        //Guardar globalmente para las consultas del carrito
        productosGlobales = productos.map((p,i) => ({
            id:p.id ?? p.id_producto ?? `p${i}`,
            nombre:p.nombre ?? "",
            precio:Number(p.precio) || 0,
            stock:Number(p.stock ?? p.cantidad ?? 0),
            categoria:p.categoria ? p.categoria.trim() : "General",
            descripcion:p.descripcion ?? p.detalle ?? "",
            imagen:p.imagen_url ?? p.imagen ?? LOGO
        }))

        

        const productosFiltrados = productosGlobales.filter(prod => {
            let catProd = prod.categoria ? prod.categoria.trim() : "General";
            return catProd.toLowerCase() === categoriaSeleccionada.toLowerCase();
        });

        renderizarProductos(productosFiltrados);


        

    }catch(error){
        console.error("Error al cargar productos:", error);
        gridContainer.innerHTML=`
            <div style="grid-column:1/-1; text-align:center;padding:30px;color:red;">
            <p>Error al conectar con el servidor</p>
            </div>`;
    }

    
}

function renderizarProductos(productosAMostrar){
    const gridContainer = document.getElementById("grid-productos-categoria");
    if(!gridContainer)return;

    gridContainer.innerHTML = "";

    if(productosAMostrar.length === 0){
        gridContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">
                <p>No hay productos registrados o que coincidan con tu busqueda</p>
            </div>`;
        return;
    }

    productosAMostrar.forEach((prod) => {
            const agotado = prod.stock === 0;
            const poco = prod.stock > 0 && prod.stock <=5;
            const tag = agotado ? "Agotado" : poco ? `Quedan ${prod.stock}`:"Disponible";

            const imagenUrl = prod.imagen || LOGO;
            const precioFormateado = Number(prod.precio || 0).toLocaleString();
            const stock = prod.stock;

            const cardHTML=`
                <article class="card-producto-cat ${agotado?"agotado":""}" data-id-card="${prod.id}" style="cursor:pointer;">
                    <div class="box-imagen-prod" style="position:relative">
                        <span style="position:absolute;top:5px;right:5px;font-size:10px;padding:3px 8px;background:var(--primary-purple);color:#fff;border-radius:4px;font-weight:700;">${tag}</span>
                        <img src="${imagenUrl}" alt="${prod.nombre}" class="img-producto-item" loading="lazy" onerror="this.src = '../Imagenes/Logo.png'">
                    </div>

                    <div>
                        <h3 class="titulo-prod-item">${prod.nombre}</h3>
                        <p class="stock-prod-item">Stock: ${stock} disp.</p>
                        <div class="footer-card-prod">
                            <span class="precio-prod-item">₡${precioFormateado}</span>
                            <button class="btn-add-carrito-cat" data-add="${prod.id}" ${agotado ? "disabled" : ""}>${agotado ? "Agotado" : "Agregar"}</button>
                        </div>
                    </div>
                </article>`;

                gridContainer.innerHTML += cardHTML;
            
        });

        gridContainer.onclick = (e) => {
            const btn = e.target.closest("[data-add]");
            if (btn){
                agregarAlCarrito(btn.dataset.add);
                return;
            } 
           

            const card = e.target.closest("[data-id-card]");
            if(card){
                abrirModalDetalle(card.dataset.idCard);
            }
        };





}

function initBuscaadorProductos(){
    const inputBuscador = $("input-buscador-prod");
    if(!inputBuscador) return;

    inputBuscador.addEventListener("input",(e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();
        const params = new URLSearchParams(window.location.search);
        const categoriaSeleccionada = params.get("cat") || "";

        const filtrados = productosGlobales.filter(prod => {
            const coincideCat = categoriaSeleccionada === "" || (prod.categoria && prod.categoria.trim().toLowerCase() === categoriaSeleccionada.toLowerCase());
            const coincideTexto = prod.nombre.toLowerCase().includes(textoBusqueda) || prod.descripcion.toLowerCase().includes(textoBusqueda);
            return coincideCat && coincideTexto;
        });
        renderizarProductos(filtrados);
    })
}

/*Modal detalles producto */

function abrirModalDetalle(id){
    const producto = productosGlobales.find(p => String(p.id) === String(id));
    if (!producto) return;

    productoModalActualId = producto.id;

    $("modal-prod-img").src = producto.imagen || LOGO;
    $("modal-prod-titulo").textContent = producto.nombre;
    $("modal-prod-categoria").textContent = producto.categoria;

    const descElem = $("modal-prod-descripcion");
    if (producto.descripcion && producto.descripcion.trim() !== ""){
        descElem.textContent = producto.descripcion;
    }else{
        descElem.textContent = "Sin descripción disponible";
    }

    $("modal-prod-precio").textContent = fmt(producto.precio);

    const btnModalAdd = $("modal-btn-add-carrito");
    if(btnModalAdd){
        if(producto.stock === 0){
            btnModalAdd.textContent = "Agotado";
            btnModalAdd.disabled = true;
        }else{
            btnModalAdd.textContent = "Agregar";
            btnModalAdd.disabled = false;
        }
    }

    $("modal-detalle-producto")?.classList.remove("hidden");

}

function initModalDetalle(){
    const modal = $("modal-detalle-producto");
    const btnCerrar = $("btn-cerrar-modal-prod");
    const btnModalAdd = $("modal-btn-add-carrito");

    btnCerrar?.addEventListener("click", () => modal?.classList.add("hidden"));

    modal?.addEventListener("click",(e) => {
        if(e.target === modal)modal.classList.add("hidden");
    });
    document.addEventListener("keydown",(e) => {
        if(e.key === "Escape" && modal && !modal.classList.contains("hidden")){
            modal.classList.add("hidden");
        }
    });

    btnModalAdd?.addEventListener("click", () => {
        if(productoModalActualId !== null){
            agregarAlCarrito(productoModalActualId);
            modal?.classList.add("hidden");
        }
    })
}

/*Carrito de compraS */

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
    document.querySelector(".btn-cart") ?.addEventListener("click",toggleModalCarrito);
    document.addEventListener("click",(e)=>{
        if(e.target.closest("#btn-cerrar-carrito")){
            toggleModalCarrito();
        }
    })

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
    const modal = $("modal-carrito");
    if (modal){
        modal.classList.toggle("hidden");
    }
}

function stockDe(id) {
    const p = productosGlobales.find((x) => String(x.id) === String(id));
    return p ? p.stock : null;
}

function cambiarCantidad(i, delta) {
    const item = carrito[i];
    const stock = stockDe(item.id);
    const nueva = item.cantidad + delta;

    if (nueva <= 0) return carrito.splice(i, 1);
    if (delta > 0 && stock !== null && nueva > stock) return toast("Alcanzaste el stock disponible", "warn");
    item.cantidad = nueva;

    guardarCarrito();
    actualizarCarritoUI();
}

function agregarAlCarrito(id) {
    const p = productosGlobales.find((x) => String(x.id) === String(id));
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