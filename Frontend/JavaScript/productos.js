
"use strict";

const API_BASE = "https://octo-erp.onrender.com";
const IMAGEN_POR_DEFECTO = "../Imagenes/Logo.png";

let inventarioProductos = [];
let productosFiltrados = [];

// ======================================================
// INICIALIZACIÓN
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    configurarBuscador();
    configurarModal();
    cargarProductos();
});

// ======================================================
// BUSCADOR
// ======================================================

function configurarBuscador() {
    const campo = document.getElementById("buscador-productos");

    if (!campo) {
        console.warn("No se encontró el buscador de productos.");
        return;
    }

    campo.addEventListener("input", buscarProductos);

    campo.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            buscarProductos();
        }
    });
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function buscarProductos() {
    const campo = document.getElementById("buscador-productos");
    const contenedor = document.getElementById("grid-productos");

    if (!campo || !contenedor) {
        console.error(
            "No se encontró el buscador o el contenedor del catálogo."
        );
        return;
    }

    const termino = normalizarTexto(campo.value);

    productosFiltrados = inventarioProductos.filter(producto => {
        const nombre = normalizarTexto(producto.nombre);
        const categoria = normalizarTexto(
            producto.categoria || "General"
        );
        const descripcion = normalizarTexto(producto.descripcion);

        return (
            nombre.includes(termino) ||
            categoria.includes(termino) ||
            descripcion.includes(termino)
        );
    });

    renderizarProductos(productosFiltrados);
}

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function obtenerTexto(valor, alternativo = "") {
    if (valor === null || valor === undefined) {
        return alternativo;
    }

    const texto = String(valor).trim();

    return texto || alternativo;
}

function formatearPrecio(precio) {
    const numero = Number(precio);

    return `₡${(Number.isFinite(numero) ? numero : 0).toLocaleString(
        "es-CR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    )}`;
}

function obtenerPrimerValor(producto, campos) {
    for (const campo of campos) {
        const valor = producto[campo];

        if (
            valor !== null &&
            valor !== undefined &&
            valor !== ""
        ) {
            const numero = Number(valor);

            if (Number.isFinite(numero) && numero >= 0) {
                return numero;
            }
        }
    }

    return null;
}

// ======================================================
// PRECIOS Y DESCUENTOS
// ======================================================

// Obtiene el precio normal del producto.
// "precio" es el campo utilizado por el inventario.

function obtenerPrecioOriginal(producto) {
    const precio = obtenerPrimerValor(producto, [
        "precio",
        "precio_original",
        "precioOriginal",
        "precio_anterior",
        "precioAnterior",
        "precio_regular",
        "precioRegular"
    ]);

    return precio !== null && precio > 0 ? precio : null;
}

// Reconoce los nombres de campos utilizados para las ofertas.

function obtenerPrecioDescuento(producto) {
    return obtenerPrimerValor(producto, [
        "precio_oferta",
        "precioOferta",
        "precio_descuento",
        "precioDescuento",
        "precio_rebajado",
        "precioRebajado",
        "precio_final",
        "precioFinal"
    ]);
}

// Solo considera que existe una oferta cuando el precio
// de oferta es menor que el precio normal.

function tieneDescuento(producto) {
    const precioNormal = obtenerPrecioOriginal(producto);
    const precioOferta = obtenerPrecioDescuento(producto);

    return (
        precioNormal !== null &&
        precioOferta !== null &&
        precioOferta > 0 &&
        precioOferta < precioNormal
    );
}

// Calcula el precio final y el porcentaje de descuento.

function calcularPrecios(producto) {
    const precioNormal = obtenerPrecioOriginal(producto) ?? 0;
    const precioOferta = obtenerPrecioDescuento(producto);

    const descuentoValido =
        precioNormal > 0 &&
        precioOferta !== null &&
        precioOferta > 0 &&
        precioOferta < precioNormal;

    const precioActual = descuentoValido
        ? precioOferta
        : precioNormal;

    const porcentaje = descuentoValido
        ? Math.round(
            ((precioNormal - precioOferta) / precioNormal) * 100
        )
        : 0;

    return {
        original: descuentoValido ? precioNormal : null,
        actual: precioActual,
        porcentaje,
        tieneDescuento: descuentoValido
    };
}

// ======================================================
// UBICACIONES DE LOS PRODUCTOS
// ======================================================

