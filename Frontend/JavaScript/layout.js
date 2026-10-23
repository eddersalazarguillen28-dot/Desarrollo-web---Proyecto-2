"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const sidebarContenedor = document.getElementById("sidebar-container");
    const headerContenedor = document.getElementById("header-container");

    // 1. Inyectar el menú lateral
    if (sidebarContenedor) {
        try {
            const resSidebar = await fetch("sidebar.html");
            if (resSidebar.ok) {
                sidebarContenedor.innerHTML = await resSidebar.text();
            }
        } catch (e) {
            console.error("No se pudo cargar el sidebar:", e);
        }
    }

    // 2. Inyectar el encabezado
    if (headerContenedor) {
        try {
            const resHeader = await fetch("header.html");
            if (resHeader.ok) {
                headerContenedor.innerHTML = await resHeader.text();
            }
        } catch (e) {
            console.error("No se pudo cargar el header:", e);
        }
    }

    // 3. Funcionalidad del botón desplegable del sidebar
    const toggleBtn = document.getElementById("sidebar-toggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    // 4. Leer en qué página estamos y marcar la pestaña activa
    const bodyId = document.body.id || "";
    const pageName = bodyId.replace("page-", "");

    const titleElement = document.getElementById("page-title");
    if (titleElement && pageName) {
        titleElement.innerText = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    }

    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        if (link.getAttribute("data-page") === pageName || link.getAttribute("data-pages") === pageName) {
            link.classList.add("active");
        }
    });

    // 5. Animación de entrada
    const mainContent = document.querySelector(".main-wrapper");
    if (mainContent) {
        mainContent.classList.add("fade-in-up");
    }

    // 6. Cargar datos del usuario en la interfaz (Sidebar y Header)
    procesarDatosUsuarioEnInterfaz();
});


/**
 * Función centralizada para pintar la información del usuario (Foto, Nombre, Rango)
 * tanto en el menú lateral como en la barra superior (Header).
 */
function procesarDatosUsuarioEnInterfaz() {
    const usuarioGuardado = localStorage.getItem("usuario");
    if (!usuarioGuardado) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);
        const nombreUsuario = usuario.nombre || "Usuario";
        const rolUsuario = usuario.rol || usuario.rango || "Cliente";
        const esAdmin = rolUsuario.toLowerCase() === "administrador";
        
        // Obtener la foto de perfil (Soporta .foto, .imagen, .foto_url, .imagen_url)
        const fotoUsuario = usuario.foto || usuario.imagen || usuario.foto_url || usuario.imagen_url;

        // --- A. ACTUALIZAR MENÚ LATERAL (SIDEBAR) ---
        const nombreSpan = document.getElementById("sidebar-user-name");
        if (nombreSpan) {
            nombreSpan.textContent = nombreUsuario;
        }

        const fotoImg = document.getElementById("sidebar-user-img");
        if (fotoImg && fotoUsuario) {
            // Si el usuario tiene una foto guardada (Base64 o URL), la asignamos
            fotoImg.src = fotoUsuario;
        }

        // --- B. GESTIÓN DE BOTONES DE INVITADO EN HEADER ---
        const authGuest = document.getElementById("auth-guest") || document.querySelector(".auth-buttons");
        if (authGuest) {
            authGuest.style.display = "none";
        }

        // --- C. RENDERIZAR BADGE DE PERFIL EN EL HEADER ---
        const contenedorHeaderRight = document.getElementById("user-header-right") || document.querySelector(".nav-actions");
        
        if (contenedorHeaderRight && !document.getElementById("user-profile-badge")) {
            const perfilDiv = document.createElement("div");
            perfilDiv.id = "user-profile-badge";
            perfilDiv.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                background: #f8f9fa;
                padding: 6px 14px;
                border-radius: 30px;
                border: 1px solid #eef0f5;
                margin-left: 10px;
            `;

            const iniciales = nombreUsuario.charAt(0).toUpperCase();

            // Si hay foto, podemos mostrar una miniatura circular en el header o mantener las iniciales. 
            // Aquí creamos el contenedor que soporta ambas opciones estéticamente.
            perfilDiv.innerHTML = `
                <div style="
                    width: 34px; 
                    height: 34px; 
                    background: ${esAdmin ? '#7367f0' : '#10b981'}; 
                    color: white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-size: 14px;
                    overflow: hidden;
                ">
                    ${fotoUsuario ? `<img src="${fotoUsuario}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">` : iniciales}
                </div>
                <div style="display: flex; flex-direction: column; text-align: left;">
                    <span style="font-size: 13px; font-weight: 700; color: #171d33; line-height: 1.2;">
                        ${nombreUsuario}
                    </span>
                    <span style="font-size: 11px; color: ${esAdmin ? '#7367f0' : '#64748b'}; font-weight: 600; text-transform: uppercase;">
                        ${rolUsuario}
                    </span>
                </div>
                <button type="button" id="btn-cerrar-sesion" title="Cerrar sesión" style="
                    background: none; 
                    border: none; 
                    color: #dc3545; 
                    cursor: pointer; 
                    font-size: 16px; 
                    margin-left: 8px;
                    padding: 4px;
                " aria-label="Cerrar sesión">
                    <i class="fa-solid fa-right-from-bracket">🚪</i>
                </button>
            `;

            contenedorHeaderRight.appendChild(perfilDiv);

            // Evento global para cerrar sesión de forma segura
            const btnCerrar = document.getElementById("btn-cerrar-sesion");
            if (btnCerrar) {
                btnCerrar.addEventListener("click", () => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    window.location.href = "inicioSesion.html";
                });
            }
        }

    } catch (e) {
        console.error("Error al procesar los datos del usuario en la interfaz:", e);
    }
}