document.addEventListener('DOMContentLoaded',() =>{
    cambiarTema();
    cargarProductosDeCategoria();

})

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
    const API_BASE = "https://octo-erp.onrender.com";
    const params = new URLSearchParams(window.location.search);
    const categoriaSeleccionada = params.get("cat");
    const tituloCatElem = document.getElementById("titulo-categoria");
    const subtituloCatElem = document.getElementById("subtitulo-categoria");
    const gridContainer = document.getElementById("grid-productos-categoria");

    if(!categoriaSeleccionada){
        if(tituloCatElem) tituloCatElem.textContent = "Categoría no especificada";
        if(gridContainer.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">Selecciona una categoría del menú</p>`);
        return;
    }

    if(tituloCatElem) tituloCatElem.textContent=`Categoría: ${categoriaSeleccionada}`;
    if(subtituloCatElem)subtituloCatElem.textContent=`Mostrando existencias en tiempo real para ${categoriaSeleccionada}`;

    if(!gridContainer)return;
    gridContainer.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);">Cargando productos...</p>`;

    try{
        const respuesta = await fetch(`${API_BASE}/api/productos`);
        const texto = await respuesta.text();
        let datos = texto ? JSON.parse(texto) : [];
        const productos = Array.isArray(datos) ? datos : (datos.productos || []);

        const productosFiltrados = productos.filter(prod => {
            let catProd = prod.categoria ? prod.categoria.trim() : "General";
            return catProd.toLowerCase() === categoriaSeleccionada.toLowerCase();
        });

        gridContainer.innerHTML = "";
        
        if(productosFiltrados.length === 0){
            gridContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">
                <p>No hay productos registrados en esta categoria</p>
            </div>`;
            return;
        }

        productosFiltrados.forEach((prod) => {
            const imagenUrl = prod.imagen_url || "../Imagenes/Logo.png";
            const precioFormateado = Number(prod.precio || 0).toLocaleString();
            const stock = Number(prod.stock) || 0;

            const cardHTML=`
                <article class="card-producto-cat">
                    <div class="box-imagen-prod">
                        <img src="${imagenUrl}" alt="${prod.nombre}" class="img-producto-item">
                    </div>

                    <div>
                        <h3 class="titulo-prod-item">${prod.nombre}</h3>
                        <p class="stock-prod-item">Stock: ${stock} disp.</p>
                        <div class="footer-card-prod">
                            <span class="precio-prod-item">$${precioFormateado}</span>
                            <button class="btn-add-carrito-cat" onclick="agregarAlCarrito('${prod.nombre}')">Agregar</button>
                        </div>
                    </div>
                </article>`;

                gridContainer.innerHTML += cardHTML;
            
        });
    }catch(error){
        console.error("Error al cargar productos:", error);
        gridContainer.innerHTML=`
            <div style="grid-column:1/-1; text-align:center;padding:30px;color:red;">
            <p>Error al conectar con el servidor</p>
            </div>
        `
    }

    function agregarAlCarrito(nombreProducto){
        alert(`¡${nombreProducto} agregado al carrito!`);
    }
}