function obtenerUbicacionesCatalogo(producto) {
    let ubicaciones = producto.ubicaciones;

    // El backend puede devolver las ubicaciones como JSON
    // o como una cadena de texto.

    if (typeof ubicaciones === "string") {
        try {
            const resultado = JSON.parse(ubicaciones);

            ubicaciones = Array.isArray(resultado)
                ? resultado
                : [resultado];
        } catch {
            ubicaciones = [ubicaciones];
        }
    }

    if (!Array.isArray(ubicaciones)) {
        ubicaciones = producto.ubicacion
            ? [producto.ubicacion]
            : ["productos"];
    }

    return ubicaciones
        .filter(Boolean)
        .map(ubicacion =>
            normalizarTexto(ubicacion).replace(/\s+/g, "_")
        );
}

function filtrarProductosPorUbicacion(ubicacion) {
    const ubicacionBuscada = normalizarTexto(ubicacion)
        .replace(/\s+/g, "_");

    return inventarioProductos.filter(producto => {
        const ubicaciones = obtenerUbicacionesCatalogo(producto);

        if (!ubicaciones.includes(ubicacionBuscada)) {
            return false;
        }

        // Las ubicaciones de ofertas solo muestran productos
        // que tienen una rebaja válida.

        const ubicacionesDeOferta = [
            "oferta_principal",
            "oferta_2",
            "oferta_3",
            "carrusel"
        ];

        if (ubicacionesDeOferta.includes(ubicacionBuscada)) {
            return tieneDescuento(producto);
        }

        return true;
    });
}

// ======================================================
// CARGAR PRODUCTOS DESDE RENDER
// ======================================================

