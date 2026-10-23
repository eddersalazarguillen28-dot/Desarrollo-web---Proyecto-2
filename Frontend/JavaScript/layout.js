document.addEventListener("DOMContentLoaded", async () => {
    const sidebarContenedor = document.getElementById("sidebar-container");
    const headerContenedor = document.getElementById("header-container");

    // Inyectar el menú lateral
    if (sidebarContenedor) {
        const resSidebar = await fetch("sidebar.html");
        sidebarContenedor.innerHTML = await resSidebar.text();
    }

    // Inyectar el encabezado
    if (headerContenedor) {
        const resHeader = await fetch("header.html");
        headerContenedor.innerHTML = await resHeader.text();
    }

    // Funcionalidad del botón desplegable
    const toggleBtn = document.getElementById("sidebar-toggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    // Leer en qué página estamos
    const bodyId = document.body.id || "";
    const pageName = bodyId.replace("page-", "");

    // Cambiar el título superior
    const titleElement = document.getElementById("page-title");
    if (titleElement && pageName) {
        titleElement.innerText = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    }

    // Marcar la pestaña seleccionada como Activa
    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        if (link.getAttribute("data-page") === pageName) {
            link.classList.add("active");
        }
    });

    // Animación de entrada
    const mainContent = document.querySelector(".main-wrapper");
    if (mainContent) {
        mainContent.classList.add("fade-in-up");
    }
});


document.addEventListener("DOMContentLoaded", () => {
    // Suponiendo que inyectas el header o buscas los contenedores de autenticación
    const contenedorAuthGuest = document.getElementById("auth-guest"); // Botones de login/registro
    const navActions = document.querySelector(".nav-actions"); // Parte derecha de la barra

    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado && navActions) {
        try {
            const usuario = JSON.parse(usuarioGuardado);

            // Ocultar los botones de invitado si existen
            if (contenedorAuthGuest) {
                contenedorAuthGuest.style.display = "none";
            }

            // Crear el elemento visual del perfil para la parte derecha
            let perfilDiv = document.getElementById("user-profile-badge");
            if (!perfilDiv) {
                perfilDiv = document.createElement("div");
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

                // Iniciales del nombre para el avatar circular
                const iniciales = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U";
                const esAdmin = usuario.rol === "administrador";

                perfilDiv.innerHTML = `
                    <div style="
                        width: 32px; 
                        height: 32px; 
                        background: ${esAdmin ? '#7367f0' : '#10b981'}; 
                        color: white; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-weight: bold; 
                        font-size: 14px;
                    ">
                        ${iniciales}
                    </div>
                    <div style="display: flex; flex-direction: column; text-align: left;">
                        <span style="font-size: 13px; font-weight: 600; color: #171d33; line-height: 1.2;">
                            ${usuario.nombre}
                        </span>
                        <span style="font-size: 11px; color: ${esAdmin ? '#7367f0' : '#64748b'}; font-weight: 500;">
                            ${esAdmin ? 'Administrador' : 'Cliente'}
                        </span>
                    </div>
                    <button type="button" id="btn-cerrar-sesion" title="Cerrar sesión" style="
                        background: none; 
                        border: none; 
                        color: #dc3545; 
                        cursor: pointer; 
                        font-size: 16px; 
                        margin-left: 6px;
                        padding: 4px;
                    ">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                `;

                navActions.appendChild(perfilDiv);

                // Lógica para cerrar sesión
                document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    window.location.href = "inicioSesion.html";
                });
            }
        } catch (e) {
            console.error("Error al leer el perfil del usuario:", e);
        }
    }
});


// Función para pintar el perfil del usuario y su rango en la barra superior
function verificarYMostrarPerfilUsuario() {
    const usuarioGuardado = localStorage.getItem("usuario");

    // Buscamos el contenedor derecho del header
    const contenedorHeaderRight = document.getElementById("user-header-right") || document.querySelector(".nav-actions");

    if (!usuarioGuardado || !contenedorHeaderRight) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);

        // Evitar duplicar el badge si ya se creó
        if (document.getElementById("user-profile-badge")) return;

        const perfilDiv = document.createElement("div");
        perfilDiv.id = "user-profile-badge";
        perfilDiv.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                background: #f8f9fa;
                padding: 6px 14px;
                border-radius: 30px;
                border: 1px solid #eef0f5;
            `;

        // Obtener inicial del nombre y verificar si es administrador
        const iniciales = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U";
        const rolUsuario = usuario.rol || usuario.rango || "Cliente";
        const esAdmin = rolUsuario.toLowerCase() === "administrador";

        perfilDiv.innerHTML = `
                <div style="
                    width: 36px; 
                    height: 36px; 
                    background: ${esAdmin ? '#7367f0' : '#10b981'}; 
                    color: white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-size: 15px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                ">
                    ${iniciales}
                </div>
                <div style="display: flex; flex-direction: column; text-align: left;">
                    <span style="font-size: 13px; font-weight: 700; color: #171d33; line-height: 1.2;">
                        ${usuario.nombre || "Usuario"}
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
                ">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            `;

        contenedorHeaderRight.appendChild(perfilDiv);

        // Evento para cerrar sesión de forma segura
        document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            window.location.href = "inicioSesion.html";
        });

    } catch (e) {
        console.error("Error al renderizar el perfil del usuario:", e);
    }
}



function verificarYMostrarPerfilUsuario() {
    const usuarioGuardado = localStorage.getItem("usuario");

    // Contenedores posibles (Admin o Cliente)
    const contenedorHeaderRight = document.getElementById("user-header-right"); // Panel Admin
    const navActions = document.querySelector(".nav-actions"); // Barra de Clientes

    // 🟢 Seleccionar el bloque de botones de invitado ("Iniciar Sesión" / "Registrarse")
    const authGuest = document.getElementById("auth-guest") || document.querySelector(".auth-buttons");

    // Si hay una sesión activa, ocultamos los botones de invitado
    if (usuarioGuardado && authGuest) {
        authGuest.style.display = "none";
    }

    if (!usuarioGuardado) return;

    try {
        const usuario = JSON.parse(usuarioGuardado);

        // Determinar dónde inyectar el perfil según la página
        const destino = contenedorHeaderRight || navActions;
        if (!destino || document.getElementById("user-profile-badge")) return;

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

        // Extraer iniciales y verificar el rango (Administrador o Cliente)
        const iniciales = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U";
        const rolUsuario = usuario.rol || "Cliente";
        const esAdmin = rolUsuario.toLowerCase() === "administrador";

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
                ">
                    ${iniciales}
                </div>
                <div style="display: flex; flex-direction: column; text-align: left;">
                    <span style="font-size: 13px; font-weight: 700; color: #171d33; line-height: 1.2;">
                        ${usuario.nombre || "Usuario"}
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
                    🚪
                </button>
            `;

        destino.appendChild(perfilDiv);

        // Evento para cerrar sesión: limpia el almacenamiento y redirige al login
        document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            window.location.href = "inicioSesion.html";
        });

    } catch (e) {
        console.error("Error al renderizar el perfil del usuario:", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);

            // Actualiza el nombre en el menú lateral
            const nombreSpan = document.getElementById("sidebar-user-name");
            if (nombreSpan && usuario.nombre) {
                nombreSpan.textContent = usuario.nombre;
            }

            // Actualiza la foto (ya sea en Base64 o URL) en el menú lateral
            const fotoImg = document.getElementById("sidebar-user-img");
            if (fotoImg && usuario.foto) {
                fotoImg.src = usuario.foto;
            }
        } catch (error) {
            console.error("Error al procesar los datos del usuario:", error);
        }
    }
});