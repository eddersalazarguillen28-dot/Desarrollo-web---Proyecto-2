document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://octo-erp.onrender.com";
    const IMAGEN_POR_DEFECTO = "../Imagenes/Logo.png";

    const tbody = document.getElementById("cuerpo-inventario");
    const contador = document.getElementById("contador-inventario");
    const buscador = document.getElementById("buscador-inventario");

    // Elementos del panel lateral
    const formularioPanel = document.getElementById("formularioPanel");
    const formNuevo = document.getElementById("form-nuevo-producto");
    const btnAbrirModal = document.getElementById("btn-abrir-modal");
    const btnCerrarForm = document.getElementById("btn-cerrar-form");
    const btnCancelarForm = document.getElementById("btn-cancelar-form");

    const prodIdInput = document.getElementById("prodId");
    const tituloForm = document.getElementById("tituloForm");
    const subtituloForm = document.getElementById("subtituloForm");
    const guardarBtn = document.getElementById("btn-guardar-prod");
    const mensajeForm = document.getElementById("mensajeFormulario");

    let inventario = [];

    // Ocultar el formulario lateral al iniciar
    if (formularioPanel) {
        formularioPanel.style.display = "none";
    }

    function cerrarFormulario() {
        if (formularioPanel) formularioPanel.style.display = "none";
        if (formNuevo) formNuevo.reset();
        if (prodIdInput) prodIdInput.value = "";
        if (tituloForm) tituloForm.textContent = "Ingresar Producto";
        if (subtituloForm) subtituloForm.textContent = "Añade un nuevo producto con imagen y descripción";
        if (guardarBtn) guardarBtn.textContent = "Guardar Producto";
        if (btnCancelarForm) btnCancelarForm.hidden = true;
        if (mensajeForm) mensajeForm.textContent = "";

        const grupoOferta = document.getElementById("grupo-precio-oferta");
        if (grupoOferta) grupoOferta.style.display = "none";
    }

    // =====================================================
    // MODAL PERSONALIZADO DE CONFIRMACIÓN DE BAJA
    // =====================================================
    function mostrarModalConfirmacion(texto) {
        return new Promise((resolve) => {
            const modal = document.getElementById("modalConfirmar");
            const textoElem = document.getElementById("textoModalConfirm");
            const btnAceptar = document.getElementById("btnAceptarConfirm");
            const btnCancelar = document.getElementById("btnCancelarConfirm");
            const btnCerrar = document.getElementById("btnCerrarModalConfirm");

            if (!modal) {
                resolve(window.confirm(texto));
                return;
            }

            textoElem.textContent = texto;
            modal.style.display = "flex";

            const limpiarYResolver = (valor) => {
                modal.style.display = "none";
                btnAceptar.onclick = null;
                btnCancelar.onclick = null;
                btnCerrar.onclick = null;
                resolve(valor);
            };

            btnAceptar.onclick = () => limpiarYResolver(true);
            btnCancelar.onclick = () => limpiarYResolver(false);
            btnCerrar.onclick = () => limpiarYResolver(false);
        });
    }

    // =====================================================
    // CONSULTAR LA API DE FLASK
    // =====================================================
    async function consultarAPI(ruta, opciones = {}) {
        const headers = { ...opciones.headers };
        const esFormData = opciones.body instanceof FormData;

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
            throw new Error(`El servidor no devolvió JSON válido (${respuesta.status}).`);
        }

        if (!respuesta.ok) {
            throw new Error(datos.message || datos.error || `Error del servidor: ${respuesta.status}`);
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

        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">Cargando inventario...</td></tr>`;

        try {
            const respuesta = await consultarAPI("/api/productos");
            inventario = Array.isArray(respuesta) ? respuesta : (respuesta.productos || []);
            renderizarTabla();
        } catch (error) {
            console.error("Error cargando inventario:", error);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #dc3545;">No se pudo cargar el inventario. Revisá la conexión con Render.</td></tr>`;
            if (contador) contador.textContent = "Error al cargar los productos";
        }
    }

    // =====================================================
    // MOSTRAR PRODUCTOS Y BUSCADOR EN TIEMPO REAL (7 Columnas)
    // =====================================================
    function renderizarTabla() {
        if (!tbody) return;

        tbody.innerHTML = "";

        const texto = (buscador?.value || "").trim().toLowerCase();

        const filtrados = inventario.filter(prod =>
            (prod.nombre || "").toLowerCase().includes(texto) ||
            (prod.categoria || "").toLowerCase().includes(texto) ||
            (prod.ubicacion || "").toLowerCase().includes(texto)
        );

        if (filtrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay productos registrados.</td></tr>`;
            if (contador) contador.textContent = "No hay productos en inventario";
            return;
        }

        filtrados.forEach((prod) => {
            const tr = document.createElement("tr");
            const stock = Number(prod.stock) || 0;
            const claseStock = stock > 10 ? "good" : "low";

            // 1. Columna de imagen
            const imagenTd = document.createElement("td");
            const contenedorImagen = document.createElement("div");
            contenedorImagen.className = "imagen-producto";

            const imagen = document.createElement("img");
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
                cursor: zoom-in;
            `;

            imagen.title = "Haz clic para ampliar";

            imagen.addEventListener("mouseenter", () => {
                imagen.style.transform = "scale(1.06)";
                imagen.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.14)";
            });

            imagen.addEventListener("mouseleave", () => {
                imagen.style.transform = "scale(1)";
                imagen.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.08)";
            });

            imagen.addEventListener("error", () => {
                if (imagen.dataset.fallback !== "true") {
                    imagen.dataset.fallback = "true";
                    imagen.src = IMAGEN_POR_DEFECTO;
                }
            });

            // Ampliar imagen en visor modal
            imagen.addEventListener("click", () => {
                let visor = document.getElementById("visor-imagen-producto");

                if (!visor) {
                    visor = document.createElement("div");
                    visor.id = "visor-imagen-producto";
                    visor.style.cssText = `
                        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85);
                        display: flex; align-items: center; justify-content: center;
                        padding: 20px; box-sizing: border-box; z-index: 99999;
                        cursor: zoom-out; backdrop-filter: blur(4px);
                    `;

                    const grande = document.createElement("img");
                    grande.id = "imagen-ampliada-producto";
                    grande.style.cssText = `
                        max-width: 90vw; max-height: 85vh; object-fit: contain;
                        border-radius: 14px; background: white; padding: 10px;
                        box-sizing: border-box; box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                        cursor: default;
                    `;

                    const cerrar = document.createElement("button");
                    cerrar.type = "button";
                    cerrar.textContent = "×";
                    cerrar.style.cssText = `
                        position: absolute; top: 20px; right: 25px; width: 44px; height: 44px;
                        border: none; border-radius: 50%; background: white; color: #222;
                        font-size: 28px; cursor: pointer;
                    `;

                    cerrar.addEventListener("click", () => visor.remove());
                    visor.addEventListener("click", (e) => { if (e.target === visor) visor.remove(); });

                    visor.append(grande, cerrar);
                    document.body.appendChild(visor);
                }

                const grande = document.getElementById("imagen-ampliada-producto");
                grande.src = imagen.src;
                grande.alt = imagen.alt;
            });

            contenedorImagen.appendChild(imagen);
            imagenTd.appendChild(contenedorImagen);
            tr.appendChild(imagenTd);

            // 2. Columna Nombre del Artículo
            const nombreTd = document.createElement("td");
            const nombreStrong = document.createElement("strong");
            nombreStrong.textContent = prod.nombre || "";
            nombreTd.appendChild(nombreStrong);
            tr.appendChild(nombreTd);

            // 3. Columna Ubicación
            const ubicacionTd = document.createElement("td");
            ubicacionTd.textContent = prod.ubicacion || "productos";
            tr.appendChild(ubicacionTd);

            // 4. Columna Categoría
            const catTd = document.createElement("td");
            catTd.textContent = prod.categoria || "General";
            tr.appendChild(catTd);

            // 5. Columna Stock Actual
            const stockTd = document.createElement("td");
            const stockSpan = document.createElement("span");
            stockSpan.className = `stock ${claseStock}`;
            stockSpan.textContent = stock;
            stockTd.appendChild(stockSpan);
            tr.appendChild(stockTd);

            // 6. Columna Precio (Muestra precio base y oferta si aplica)
            const precioTd = document.createElement("td");
            const precioBaseNum = Number(prod.precio || 0).toLocaleString();
            if (prod.precio_oferta !== null && prod.precio_oferta !== undefined && prod.precio_oferta !== "") {
                const precioOfertaNum = Number(prod.precio_oferta).toLocaleString();
                precioTd.innerHTML = `<span style="text-decoration: line-through; color: #94a3b8; font-size: 12px;">₡${precioBaseNum}</span><br><strong style="color: #ea580c;">₡${precioOfertaNum}</strong>`;
            } else {
                precioTd.innerHTML = `<strong>₡${precioBaseNum}</strong>`;
            }
            tr.appendChild(precioTd);

            // 7. Columna Acciones
            const accionesTd = document.createElement("td");
            const acciones = document.createElement("div");
            acciones.className = "actions";

            const btnEditar = document.createElement("button");
            btnEditar.className = "edit";
            btnEditar.textContent = "Ajustar";
            btnEditar.onclick = () => prepararEdicion(prod);

            const btnEliminar = document.createElement("button");
            btnEliminar.className = "delete";
            btnEliminar.textContent = "Baja";
            btnEliminar.onclick = () => darDeBajaProducto(prod.id, prod.nombre);

            acciones.append(btnEditar, btnEliminar);
            accionesTd.appendChild(acciones);
            tr.appendChild(accionesTd);

            tbody.appendChild(tr);
        });

        if (contador) {
            contador.textContent = `Mostrando ${filtrados.length} artículos en inventario`;
        }
    }

    // =====================================================
    // CARGAR DATOS AL PANEL LATERAL PARA AJUSTAR
    // =====================================================
    function prepararEdicion(prod) {
        if (!formularioPanel) return;

        if (prodIdInput) prodIdInput.value = prod.id;
        document.getElementById("nombreProd").value = prod.nombre || "";
        document.getElementById("descProd").value = prod.descripcion || "";
        document.getElementById("categoriaProd").value = prod.categoria || "General";
        document.getElementById("stockProd").value = prod.stock ?? 0;
        document.getElementById("precioProd").value = prod.precio ?? 0;

        // Cargar ubicación seleccionada
        const selectUbicacion = document.getElementById("ubicacionProd");
        if (selectUbicacion) {
            selectUbicacion.value = prod.ubicacion || "productos";
        }

        // Cargar precio de oferta y mostrar/ocultar su contenedor
        const inputOferta = document.getElementById("precioOfertaProd");
        const grupoOferta = document.getElementById("grupo-precio-oferta");
        
        if (inputOferta) {
            inputOferta.value = prod.precio_oferta ?? "";
        }

        if (grupoOferta) {
            if (prod.ubicacion === "descuentos") {
                grupoOferta.style.display = "flex";
            } else {
                grupoOferta.style.display = "none";
            }
        }

        if (tituloForm) tituloForm.textContent = "Ajustar Producto";
        if (subtituloForm) subtituloForm.textContent = "Modifica existencias o datos del producto";
        if (guardarBtn) guardarBtn.textContent = "Actualizar Producto";
        if (btnCancelarForm) btnCancelarForm.hidden = false;
        if (mensajeForm) mensajeForm.textContent = "";

        formularioPanel.style.display = "block";
        document.getElementById("stockProd").focus();
    }

    // =====================================================
    // DAR DE BAJA CON MODAL DE CONFIRMACIÓN
    // =====================================================
    async function darDeBajaProducto(id, nombre) {
        if (!id) return;

        const confirmado = await mostrarModalConfirmacion(`¿Estás seguro de que deseas dar de baja el producto "${nombre}"?`);
        if (!confirmado) return;

        try {
            await consultarAPI(`/api/productos/${id}`, { method: "DELETE" });
            await cargarInventario();

            if (prodIdInput && prodIdInput.value == id) {
                cerrarFormulario();
            }
        } catch (error) {
            console.error("Error eliminando producto:", error);
            alert(`No se pudo eliminar: ${error.message}`);
        }
    }

    // =====================================================
    // CREAR O ACTUALIZAR PRODUCTO EN POSTGRESQL
    // =====================================================
    formNuevo?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = prodIdInput?.value;
        const esEdicion = Boolean(id);

        const nombre = document.getElementById("nombreProd")?.value.trim() || "";
        const descripcion = document.getElementById("descProd")?.value.trim() || "";
        const categoria = document.getElementById("categoriaProd")?.value.trim() || "General";
        const stock = Number(document.getElementById("stockProd")?.value || 0);
        const precio = Number(document.getElementById("precioProd")?.value || 0);
        const ubicacion = document.getElementById("ubicacionProd")?.value.trim() || "productos";
        const precioOferta = document.getElementById("precioOfertaProd")?.value.trim() || "";
        const archivo = document.getElementById("imagenProd")?.files?.[0] || null;

        if (!nombre) {
            if (mensajeForm) mensajeForm.textContent = "Ingresá el nombre del producto.";
            return;
        }

        try {
            if (mensajeForm) {
                mensajeForm.textContent = esEdicion ? "Actualizando producto..." : "Guardando producto...";
            }

            const url = esEdicion ? `/api/productos/${id}` : "/api/productos";
            const metodo = esEdicion ? "PUT" : "POST";

            let cuerpo;

            if (archivo) {
                cuerpo = new FormData();
                cuerpo.append("nombre", nombre);
                cuerpo.append("descripcion", descripcion);
                cuerpo.append("categoria", categoria);
                cuerpo.append("precio", String(precio));
                cuerpo.append("stock", String(stock));
                cuerpo.append("ubicacion", ubicacion);
                if (precioOferta) {
                    cuerpo.append("precio_oferta", precioOferta);
                }
                cuerpo.append("imagen", archivo);
            } else {
                cuerpo = JSON.stringify({
                    nombre,
                    descripcion,
                    categoria,
                    precio,
                    stock,
                    ubicacion,
                    precio_oferta: precioOferta ? Number(precioOferta) : null
                });
            }

            await consultarAPI(url, {
                method: metodo,
                body: cuerpo
            });

            if (mensajeForm) {
                mensajeForm.textContent = esEdicion ? "¡Producto actualizado!" : "¡Producto guardado!";
            }

            await cargarInventario();

            setTimeout(() => {
                cerrarFormulario();
            }, 800);

        } catch (error) {
            console.error("Error guardando producto:", error);
            if (mensajeForm) mensajeForm.textContent = error.message;
        }
    });

    // =====================================================
    // EVENTOS Y CONTROLES
    // =====================================================
    btnAbrirModal?.addEventListener("click", () => {
        const estaOculto = formularioPanel.style.display === "none" || formularioPanel.style.display === "";
        if (estaOculto) {
            cerrarFormulario();
            formularioPanel.style.display = "block";
            document.getElementById("nombreProd").focus();
        } else {
            cerrarFormulario();
        }
    });

    btnCerrarForm?.addEventListener("click", cerrarFormulario);
    btnCancelarForm?.addEventListener("click", cerrarFormulario);

    if (buscador) {
        buscador.addEventListener("input", renderizarTabla);
    }

    // Carga inicial
    cargarInventario();
});