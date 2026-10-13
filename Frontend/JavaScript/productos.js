document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
});

const API_BASE = "https://octo-erp.onrender.com";
const IMAGEN_POR_DEFECTO = "../Imagenes/Logo.png";

// 1. Consultar la API de la base de datos
async function cargarProductos() {
    const contenedor = document.getElementById("grid-productos");
    const contador = document.getElementById("contador-productos");

    if (!contenedor) return;

    // Mensaje de carga mientras responde el servidor
    contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #4a5568;'>Cargando catálogo de productos...</p>";

    try {
        const respuesta = await fetch(`${API_BASE}/api/productos`);
        if (!respuesta.ok) throw new Error("Error al obtener los productos del servidor");
        
        const datos = await respuesta.json();
        const inventario = Array.isArray(datos) ? datos : datos.productos || [];

        renderizarProductos(inventario, contenedor, contador);
    } catch (error) {
        console.error("Error:", error);
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #dc3545;'>Error al cargar los productos. Verifica tu conexión con la base de datos en Render.</p>";
        if (contador) contador.innerText = "Error de conexión";
    }
}

// 2. Dibujar las tarjetas en la página
function renderizarProductos(inventario, contenedor, contador) {
    contenedor.innerHTML = ""; // Limpiar el grid
    
    if (inventario.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #4a5568;'>No hay productos en el catálogo. Ve a la pestaña Inventario para agregar stock.</p>";
        if (contador) contador.innerText = "Mostrando 0 productos";
        return;
    }

    inventario.forEach(prod => {
        // Ajustamos los campos para que coincidan con lo que devuelve tu API
        const precio = prod.precio ? `₡${prod.precio}` : '₡0';
        const descripcion = prod.descripcion || 'Sin descripción disponible.';
        const imagen = prod.imagen_url || IMAGEN_POR_DEFECTO;

        const card = document.createElement("div");
        card.className = "producto-card";
        
        // Al hacer clic, enviamos los datos dinámicos a la función del modal
        card.onclick = () => abrirModal(prod.nombre, prod.categoria || "General", precio, descripcion, imagen);
        
        card.innerHTML = `
            <img src="${imagen}" alt="${prod.nombre}" class="card-img" style="object-fit: contain; width: 100%; height: 150px; margin-bottom: 15px;" onerror="this.src='${IMAGEN_POR_DEFECTO}'">
            <h3 class="card-titulo">${prod.nombre || "Producto sin nombre"}</h3>
            <span class="card-categoria">${prod.categoria || "General"}</span>
            <p class="card-precio">${precio}</p>
        `;
        
        contenedor.appendChild(card);
    });

    if (contador) {
        contador.innerText = `Mostrando ${inventario.length} de ${inventario.length} productos`;
    }
}

// FUNCIONES GLOBALES PARA EL MODAL

window.abrirModal = function(titulo, categoria, precio, descripcion, imagen) {
    document.getElementById('modal-titulo').innerText = titulo;
    document.getElementById('modal-categoria').innerText = categoria;
    document.getElementById('modal-precio').innerText = precio;
    document.getElementById('modal-desc').innerText = descripcion;
    
    // Asignar imagen y prever un error si el enlace está roto
    const modalImg = document.getElementById('modal-img');
    modalImg.src = imagen;
    modalImg.onerror = function() { 
        this.src = IMAGEN_POR_DEFECTO; 
    };

    document.getElementById('modal-producto').classList.add('activo');
};

window.cerrarModal = function() {
    document.getElementById('modal-producto').classList.remove('activo');
};

// Cerrar el modal al hacer clic en el fondo oscuro
window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
};