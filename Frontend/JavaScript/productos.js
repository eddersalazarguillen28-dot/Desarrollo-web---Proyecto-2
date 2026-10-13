document.addEventListener("DOMContentLoaded", () => {
    renderizarProductos();
});

function renderizarProductos() {
    const contenedor = document.getElementById("grid-productos");
    const contador = document.getElementById("contador-productos");
    
    // Leer los datos del inventario guardados previamente
    const inventario = JSON.parse(localStorage.getItem("db_inventario")) || [];
    
    contenedor.innerHTML = ""; // Limpiar el grid
    
    if (inventario.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #4a5568;'>No hay productos en el inventario. Ve a la pestaña Inventario para agregar stock.</p>";
        contador.innerText = "Mostrando 0 productos";
        return;
    }

    // Recorrer el inventario y crear una tarjeta por cada elemento
    inventario.forEach(prod => {
        // Valores por defecto por si algún producto antiguo no tiene precio o descripción
        const precio = prod.precio ? `₡${prod.precio}` : '₡0';
        const descripcion = prod.descripcion ? prod.descripcion : 'Sin descripción disponible.';
        const imagen = prod.img ? prod.img : '../Imagenes/Logo.png';

        const card = document.createElement("div");
        card.className = "producto-card";
        
        // Al hacer clic, enviamos los datos dinámicos a la función del modal
        card.onclick = () => abrirModal(prod.nombre, prod.categoria, precio, descripcion, imagen);
        
        card.innerHTML = `
            <img src="${imagen}" alt="${prod.nombre}" class="card-img" style="object-fit: contain; width: 100%; height: 150px; margin-bottom: 15px;">
            <h3 class="card-titulo">${prod.nombre}</h3>
            <span class="card-categoria">${prod.categoria}</span>
            <p class="card-precio">${precio}</p>
        `;
        
        contenedor.appendChild(card);
    });

    contador.innerText = `Mostrando ${inventario.length} de ${inventario.length} productos`;
}

// Funciones globales para manejar el Modal
window.abrirModal = function(titulo, categoria, precio, descripcion, imagen) {
    document.getElementById('modal-titulo').innerText = titulo;
    document.getElementById('modal-categoria').innerText = categoria;
    document.getElementById('modal-precio').innerText = precio;
    document.getElementById('modal-desc').innerText = descripcion;
    document.getElementById('modal-img').src = imagen;

    document.getElementById('modal-producto').classList.add('activo');
};

window.cerrarModal = function() {
    document.getElementById('modal-producto').classList.remove('activo');
};

// Cerrar el modal al hacer clic fuera del cuadro de contenido
window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
};