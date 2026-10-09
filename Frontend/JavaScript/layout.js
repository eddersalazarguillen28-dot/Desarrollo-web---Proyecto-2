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