async function cargarProductos() {
    const contenedor = document.getElementById("grid-productos");

    if (contenedor) {
        contenedor.innerHTML = `
            <p class="mensaje-cargando">
                Cargando productos...
            </p>
        `;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/productos`, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!respuesta.ok) {
            throw new Error(
                `Error HTTP ${respuesta.status} al consultar productos.`
            );
        }

        const datos = await respuesta.json();

        let productos = Array.isArray(datos)
            ? datos
            : Array.isArray(datos.productos)
                ? datos.productos
                : null;

        if (!productos) {
            throw new Error(
                "La API no devolvió una lista válida de productos."
            );
        }

        inventarioProductos = productos;
        productosFiltrados = [...inventarioProductos];

        console.log(
            "Productos recibidos desde Render:",
            inventarioProductos
        );

        buscarProductos();

    } catch (error) {
        console.error("Error al cargar productos:", error);

        if (contenedor) {
            contenedor.innerHTML = `
                <p class="mensaje-error">
                    No se pudieron cargar los productos.
                    Intenta nuevamente más tarde.
                </p>
                <button type="button" id="btn-reintentar-productos">
                    Reintentar
                </button>
            `;

            const boton = document.getElementById(
                "btn-reintentar-productos"
            );

            if (boton) {
                boton.addEventListener("click", cargarProductos);
            }
        }
    }
}

// ======================================================
// IMÁGENES
// ======================================================

function obtenerImagenProducto(producto) {
    return obtenerTexto(
        producto.imagen_url ||
        producto.imagen ||
        producto.url_imagen ||
        producto.image_url,
        IMAGEN_POR_DEFECTO
    );
}

// ======================================================
// RENDERIZAR CATÁLOGO
// ======================================================

function renderizarProductos(productos) {
    const contenedor = document.getElementById("grid-productos");

    if (!contenedor) {
        console.error(
            "No se encontró el elemento #grid-productos."
        );
        return;
    }

    actualizarContadores(productos.length);

    if (!productos.length) {
        contenedor.innerHTML = `
            <p class="mensaje-vacio">
                No se encontraron productos.
            </p>
        `;
        return;
    }

    contenedor.innerHTML = productos.map(producto => {
        const id = producto.id;
        const nombre = obtenerTexto(
            producto.nombre,
            "Producto sin nombre"
        );
        const categoria = obtenerTexto(
            producto.categoria,
            "General"
        );
        const descripcion = obtenerTexto(
            producto.descripcion,
            "Consulta los detalles de este producto."
        );

        const imagen = obtenerImagenProducto(producto);
        const precios = calcularPrecios(producto);

        const etiquetaDescuento = precios.tieneDescuento
            ? `
                <span class="card-descuento">
                    -${precios.porcentaje}%
                </span>
            `
            : "";

        const precioAnterior = precios.tieneDescuento
            ? `
                <span class="card-precio-anterior">
                    ${formatearPrecio(precios.original)}
                </span>
            `
            : "";

        const precioActual = `
            <span class="card-precio">
                ${formatearPrecio(precios.actual)}
            </span>
        `;

        return `
            <article class="card-producto"
                data-producto-id="${escaparHTML(id)}">

                <div class="card-imagen-contenedor">
                    ${etiquetaDescuento}

                    <img
                        class="card-imagen"
                        src="${escaparHTML(imagen)}"
                        alt="${escaparHTML(nombre)}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${escaparHTML(IMAGEN_POR_DEFECTO)}';"
                    >
                </div>

                <div class="card-contenido">
                    <span class="card-categoria">
                        ${escaparHTML(categoria)}
                    </span>

                    <h3 class="card-titulo">
                        ${escaparHTML(nombre)}
                    </h3>

                    <p class="card-descripcion">
                        ${escaparHTML(descripcion)}
                    </p>

                    <div class="card-precios">
                        ${precioAnterior}
                        ${precioActual}
                    </div>

                    <button
                        type="button"
                        class="btn-ver-detalle"
                        data-producto-id="${escaparHTML(id)}">
                        Ver detalles
                    </button>
                </div>
            </article>
        `;
    }).join("");

    configurarBotonesDetalle();
}

// ======================================================
// CONTADORES
// ======================================================

function actualizarContadores(cantidad) {
    const contadorSuperior = document.getElementById(
        "contador-productos"
    );

    const contadorInferior = document.getElementById(
        "contador-productos-pie"
    );

    if (contadorSuperior) {
        contadorSuperior.textContent = cantidad;
    }

    if (contadorInferior) {
        contadorInferior.textContent = cantidad;
    }
}

// ======================================================
// MODAL DE DETALLES
// ======================================================

function configurarModal() {
    const modal = document.getElementById("modal-producto");

    if (!modal) {
        console.warn("No se encontró #modal-producto.");
        return;
    }

    const botonesCerrar = modal.querySelectorAll(
        ".cerrar-modal, .btn-cerrar-modal, [data-cerrar-modal]"
    );

    botonesCerrar.forEach(boton => {
        boton.addEventListener("click", cerrarModalProducto);
    });

    modal.addEventListener("click", evento => {
        if (evento.target === modal) {
            cerrarModalProducto();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            cerrarModalProducto();
        }
    });
}

function configurarBotonesDetalle() {
    const botones = document.querySelectorAll(".btn-ver-detalle");

    botones.forEach(boton => {
        boton.addEventListener("click", () => {
            const id = boton.dataset.productoId;

            const producto = inventarioProductos.find(
                elemento => String(elemento.id) === String(id)
            );

            if (producto) {
                abrirModalProducto(producto);
            }
        });
    });
}

function abrirModalProducto(producto) {
    const modal = document.getElementById("modal-producto");

    if (!modal) {
        console.error("No se encontró el modal de productos.");
        return;
    }

    const titulo = document.getElementById("modal-titulo");
    const categoria = document.getElementById("modal-categoria");
    const descripcion = document.getElementById("modal-desc");
    const precio = document.getElementById("modal-precio");
    const imagen = document.getElementById("modal-img");

    const precios = calcularPrecios(producto);

    if (titulo) {
        titulo.textContent = obtenerTexto(
            producto.nombre,
            "Producto sin nombre"
        );
    }

    if (categoria) {
        categoria.textContent = obtenerTexto(
            producto.categoria,
            "General"
        );
    }

    if (descripcion) {
        descripcion.textContent = obtenerTexto(
            producto.descripcion,
            "Consulta los detalles de este producto."
        );
    }

    if (precio) {
        if (precios.tieneDescuento) {
            precio.innerHTML = `
                <span class="modal-precio-anterior">
                    ${formatearPrecio(precios.original)}
                </span>
                <span class="modal-precio-oferta">
                    ${formatearPrecio(precios.actual)}
                </span>
                <span class="modal-etiqueta-descuento">
                    Ahorras ${precios.porcentaje}%
                </span>
            `;
        } else {
            precio.textContent = formatearPrecio(precios.actual);
        }
    }

    if (imagen) {
        imagen.src = obtenerImagenProducto(producto);
        imagen.alt = obtenerTexto(
            producto.nombre,
            "Imagen del producto"
        );

        imagen.onerror = () => {
            imagen.onerror = null;
            imagen.src = IMAGEN_POR_DEFECTO;
        };
    }

    modal.classList.add("activo");
    modal.classList.add("mostrar");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-abierto");
}

function cerrarModalProducto() {
    const modal = document.getElementById("modal-producto");

    if (!modal) {
        return;
    }

    modal.classList.remove("activo");
    modal.classList.remove("mostrar");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-abierto");
}

// ======================================================
// SEGURIDAD: ESCAPAR TEXTO INSERTADO EN HTML
// ======================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => {
        const entidades = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entidades[caracter];
    });
}
