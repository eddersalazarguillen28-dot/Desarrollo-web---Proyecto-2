document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://octo-erp.onrender.com";

    const tbody = document.getElementById("cuerpo-inventario");
    const contador = document.getElementById("contador-inventario");

    const modal = document.getElementById("modal-nuevo-producto");
    const formNuevo = document.getElementById("form-nuevo-producto");
    const btnAbrirModal = document.getElementById("btn-abrir-modal");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnCancelarModal = document.getElementById("btn-cancelar-modal");

    let inventario = [];

    // Consultar la API de Flask
    async function consultarAPI(ruta, opciones = {}) {
        const respuesta = await fetch(`${API_BASE}${ruta}`, {
            ...opciones,
            headers: {
                "Content-Type": "application/json",
                ...opciones.headers
            }
        });

        const texto = await respuesta.text();
        let datos = {};

        try {
            datos = texto ? JSON.parse(texto) : {};
        } catch {
            throw new Error(`El servidor no devolvió JSON válido (${respuesta.status}).`);
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.error || `Error del servidor: ${respuesta.status}`
            );
        }

        return datos;
    }

   async function cargarInventario() {
    tbody.innerHTML = `
        <tr>
            <td colspan="6">Cargando inventario...</td>
        </tr>`;

    try {
        const respuesta = await fetch(
            `${API_BASE}/api/productos`,
            { cache: "no-store" }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.message || datos.error || `Error HTTP ${respuesta.status}`
            );
        }

        // Tu Flask devuelve { status: "ok", productos: [...] }
        if (!Array.isArray(datos.productos)) {
            throw new Error("La API no devolvió una lista de productos válida.");
        }

        inventario = datos.productos;
        renderizarTabla();

    } catch (error) {
        console.error("Error cargando inventario:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    Error al cargar productos. Revisá la consola del navegador.
                </td>
            </tr>`;

        contador.textContent = "No se pudo cargar el inventario";
    }
}

    // Dibujar la tabla con los datos recibidos del backend
    function renderizarTabla() {
        tbody.innerHTML = "";

        if (inventario.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">No hay productos registrados.</td>
                </tr>`;
        }

        inventario.forEach((prod) => {
            const stock = Number(prod.stock) || 0;
            const claseStock = stock > 10 ? "good" : "low";
            const tr = document.createElement("tr");

            // Los datos de texto se insertan de forma segura
            const imagenTd = document.createElement("td");
            const contenedorImagen = document.createElement("div");
            contenedorImagen.className = "imagen-producto";

            const imagen = document.createElement("img");
            imagen.src = "../Imagenes/Logo.png";
            imagen.alt = prod.nombre || "Producto";
            imagen.style.cssText =
                "width:50px;height:50px;object-fit:contain";

            contenedorImagen.appendChild(imagen);
            imagenTd.appendChild(contenedorImagen);

            function crearCelda(valor) {
                const td = document.createElement("td");
                td.textContent = valor ?? "";
                return td;
            }

            tr.appendChild(imagenTd);

            const nombreTd = crearCelda(prod.nombre);
            const nombreStrong = document.createElement("strong");
            nombreStrong.textContent = prod.nombre || "";
            nombreTd.replaceChildren(nombreStrong);
            tr.appendChild(nombreTd);

            tr.appendChild(crearCelda(prod.categoria || "General"));

            // La tabla original usa SKU, pero la BD no tiene esa columna.
            tr.appendChild(crearCelda(`#PROD-${prod.id}`));

            const stockTd = document.createElement("td");
            const stockSpan = document.createElement("span");
            stockSpan.className = `stock ${claseStock}`;
            stockSpan.textContent = stock;
            stockTd.appendChild(stockSpan);
            tr.appendChild(stockTd);

            const accionesTd = document.createElement("td");
            const acciones = document.createElement("div");
            acciones.className = "actions";

            const btnEditar = document.createElement("button");
            btnEditar.className = "edit";
            btnEditar.dataset.id = prod.id;
            btnEditar.textContent = "Ajustar";
            btnEditar.style.cssText =
                "padding:5px 10px;cursor:pointer;background:#eef0ff;color:#7367f0;border:0;border-radius:4px";

            const btnEliminar = document.createElement("button");
            btnEliminar.className = "delete";
            btnEliminar.dataset.id = prod.id;
            btnEliminar.textContent = "Baja";
            btnEliminar.style.cssText =
                "padding:5px 10px;cursor:pointer;background:#ffebeb;color:#dc3545;border:0;border-radius:4px;margin-left:5px";

            acciones.append(btnEditar, btnEliminar);
            accionesTd.appendChild(acciones);
            tr.appendChild(accionesTd);

            tbody.appendChild(tr);
        });

        contador.textContent =
            `Mostrando ${inventario.length} artículos en inventario`;
    }

    // Controles del modal
    function cerrarModal() {
        modal?.classList.remove("activo");
        formNuevo?.reset();
    }

    btnAbrirModal?.addEventListener("click", () => {
        modal?.classList.add("activo");
    });

    btnCerrarModal?.addEventListener("click", cerrarModal);
    btnCancelarModal?.addEventListener("click", cerrarModal);

    // Crear un producto en la base de datos
    formNuevo?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("nombreProd").value.trim();
        const categoria =
            document.getElementById("categoriaProd").value.trim() || "General";
        const stock = Number(document.getElementById("stockProd").value);

        // Si el formulario ya tiene un campo precioProd, se utiliza.
        // Si no existe, el precio inicial será 0.
        const campoPrecio = document.getElementById("precioProd");
        const precio = campoPrecio ? Number(campoPrecio.value) : 0;

        if (!nombre || !Number.isInteger(stock) || stock < 0) {
            alert("Ingresá un nombre y un stock entero igual o mayor que cero.");
            return;
        }

        if (!Number.isFinite(precio) || precio < 0) {
            alert("Ingresá un precio válido.");
            return;
        }

        const botonEnviar = formNuevo.querySelector(
            'button[type="submit"]'
        );

        try {
            if (botonEnviar) botonEnviar.disabled = true;

            await consultarAPI("/api/productos", {
                method: "POST",
                body: JSON.stringify({
                    nombre,
                    categoria,
                    precio,
                    stock,
                    stock_minimo: 5
                })
            });

            await cargarInventario();
            cerrarModal();
            alert("Producto guardado en la base de datos.");
        } catch (error) {
            console.error("Error guardando producto:", error);
            alert(`No se pudo guardar el producto: ${error.message}`);
        } finally {
            if (botonEnviar) botonEnviar.disabled = false;
        }
    });

    // Ajustar el stock o dar de baja el producto
    tbody.addEventListener("click", async (e) => {
        const boton = e.target.closest("button[data-id]");
        if (!boton) return;

        const id = Number(boton.dataset.id);
        const producto = inventario.find(p => Number(p.id) === id);

        if (!producto) return;

        if (boton.classList.contains("edit")) {
            const nuevoStockTexto = prompt(
                `Actualizar stock de: ${producto.nombre}\nStock actual: ${producto.stock}`,
                producto.stock
            );

            if (nuevoStockTexto === null) return;

            const nuevoStock = Number(nuevoStockTexto);

            if (!Number.isInteger(nuevoStock) || nuevoStock < 0) {
                alert("El stock debe ser un número entero igual o mayor que cero.");
                return;
            }

            try {
                await consultarAPI(`/api/productos/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        nombre: producto.nombre,
                        precio: Number(producto.precio) || 0,
                        categoria: producto.categoria || "General",
                        stock: nuevoStock,
                        stock_minimo: Number(
                            producto.stock_minimo ?? producto.stockMinimo ?? 5
                        )
                    })
                });

                await cargarInventario();
                alert("Stock actualizado.");
            } catch (error) {
                console.error("Error actualizando stock:", error);
                alert(`No se pudo actualizar: ${error.message}`);
            }
        }

        if (boton.classList.contains("delete")) {
            if (!confirm(`¿Dar de baja a "${producto.nombre}"?`)) return;

            try {
                await consultarAPI(`/api/productos/${id}`, {
                    method: "DELETE"
                });

                await cargarInventario();
                alert("Producto eliminado.");
            } catch (error) {
                console.error("Error eliminando producto:", error);
                alert(
                    `No se pudo eliminar: ${error.message}\n` +
                    "Puede que el producto tenga ventas registradas."
                );
            }
        }
    });

    // Cargar datos reales al abrir la página
    cargarInventario();
});