
const API_URL = "https://octo-erp.onrender.com/api/dashboard";
const LOGO = "../Imagenes/Logo.png";


//
let productosGlobales = [];
let carrito = cargarCarrito();

const $ = (id) => document.getElementById(id);
const fmt = (n) => `₡${Number(n || 0).toLocaleString("es-CR")}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

document.addEventListener('DOMContentLoaded',() =>{
    cambiarTema();
    cargarCategoriasDesdeAPI();
    initCarrito();
    actualizarCarritoUI();
    //JS de inicioCliente
    
    initSesionYPerfilDropdown();
    

});

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



//Cargar productos dede el render

async function cargarCategoriasDesdeAPI() {
    const API_BASE = "https://octo-erp.onrender.com";
    const gridContainer = document.getElementById("grid-categorias-dinamico");
    const contadorCategorias = document.getElementById("contador-categorias");

    if(!gridContainer){
        console.error("No se encontro grid categorias dianmico");
        return;
    } 

    if(contadorCategorias){
        contadorCategorias.textContent = "Cargando categorias..."
    }

    const imagenesCategoriasPorDefecto = {
        "periféricos":"../Imagenes/perifericos.jpg",
        "componentes":"../Imagenes/componentes.png",
        "tarjetas de video":"../Imagenes/tarjetaVideo.png",
        "monitores":"../Imagenes/monitores.png",
        "memorias ram":"../Imagenes/RAM.png",
        "almacenamiento":"../Imagenes/almacenamiento.png",
        "muebles y sillas":"../Imagenes/mueblesSillas.png",
        "electrónica":"../Imagenes/electronica.png",
        "general":"../Imagenes/general.png"

    };

    try{
        const respuesta = await fetch(`${API_BASE}/api/productos`);
        const texto = await respuesta.text();
        let datos = texto ? JSON.parse(texto) : [];
        const productos = Array.isArray(datos) ? datos : (datos.productos || []);

        console.log("Productos de la API:", productos);

        //Productos agrupados por categoria

        const categoriasMap = {};

        productos.forEach(prod => {
            let catNombre = prod.categoria ? prod.categoria.trim() : "General";
            let catKey = catNombre.toLowerCase();

            if (!categoriasMap[catNombre]){

                const imagenDefault = imagenesCategoriasPorDefecto[catKey] || "../Imagenes/Logo.png";

                categoriasMap[catNombre] ={
                    nombre:catNombre,
                    key:catKey,
                    imagenPortada:imagenDefault,
                    productos:[]
                };
            }
            categoriasMap[catNombre].productos.push(prod);
        });

        const nombresCategorias = Object.keys(categoriasMap);
        if (contadorCategorias){
            contadorCategorias.textContent =  "";
        }

        gridContainer.innerHTML = "";

        if(nombresCategorias.length === 0){
            gridContainer.innerHTML = `
            <div style="grid-column:1/-1; text-align;center;padding:40px;color:var(--text-muted);">
                <p>No hay categorías registradas todavía</p>
            </div>`;
            return;
        }

        //tarjetas de las categorias
        nombresCategorias.forEach((nombreCat,index) => {
            const catData = categoriasMap[nombreCat];
            const cantidadItems = catData.productos.length;
            const imagenUrl = catData.imagenPortada;

            const tarjeta = document.createElement('a');
            tarjeta.className = `categoria-card ${index === 0 ? 'categoria-card-featured': ''}`;
            tarjeta.href = `productos-por-categoria.html?cat=${encodeURIComponent(nombreCat)}`;
            tarjeta.setAttribute('data-categoria',catData.key);
            tarjeta.style.animationDelay = `${index * 0.08}s`;

            tarjeta.innerHTML = `
                    <div class="imagen-categoria">
                        <img src ="${imagenUrl}" alt="${nombreCat}" loading="lazy">
                        <span></span>
                    </div>
                    <div class="categoria-info">
                        <div>
                            <h3>${nombreCat}</h3>
                            <p>${cantidadItems} ${cantidadItems===1 ? 'producto' : 'productos'} disponibles</p>
                        </div>
                    </div>
                `;
                gridContainer.appendChild(tarjeta);
        });

    }catch (error){
        console.error("Error al cargar categorías desde la API:",error);

        if (contadorCategorias){
            contadorCategorias.textContent = "Error al cargar categorias desde el servidor";
        }

    }
    
}


//TENTACULOS PULPO

document.addEventListener("DOMContentLoaded",() => {
    const canvas = document.getElementById("tentacles-canvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    let width=(canvas.width= canvas.parentElement.clientWidth);
    let height=(canvas.height = canvas.parentElement.clientHeight);

    window.addEventListener("resize",()=>{
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;

    });

    class Tentacle{
        constructor(x,y,length,segments,baseWidth,angleOffset,speed){
            this.x=x;
            this.y = y;
            this.length = length;
            this.segments= segments;
            this.baseWidth=baseWidth;
            this.angleOffset = angleOffset;
            this.speed = speed;
            this.angle = 0;
        }

        update(time){
            this.angle = Math.sin(time * this.speed + this.angleOffset)*0.4;
        }

        draw(time){
            ctx.save();
            ctx.translate(this.x,this.y);

            let pointsLeft = [];
            let pointsRight= [];
            let currentAngle = this.angleOffset;
            let cx = 0;
            let cy = 0;

            const segmentLen = this.length / this.segments;

            for(let i = 0; i<=this.segments;i++){
                const progress = i/this.segments;
                const wave = Math.sin(time*this.speed + i*0.3+this.angleOffset)*0.35*(progress+0.1);
                currentAngle = -Math.PI/2 + wave;

                const currentWidth = this.baseWidth * (1-progress*0.85);
                
                const nx = Math.cos(currentAngle + Math.PI/2) * (currentWidth/2);
                const ny = Math.sin(currentAngle+Math.PI/2) * (currentWidth/2);

                pointsLeft.push({x: cx-nx, y: cy-ny});
                pointsRight.push({x: cx+nx, y: cy+ny});


                if(i < this.segments){
                    cx += Math.cos(currentAngle)*segmentLen;
                    cy += Math.sin(currentAngle)*segmentLen;
                }


            }

            const gradient = ctx.createLinearGradient(0,0,cx,cy);
            gradient.addColorStop(0,"rgba(108,92,231,0.45)");
            gradient.addColorStop(0.5,"rgba(139,119,255,0.35)");
            gradient.addColorStop(1,"rgba(108,92,231,0.05)");

            ctx.beginPath();
            ctx.moveTo(pointsLeft[0].x,pointsLeft[0].y);

            for(let i = 1; i<pointsLeft.length;i++){
                ctx.lineTo(pointsLeft[i].x, pointsLeft[i].y);
            }

            for(let i=pointsRight.length-1;i>=0;i--){
                ctx.lineTo(pointsRight[i].x, pointsRight[i].y);
            }

            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(108,92,231,0.5)";
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,0.4)";
            for(let i = 2; i<pointsRight.length-2; i+=2){
                const pt = pointsRight[i];
                const r = (1-i / pointsRight.length)*3+1;
                ctx.beginPath();
                ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
                ctx.fill();
            }

            ctx.restore();



        }
    }

    //config tentaculos

    const tentacles=[
        new Tentacle (width * 0.68, height + 20,320,25,28,0,0.0018),
        new Tentacle (width * 0.78, height + 20,380,28,34,1.2,0.0015),
        new Tentacle (width * 0.88, height + 20,300,22,24,2.5,0.0022),
        new Tentacle (width * 0.96, height + 20,350,25,30,4.0,0.0017),
        new Tentacle (width + 10, height * 0.6,280,20,22,0.8,0.002)

    ];

    function animate(time){
        ctx.clearRect(0,0,width,height);

        tentacles.forEach(tentacle=>{
            tentacle.update(time);
            tentacle.draw(time);
        });

        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
        

    
})

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