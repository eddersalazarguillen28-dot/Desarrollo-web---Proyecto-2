document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://octo-erp.onrender.com";
    const IMAGEN_POR_DEFECTO = "../Imagenes/Logo.png";

    const tbody = document.getElementById("cuerpo-inventario");
    const contador = document.getElementById("contador-inventario");

    const modal = document.getElementById("modal-nuevo-producto");
    const formNuevo = document.getElementById("form-nuevo-producto");
    const btnAbrirModal = document.getElementById("btn-abrir-modal");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnCancelarModal = document.getElementById("btn-cancelar-modal");

    let inventario = [];

    // =====================================================
    // CONSULTAR LA API DE FLASK
    // Admite JSON y FormData con imágenes.
    // =====================================================

    async function consultarAPI(ruta, opciones = {}) {
        const headers = { ...opciones.headers };
        const esFormData = opciones.body instanceof FormData;

        // El navegador debe definir el Content-Type de FormData.
        if (!esFormData && opciones.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const respuesta = await fetch(`${API_BASE}${ruta}`, {
            ...opciones,
            headers
        });

        const texto = await respuesta.text();
        let datos = {};

        try {
            datos = texto ? JSON.parse(texto) : {};
        } catch {
            throw new Error(
                `El servidor no devolvió JSON válido (${respuesta.status}).`
            );
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.message ||
                datos.error ||
                `Error del servidor: ${respuesta.status}`
            );
        }

        return datos;
    }

    // =====================================================
    // CARGAR PRODUCTOS DESDE POSTGRESQL
    // =====================================================

    async function cargarInventario() {
        if (!tbody) {
            console.error("No se encontró #cuerpo-inventario.");
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="6">Cargando inventario...</td>
            </tr>`;

        try {
            const respuesta = await consultarAPI("/api/productos");

            inventario = Array.isArray(respuesta)
                ? respuesta
                : respuesta.productos || [];

            renderizarTabla();
        } catch (error) {
            console.error("Error cargando inventario:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        No se pudo cargar el inventario.
                        Revisá la conexión con Render.
                    </td>
                </tr>`;

            if (contador) {
                contador.textContent = "Error al cargar los productos";
            }
        }
    }

    // =====================================================
    // MOSTRAR PRODUCTOS Y SUS IMÁGENES
    // =====================================================

    function renderizarTabla() {
        if (!tbody) return;

        tbody.innerHTML = "";

        if (inventario.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">No hay productos registrados.</td>
                </tr>`;
        }

        inventario.forEach((prod) => {
            const tr = document.createElement("tr");
            const stock = Number(prod.stock) || 0;
            const claseStock = stock > 10 ? "good" : "low";

            // Columna de imagen
            const imagenTd = document.createElement("td");
            const contenedorImagen = document.createElement("div");

            contenedorImagen.className = "imagen-producto";

            const imagen = document.createElement("img");

            // Utiliza la URL almacenada en la base de datos.
            // Si no hay imagen, muestra el logo.
           imagen.src = prod.imagen_url || IMAGEN_POR_DEFECTO;
imagen.alt = prod.nombre || "Producto";
imagen.loading = "lazy";
imagen.decoding = "async";

imagen.style.cssText = `
    width: 100px;
    height: 100px;
    object-fit: contain;
    object-position: center;
    display: block;
    margin: auto;
    padding: 6px;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
`;

// Efecto al pasar el cursor.
imagen.addEventListener("mouseenter", () => {
    imagen.style.transform = "scale(1.06)";
    imagen.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.14)";
});

imagen.addEventListener("mouseleave", () => {
    imagen.style.transform = "scale(1)";
    imagen.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.08)";
});

// Si la imagen falla, se muestra el logo una sola vez.
imagen.addEventListener("error", () => {
    if (imagen.dataset.fallback !== "true") {
        imagen.dataset.fallback = "true";
        imagen.src = IMAGEN_POR_DEFECTO;
    }
});

            contenedorImagen.appendChild(imagen);
            imagenTd.appendChild(contenedorImagen);
            tr.appendChild(imagenTd);

            function crearCelda(valor) {
                const td = document.createElement("td");
                td.textContent = valor ?? "";
                return td;
            }

            // Nombre
            const nombreTd = crearCelda("");
            const nombreStrong = document.createElement("strong");

            nombreStrong.textContent = prod.nombre || "";
            nombreTd.appendChild(nombreStrong);
            tr.appendChild(nombreTd);

            // Categoría
            tr.appendChild(crearCelda(prod.categoria || "General"));

            // La base de datos actual no tiene una columna SKU.
            tr.appendChild(crearCelda(`#PROD-${prod.id}`));

            // Stock
            const stockTd = document.createElement("td");
            const stockSpan = document.createElement("span");

            stockSpan.className = `stock ${claseStock}`;
            stockSpan.textContent = stock;

            stockTd.appendChild(stockSpan);
            tr.appendChild(stockTd);

            // Acciones
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

        if (contador) {
            contador.textContent =
                `Mostrando ${inventario.length} artículos en inventario`;
        }
    }

    // =====================================================
    // CONTROLES DEL MODAL
    // =====================================================

    function cerrarModal() {
        modal?.classList.remove("activo");
        formNuevo?.reset();
    }

    btnAbrirModal?.addEventListener("click", () => {
        modal?.classList.add("activo");
    });

    btnCerrarModal?.addEventListener("click", cerrarModal);
    btnCancelarModal?.addEventListener("click", cerrarModal);

    // =====================================================
    // CREAR PRODUCTO CON IMAGEN OPCIONAL
    // =====================================================

    formNuevo?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const campoNombre = document.getElementById("nombreProd");
        const campoCategoria = document.getElementById("categoriaProd");
        const campoStock = document.getElementById("stockProd");
        const campoPrecio = document.getElementById("precioProd");
        const campoStockMinimo = document.getElementById("stockMinimoProd");
        const campoImagen = document.getElementById("imagenProd");

        const nombre = campoNombre?.value.trim() || "";
        const categoria =
            campoCategoria?.value.trim() || "General";

        const stock = Number(campoStock?.value);
        const precio = campoPrecio
            ? Number(campoPrecio.value)
            : 0;

        const stockMinimo = campoStockMinimo
            ? Number(campoStockMinimo.value)
            : 5;

        const archivo = campoImagen?.files?.[0] || null;

        if (!nombre) {
            alert("Ingresá el nombre del producto.");
            return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            alert("El stock debe ser un número entero igual o mayor que cero.");
            return;
        }

        if (!Number.isFinite(precio) || precio < 0) {
            alert("Ingresá un precio válido.");
            return;
        }

        if (!Number.isInteger(stockMinimo) || stockMinimo < 0) {
            alert("El stock mínimo debe ser un entero igual o mayor que cero.");
            return;
        }

        // Comprobación básica del archivo antes de subirlo.
        if (archivo) {
            const tiposPermitidos = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            if (!tiposPermitidos.includes(archivo.type)) {
                alert("La imagen debe ser JPG, PNG, WEBP o GIF.");
                return;
            }

            if (archivo.size > 5 * 1024 * 1024) {
                alert("La imagen no puede superar los 5 MB.");
                return;
            }
        }

        const botonEnviar = formNuevo.querySelector(
            'button[type="submit"]'
        );

        try {
            if (botonEnviar) {
                botonEnviar.disabled = true;
                botonEnviar.textContent = "Guardando...";
            }

            // FormData permite enviar el archivo y los datos juntos.
            const formulario = new FormData();

            formulario.append("nombre", nombre);
            formulario.append("categoria", categoria);
            formulario.append("precio", String(precio));
            formulario.append("stock", String(stock));
            formulario.append("stock_minimo", String(stockMinimo));

            if (archivo) {
                formulario.append("imagen", archivo);
            }

            await consultarAPI("/api/productos", {
                method: "POST",
                body: formulario
            });

            await cargarInventario();
            cerrarModal();

            alert(
                archivo
                    ? "Producto e imagen guardados correctamente."
                    : "Producto guardado correctamente."
            );
        } catch (error) {
            console.error("Error guardando producto:", error);

            alert(
                `No se pudo guardar el producto: ${error.message}`
            );
        } finally {
            if (botonEnviar) {
                botonEnviar.disabled = false;
                botonEnviar.textContent = "Guardar producto";
            }
        }
    });

    // =====================================================
    // AJUSTAR STOCK Y DAR DE BAJA PRODUCTOS
    // =====================================================

    tbody?.addEventListener("click", async (e) => {
        const boton = e.target.closest("button[data-id]");

        if (!boton) return;

        const id = Number(boton.dataset.id);

        const producto = inventario.find(
            p => Number(p.id) === id
        );

        if (!producto) return;

        // Ajustar stock
        if (boton.classList.contains("edit")) {
            const nuevoStockTexto = prompt(
                `Actualizar stock de: ${producto.nombre}\n` +
                `Stock actual: ${producto.stock}`,
                producto.stock
            );

            if (nuevoStockTexto === null) return;

            const nuevoStock = Number(nuevoStockTexto);

            if (!Number.isInteger(nuevoStock) || nuevoStock < 0) {
                alert(
                    "El stock debe ser un número entero igual o mayor que cero."
                );
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
                            producto.stock_minimo ??
                            producto.stockMinimo ??
                            5
                        ),
                        imagen_url: producto.imagen_url || null
                    })
                });

                await cargarInventario();
                alert("Stock actualizado.");
            } catch (error) {
                console.error("Error actualizando stock:", error);

                alert(
                    `No se pudo actualizar: ${error.message}`
                );
            }
        }

        // Eliminar producto
        if (boton.classList.contains("delete")) {
            if (!confirm(`¿Dar de baja a "${producto.nombre}"?`)) {
                return;
            }

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
    
   

    cargarInventario();
});