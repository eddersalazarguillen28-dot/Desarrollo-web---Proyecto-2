
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://octo-erp.onrender.com";
    const IMAGEN_POR_DEFECTO = "../Imagenes/Logo.png";

    // Ubicaciones disponibles en la tienda
    const UBICACIONES = {
        productos: "Catálogo general",
        oferta_principal: "Oferta principal",
        oferta_2: "Segunda oferta superior",
        oferta_3: "Tercera oferta superior",
        carrusel: "Carrusel de ofertas"
    };

    const UBICACIONES_PROMOCION = [
        "oferta_principal",
        "oferta_2",
        "oferta_3",
        "carrusel",
        "descuentos"
    ];

    // Elementos de la tabla
    const tbody = document.getElementById("cuerpo-inventario");
    const contador = document.getElementById("contador-inventario");
    const buscador = document.getElementById("buscador-inventario");

    // Panel del formulario
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

    const nombreInput = document.getElementById("nombreProd");
    const descripcionInput = document.getElementById("descProd");
    const categoriaInput = document.getElementById("categoriaProd");
    const stockInput = document.getElementById("stockProd");
    const precioInput = document.getElementById("precioProd");
    const precioOfertaInput = document.getElementById("precioOfertaProd");
    const imagenInput = document.getElementById("imagenProd");

    const grupoOferta = document.getElementById("grupo-precio-oferta");

    let inventario = [];

    // =====================================================
    // UBICACIONES: LEER, MARCAR Y MOSTRAR
    // =====================================================

    function obtenerCheckboxesUbicacion() {
        return Array.from(
            document.querySelectorAll('input[name="ubicaciones"]')
        );
    }

    function obtenerUbicacionesSeleccionadas() {
        return obtenerCheckboxesUbicacion()
            .filter(check => check.checked)
            .map(check => check.value);
    }

    function establecerUbicacionesSeleccionadas(ubicaciones) {
        const seleccionadas = normalizarUbicaciones(ubicaciones);

        obtenerCheckboxesUbicacion().forEach(check => {
            check.checked = seleccionadas.includes(check.value);
        });

        actualizarVisibilidadPrecioOferta();
    }

    function normalizarUbicaciones(valor) {
        if (Array.isArray(valor)) {
            return valor.map(String).filter(Boolean);
        }

        if (typeof valor === "string" && valor.trim()) {
            try {
                const resultado = JSON.parse(valor);

                if (Array.isArray(resultado)) {
                    return resultado.map(String).filter(Boolean);
                }
            } catch {
                // Compatibilidad con la ubicación individual anterior.
            }

            return [valor.trim()];
        }

        return [];
    }

    function obtenerUbicacionesProducto(producto) {
        // Preferir el nuevo arreglo de ubicaciones.
        if (Array.isArray(producto.ubicaciones)) {
            return normalizarUbicaciones(producto.ubicaciones);
        }

        // Algunas respuestas pueden enviar ubicaciones como JSON en texto.
        if (
            typeof producto.ubicaciones === "string" &&
            producto.ubicaciones.trim()
        ) {
            const ubicaciones = normalizarUbicaciones(producto.ubicaciones);

            if (ubicaciones.length > 0) {
                return ubicaciones;
            }
        }

        // Compatibilidad con productos guardados con una sola ubicación.
        if (producto.ubicacion) {
            return [String(producto.ubicacion)];
        }

        return ["productos"];
    }

    function obtenerTextoUbicaciones(producto) {
        return obtenerUbicacionesProducto(producto)
            .map(ubicacion => UBICACIONES[ubicacion] || ubicacion)
            .join(", ");
    }

    function actualizarVisibilidadPrecioOferta() {
        if (!grupoOferta) return;

        const ubicaciones = obtenerUbicacionesSeleccionadas();

        const mostrar = ubicaciones.some(ubicacion =>
            UBICACIONES_PROMOCION.includes(ubicacion)
        );

        grupoOferta.style.display = mostrar ? "flex" : "none";

        if (!mostrar && precioOfertaInput) {
            precioOfertaInput.value = "";
        }
    }

    obtenerCheckboxesUbicacion().forEach(check => {
        check.addEventListener("change", actualizarVisibilidadPrecioOferta);
    });

    // Funciones disponibles para otros scripts de la página.
    window.obtenerUbicacionesSeleccionadas =
        obtenerUbicacionesSeleccionadas;

    window.establecerUbicacionesSeleccionadas =
        establecerUbicacionesSeleccionadas;

    // =====================================================
    // ESTADO INICIAL Y CIERRE DEL FORMULARIO
    // =====================================================

    if (formularioPanel) {
        formularioPanel.style.display = "none";
    }

    function cerrarFormulario() {
        if (formularioPanel) {
            formularioPanel.style.display = "none";
        }

        if (formNuevo) {
            formNuevo.reset();
        }

        if (prodIdInput) prodIdInput.value = "";

        if (tituloForm) {
            tituloForm.textContent = "Ingresar Producto";
        }

        if (subtituloForm) {
            subtituloForm.textContent =
                "Añade un nuevo producto con imagen y descripción";
        }

        if (guardarBtn) {
            guardarBtn.textContent = "Guardar Producto";
            guardarBtn.disabled = false;
        }

        if (btnCancelarForm) {
            btnCancelarForm.hidden = true;
        }

        if (mensajeForm) {
            mensajeForm.textContent = "";
        }

        // Al crear un producto nuevo, seleccionar el catálogo general.
        establecerUbicacionesSeleccionadas(["productos"]);

        if (grupoOferta) {
            grupoOferta.style.display = "none";
        }

        const vistaPrevia = document.getElementById(
            "vista-previa-contenedor"
        );

        const imagenPrevia = document.getElementById(
            "vista-previa-imagen"
        );

        if (vistaPrevia) {
            vistaPrevia.style.display = "none";
        }

        if (imagenPrevia) {
            imagenPrevia.removeAttribute("src");
        }
    }

    // =====================================================
    // MODAL DE CONFIRMACIÓN
    // =====================================================

    function mostrarModalConfirmacion(texto) {
        return new Promise(resolve => {
            const modal = document.getElementById("modalConfirmar");
            const textoElem = document.getElementById("textoModalConfirm");
            const btnAceptar = document.getElementById("btnAceptarConfirm");
            const btnCancelar = document.getElementById("btnCancelarConfirm");
            const btnCerrar = document.getElementById("btnCerrarModalConfirm");

            if (!modal || !btnAceptar || !btnCancelar || !btnCerrar) {
                resolve(window.confirm(texto));
                return;
            }

            if (textoElem) {
                textoElem.textContent = texto;
            }

            modal.style.display = "flex";

            const limpiarYResolver = valor => {
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
    // CONSULTAS A LA API DE FLASK
    // =====================================================

    async function consultarAPI(ruta, opciones = {}) {
        const headers = { ...(opciones.headers || {}) };
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

        if (texto.trim()) {
            try {
                datos = JSON.parse(texto);
            } catch {
                if (respuesta.ok) {
                    throw new Error(
                        `El servidor no devolvió JSON válido (${respuesta.status}).`
                    );
                }

                throw new Error(
                    `Error del servidor: ${respuesta.status}. ${texto.slice(0, 200)}`
                );
            }
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
    // CARGAR PRODUCTOS
    // =====================================================

    async function cargarInventario() {
        if (!tbody) {
            console.error("No se encontró #cuerpo-inventario.");
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    Cargando inventario...
                </td>
            </tr>
        `;

        try {
            const respuesta = await consultarAPI("/api/productos");

            inventario = Array.isArray(respuesta)
                ? respuesta
                : Array.isArray(respuesta.productos)
                    ? respuesta.productos
                    : [];

            renderizarTabla();
        } catch (error) {
            console.error("Error cargando inventario:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7"
                        style="text-align:center; padding:20px; color:#dc3545;">
                        No se pudo cargar el inventario.
                        Revisá la conexión con Render.
                    </td>
                </tr>
            `;

            if (contador) {
                contador.textContent = "Error al cargar los productos";
            }
        }
    }

    // =====================================================
    // RENDERIZAR TABLA Y BUSCADOR
    // =====================================================

    function renderizarTabla() {
        if (!tbody) return;

        tbody.innerHTML = "";

        const texto = (buscador?.value || "").trim().toLowerCase();

        const filtrados = inventario.filter(producto => {
            const nombre = String(producto.nombre || "").toLowerCase();
            const categoria = String(producto.categoria || "").toLowerCase();
            const ubicaciones = obtenerTextoUbicaciones(producto).toLowerCase();

            return (
                nombre.includes(texto) ||
                categoria.includes(texto) ||
                ubicaciones.includes(texto)
            );
        });

        if (filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:20px;">
                        No hay productos registrados.
                    </td>
                </tr>
            `;

            if (contador) {
                contador.textContent = "No hay productos en inventario";
            }

            return;
        }

        filtrados.forEach(producto => {
            const tr = document.createElement("tr");

            const stock = Number(producto.stock) || 0;
            const claseStock = stock > 10 ? "good" : "low";

            // 1. Imagen
            const imagenTd = document.createElement("td");
            const contenedorImagen = document.createElement("div");

            contenedorImagen.className = "imagen-producto";

            const imagen = document.createElement("img");
            imagen.src = producto.imagen_url || IMAGEN_POR_DEFECTO;
            imagen.alt = producto.nombre || "Producto";
            imagen.loading = "lazy";
            imagen.decoding = "async";

            imagen.style.cssText = `
                width:100px;
                height:100px;
                object-fit:contain;
                object-position:center;
                display:block;
                margin:auto;
                padding:6px;
                box-sizing:border-box;
                background:#ffffff;
                border:1px solid #e5e7eb;
                border-radius:12px;
                box-shadow:0 2px 6px rgba(0,0,0,.08);
                transition:transform .2s ease, box-shadow .2s ease;
                cursor:zoom-in;
            `;

            imagen.title = "Haz clic para ampliar";

            imagen.addEventListener("mouseenter", () => {
                imagen.style.transform = "scale(1.06)";
                imagen.style.boxShadow = "0 4px 12px rgba(0,0,0,.14)";
            });

            imagen.addEventListener("mouseleave", () => {
                imagen.style.transform = "scale(1)";
                imagen.style.boxShadow = "0 2px 6px rgba(0,0,0,.08)";
            });

            imagen.addEventListener("error", () => {
                if (imagen.dataset.fallback !== "true") {
                    imagen.dataset.fallback = "true";
                    imagen.src = IMAGEN_POR_DEFECTO;
                }
            });

            // Visor para ampliar la imagen.
            imagen.addEventListener("click", () => {
                let visor = document.getElementById("visor-imagen-producto");

                if (!visor) {
                    visor = document.createElement("div");
                    visor.id = "visor-imagen-producto";

                    visor.style.cssText = `
                        position:fixed;
                        inset:0;
                        background:rgba(0,0,0,.85);
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        padding:20px;
                        box-sizing:border-box;
                        z-index:99999;
                        cursor:zoom-out;
                        backdrop-filter:blur(4px);
                    `;

                    const grande = document.createElement("img");
                    grande.id = "imagen-ampliada-producto";

                    grande.style.cssText = `
                        max-width:90vw;
                        max-height:85vh;
                        object-fit:contain;
                        border-radius:14px;
                        background:white;
                        padding:10px;
                        box-sizing:border-box;
                        box-shadow:0 10px 40px rgba(0,0,0,.4);
                        cursor:default;
                    `;

                    const cerrar = document.createElement("button");
                    cerrar.type = "button";
                    cerrar.textContent = "×";
                    cerrar.setAttribute("aria-label", "Cerrar imagen");

                    cerrar.style.cssText = `
                        position:absolute;
                        top:20px;
                        right:25px;
                        width:44px;
                        height:44px;
                        border:none;
                        border-radius:50%;
                        background:white;
                        color:#222;
                        font-size:28px;
                        cursor:pointer;
                    `;

                    cerrar.addEventListener("click", () => visor.remove());

                    visor.addEventListener("click", evento => {
                        if (evento.target === visor) {
                            visor.remove();
                        }
                    });

                    document.addEventListener("keydown", evento => {
                        if (evento.key === "Escape") {
                            const visorActual = document.getElementById(
                                "visor-imagen-producto"
                            );

                            visorActual?.remove();
                        }
                    });

                    visor.append(grande, cerrar);
                    document.body.appendChild(visor);
                }

                const grande = document.getElementById(
                    "imagen-ampliada-producto"
                );

                grande.src = imagen.src;
                grande.alt = imagen.alt;
            });

            contenedorImagen.appendChild(imagen);
            imagenTd.appendChild(contenedorImagen);
            tr.appendChild(imagenTd);

            // 2. Nombre
            const nombreTd = document.createElement("td");
            const nombreStrong = document.createElement("strong");

            nombreStrong.textContent = producto.nombre || "";
            nombreTd.appendChild(nombreStrong);
            tr.appendChild(nombreTd);

            // 3. Ubicaciones
            const ubicacionTd = document.createElement("td");
            const ubicacionesProducto = obtenerUbicacionesProducto(producto);

            ubicacionTd.textContent = obtenerTextoUbicaciones(producto) || "Catálogo general";
            ubicacionTd.title = ubicacionesProducto.join(", ");

            tr.appendChild(ubicacionTd);

            // 4. Categoría
            const categoriaTd = document.createElement("td");
            categoriaTd.textContent = producto.categoria || "General";
            tr.appendChild(categoriaTd);

            // 5. Stock
            const stockTd = document.createElement("td");
            const stockSpan = document.createElement("span");

            stockSpan.className = `stock ${claseStock}`;
            stockSpan.textContent = stock;

            stockTd.appendChild(stockSpan);
            tr.appendChild(stockTd);

            // 6. Precio
            const precioTd = document.createElement("td");
            const precioBase = Number(producto.precio || 0);
            const precioBaseTexto = precioBase.toLocaleString("es-CR");

            const precioOfertaValido =
                producto.precio_oferta !== null &&
                producto.precio_oferta !== undefined &&
                producto.precio_oferta !== "";

            if (precioOfertaValido) {
                const precioOferta = Number(producto.precio_oferta);

                const precioAnterior = document.createElement("span");
                precioAnterior.textContent = `₡${precioBaseTexto}`;
                precioAnterior.style.cssText = `
                    text-decoration:line-through;
                    color:#94a3b8;
                    font-size:12px;
                `;

                const salto = document.createElement("br");

                const precioNuevo = document.createElement("strong");
                precioNuevo.textContent =
                    `₡${precioOferta.toLocaleString("es-CR")}`;
                precioNuevo.style.color = "#ea580c";

                precioTd.append(precioAnterior, salto, precioNuevo);
            } else {
                const precio = document.createElement("strong");
                precio.textContent = `₡${precioBaseTexto}`;
                precioTd.appendChild(precio);
            }

            tr.appendChild(precioTd);

            // 7. Acciones
            const accionesTd = document.createElement("td");
            const acciones = document.createElement("div");

            acciones.className = "actions";

            const btnEditar = document.createElement("button");
            btnEditar.type = "button";
            btnEditar.className = "edit";
            btnEditar.textContent = "Ajustar";
            btnEditar.onclick = () => prepararEdicion(producto);

            const btnEliminar = document.createElement("button");
            btnEliminar.type = "button";
            btnEliminar.className = "delete";
            btnEliminar.textContent = "Baja";
            btnEliminar.onclick = () =>
                darDeBajaProducto(producto.id, producto.nombre);

            acciones.append(btnEditar, btnEliminar);
            accionesTd.appendChild(acciones);
            tr.appendChild(accionesTd);

            tbody.appendChild(tr);
        });

        if (contador) {
            contador.textContent =
                `Mostrando ${filtrados.length} artículos en inventario`;
        }
    }

    // =====================================================
    // PREPARAR EDICIÓN
    // =====================================================

    function prepararEdicion(producto) {
        if (!formularioPanel) return;

        if (prodIdInput) {
            prodIdInput.value = producto.id;
        }

        if (nombreInput) {
            nombreInput.value = producto.nombre || "";
        }

        if (descripcionInput) {
            descripcionInput.value = producto.descripcion || "";
        }

        if (categoriaInput) {
            categoriaInput.value = producto.categoria || "General";
        }

        if (stockInput) {
            stockInput.value = producto.stock ?? 0;
        }

        if (precioInput) {
            precioInput.value = producto.precio ?? 0;
        }

        if (precioOfertaInput) {
            precioOfertaInput.value = producto.precio_oferta ?? "";
        }

        // Marcar todas las ubicaciones que tenga el producto.
        establecerUbicacionesSeleccionadas(
            obtenerUbicacionesProducto(producto)
        );

        // Mostrar imagen actual como vista previa, si existe.
        const vistaPrevia = document.getElementById(
            "vista-previa-contenedor"
        );

        const imagenPrevia = document.getElementById(
            "vista-previa-imagen"
        );

        if (imagenPrevia && producto.imagen_url) {
            imagenPrevia.src = producto.imagen_url;

            if (vistaPrevia) {
                vistaPrevia.style.display = "block";
            }
        } else if (vistaPrevia) {
            vistaPrevia.style.display = "none";
        }

        if (tituloForm) {
            tituloForm.textContent = "Ajustar Producto";
        }

        if (subtituloForm) {
            subtituloForm.textContent =
                "Modifica existencias, precios, ubicaciones o datos del producto";
        }

        if (guardarBtn) {
            guardarBtn.textContent = "Actualizar Producto";
        }

        if (btnCancelarForm) {
            btnCancelarForm.hidden = false;
        }

        if (mensajeForm) {
            mensajeForm.textContent = "";
        }

        formularioPanel.style.display = "block";
        stockInput?.focus();
    }

    // =====================================================
    // DAR DE BAJA PRODUCTO
    // =====================================================

    async function darDeBajaProducto(id, nombre) {
        if (!id) return;

        const confirmado = await mostrarModalConfirmacion(
            `¿Estás seguro de que deseas dar de baja el producto "${nombre}"?`
        );

        if (!confirmado) return;

        try {
            await consultarAPI(`/api/productos/${id}`, {
                method: "DELETE"
            });

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
    // VALIDAR DATOS
    // =====================================================

    function validarDatosProducto(datos) {
        if (!datos.nombre) {
            return "Ingresá el nombre del producto.";
        }

        if (!Number.isFinite(datos.stock) || datos.stock < 0) {
            return "El stock debe ser un número mayor o igual a cero.";
        }

        if (!Number.isFinite(datos.precio) || datos.precio < 0) {
            return "El precio debe ser un número mayor o igual a cero.";
        }

        if (datos.ubicaciones.length === 0) {
            return "Seleccioná al menos una ubicación para el producto.";
        }

        if (datos.precioOferta !== null) {
            if (
                !Number.isFinite(datos.precioOferta) ||
                datos.precioOferta < 0
            ) {
                return "El precio de oferta no es válido.";
            }

            if (datos.precioOferta >= datos.precio) {
                return "El precio de oferta debe ser menor que el precio normal.";
            }
        }

        return null;
    }

    // =====================================================
    // CREAR O ACTUALIZAR PRODUCTO
    // =====================================================

    formNuevo?.addEventListener("submit", async evento => {
        evento.preventDefault();

        const id = prodIdInput?.value;
        const esEdicion = Boolean(id);

        const ubicaciones = obtenerUbicacionesSeleccionadas();

        const precioOfertaTexto =
            precioOfertaInput?.value.trim() || "";

        const datos = {
            nombre: nombreInput?.value.trim() || "",
            descripcion: descripcionInput?.value.trim() || "",
            categoria: categoriaInput?.value.trim() || "General",
            stock: Number(stockInput?.value || 0),
            precio: Number(precioInput?.value || 0),
            ubicaciones,
            precioOferta: precioOfertaTexto === ""
                ? null
                : Number(precioOfertaTexto)
        };

        const archivo = imagenInput?.files?.[0] || null;

        const errorValidacion = validarDatosProducto(datos);

        if (errorValidacion) {
            if (mensajeForm) {
                mensajeForm.textContent = errorValidacion;
            }

            return;
        }

        // Si no hay una ubicación promocional, no enviar precio de oferta.
        const tieneUbicacionPromocional = datos.ubicaciones.some(
            ubicacion => UBICACIONES_PROMOCION.includes(ubicacion)
        );

        if (!tieneUbicacionPromocional) {
            datos.precioOferta = null;
        }

        if (guardarBtn) {
            guardarBtn.disabled = true;
        }

        try {
            if (mensajeForm) {
                mensajeForm.textContent = esEdicion
                    ? "Actualizando producto..."
                    : "Guardando producto...";
            }

            const url = esEdicion
                ? `/api/productos/${encodeURIComponent(id)}`
                : "/api/productos";

            const metodo = esEdicion ? "PUT" : "POST";

            let cuerpo;

            if (archivo) {
                // Las imágenes se envían como archivo multipart/form-data.
                cuerpo = new FormData();

                cuerpo.append("nombre", datos.nombre);
                cuerpo.append("descripcion", datos.descripcion);
                cuerpo.append("categoria", datos.categoria);
                cuerpo.append("precio", String(datos.precio));
                cuerpo.append("stock", String(datos.stock));

                // Nuevo formato: varias ubicaciones.
                cuerpo.append(
                    "ubicaciones",
                    JSON.stringify(datos.ubicaciones)
                );

                // Campo antiguo para mantener compatibilidad temporal
                // con servidores que todavía esperan una sola ubicación.
                cuerpo.append("ubicacion", datos.ubicaciones[0]);

                if (datos.precioOferta !== null) {
                    cuerpo.append(
                        "precio_oferta",
                        String(datos.precioOferta)
                    );
                }

                cuerpo.append("imagen", archivo);
            } else {
                // Cuando no hay imagen nueva, se envía JSON.
                cuerpo = JSON.stringify({
                    nombre: datos.nombre,
                    descripcion: datos.descripcion,
                    categoria: datos.categoria,
                    precio: datos.precio,
                    stock: datos.stock,
                    ubicaciones: datos.ubicaciones,
                    // Compatibilidad temporal con el backend anterior.
                    ubicacion: datos.ubicaciones[0],
                    precio_oferta: datos.precioOferta
                });
            }

            await consultarAPI(url, {
                method: metodo,
                body: cuerpo
            });

            if (mensajeForm) {
                mensajeForm.textContent = esEdicion
                    ? "¡Producto actualizado!"
                    : "¡Producto guardado!";
            }

            await cargarInventario();

            // Permite leer el mensaje antes de cerrar el panel.
            window.setTimeout(() => {
                cerrarFormulario();
            }, 800);
        } catch (error) {
            console.error("Error guardando producto:", error);

            if (mensajeForm) {
                mensajeForm.textContent =
                    `No se pudo guardar el producto: ${error.message}`;
            }
        } finally {
            if (guardarBtn) {
                guardarBtn.disabled = false;
            }
        }
    });

    // =====================================================
    // EVENTOS DE LA INTERFAZ
    // =====================================================

    btnAbrirModal?.addEventListener("click", () => {
        const estaOculto =
            !formularioPanel ||
            formularioPanel.style.display === "none" ||
            formularioPanel.style.display === "";

        if (estaOculto) {
            cerrarFormulario();

            if (formularioPanel) {
                formularioPanel.style.display = "block";
            }

            nombreInput?.focus();
        } else {
            cerrarFormulario();
        }
    });

    btnCerrarForm?.addEventListener("click", cerrarFormulario);
    btnCancelarForm?.addEventListener("click", cerrarFormulario);

    buscador?.addEventListener("input", renderizarTabla);

    // =====================================================
    // INICIO
    // =====================================================

    actualizarVisibilidadPrecioOferta();
    cargarInventario();
});
