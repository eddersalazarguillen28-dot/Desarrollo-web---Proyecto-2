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

    // 6. Cargar datos del usuario en la interfaz (Sidebar)
    procesarDatosUsuarioEnSidebar();
});


/**
 * Función encargada de pintar la información del usuario (Foto, Nombre, Rango)
 * exclusivamente en el menú lateral (Sidebar).
 */
function procesarDatosUsuarioEnSidebar() {
    const usuarioGuardado = localStorage.getItem("usuario");
    if (!usuarioGuardado) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);
        const nombreUsuario = usuario.nombre || "Usuario";
        const rolUsuario = usuario.rol || usuario.rango || "Cliente";
        const esAdmin = rolUsuario.toLowerCase() === "administrador";
        
        // Obtener la foto de perfil (Soporta .foto, .imagen, .foto_url, .imagen_url)
        const fotoUsuario = usuario.foto || usuario.imagen || usuario.foto_url || usuario.imagen_url;

        // --- ACTUALIZAR MENÚ LATERAL (SIDEBAR) ---
        const nombreSpan = document.getElementById("sidebar-user-name");
        if (nombreSpan) {
            nombreSpan.textContent = nombreUsuario;
        }

        // Asignar el rango/rol debajo del nombre
        const rolSpan = document.getElementById("sidebar-user-role");
        if (rolSpan) {
            rolSpan.textContent = rolUsuario;
            rolSpan.style.color = esAdmin ? '#a5b4fc' : '#10b981'; // Color morado claro si es admin, verde si es cliente
        }

        const fotoImg = document.getElementById("sidebar-user-img");
        if (fotoImg && fotoUsuario) {
            fotoImg.src = fotoUsuario;
        }

        // Ocultar botones de invitado si existieran en alguna barra auxiliar
        const authGuest = document.getElementById("auth-guest") || document.querySelector(".auth-buttons");
        if (authGuest) {
            authGuest.style.display = "none";
        }

    } catch (e) {
        console.error("Error al procesar los datos del usuario en el sidebar:", e);
    }
}