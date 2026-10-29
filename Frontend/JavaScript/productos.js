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
    if (!campo) return;

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
    if (!campo || !contenedor) return;

    const termino = normalizarTexto(campo.value);

    if (termino === "") {
        productosFiltrados = [...inventarioProductos];
        renderizarProductos(productosFiltrados);
        return;
    }

    productosFiltrados = inventarioProductos.filter(producto => {
        const nombre = normalizarTexto(producto.nombre);
        const categoria = normalizarTexto(producto.categoria || "General");
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
    if (valor === null || valor === undefined) return alternativo;
    const texto = String(valor).trim();
    return texto || alternativo;
}

function formatearPrecio(precio) {
    const numero = Number(precio);
    return `₡${(Number.isFinite(numero) ? numero : 0).toLocaleString("es-CR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function obtenerPrimerValor(producto, campos) {
    for (const campo of campos) {
        const valor = producto[campo];
        if (valor !== null && valor !== undefined && valor !== "") {
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

function obtenerPrecioOriginal(producto) {
    const precio = obtenerPrimerValor(producto, [
        "precio", "precio_original", "precioOriginal", "precio_anterior", "precioAnterior"
    ]);
    return precio !== null && precio > 0 ? precio : null;
}

function obtenerPrecioDescuento(producto) {
    return obtenerPrimerValor(producto, [
        "precio_oferta", "precioOferta", "precio_descuento", "precioDescuento"
    ]);
}

function calcularPrecios(producto) {
    const precioNormal = obtenerPrecioOriginal(producto) ?? 0;
    const precioOferta = obtenerPrecioDescuento(producto);

    const descuentoValido =
        precioNormal > 0 &&
        precioOferta !== null &&
        precioOferta > 0 &&
        precioOferta < precioNormal;

    const precioActual = descuentoValido ? precioOferta : precioNormal;
    const porcentaje = descuentoValido
        ? Math.round(((precioNormal - precioOferta) / precioNormal) * 100)
        : 0;

    return {
        original: descuentoValido ? precioNormal : null,
        actual: precioActual,
        porcentaje,
        tieneDescuento: descuentoValido
    };
}

// ======================================================
// CARGAR PRODUCTOS DESDE RENDER
// ======================================================

async function cargarProductos() {
    const contenedor = document.getElementById("grid-productos");

    if (contenedor) {
        contenedor.innerHTML = `<p class="mensaje-cargando">Cargando productos...</p>`;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/productos`, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        let productos = Array.isArray(datos) ? datos : (datos.productos || []);

        inventarioProductos = productos;
        productosFiltrados = [...inventarioProductos];

        console.log("Productos recibidos desde Render:", inventarioProductos);

        buscarProductos();

    } catch (error) {
        console.error("Error al cargar productos:", error);
        if (contenedor) {
            contenedor.innerHTML = `
                <p class="mensaje-error" style="color: white; text-align: center; padding: 20px;">
                    No se pudieron cargar los productos. Revisa la consola (F12).
                </p>
            `;
        }
    }
}

// ======================================================
// IMÁGENES
// ======================================================

function obtenerImagenProducto(producto) {
    return obtenerTexto(
        producto.imagen_url || producto.imagen || producto.url_imagen || producto.image_url,
        IMAGEN_POR_DEFECTO
    );
}

// ======================================================
// RENDERIZAR CATÁLOGO
// ======================================================

function renderizarProductos(productos) {
    const contenedor = document.getElementById("grid-productos");
    if (!contenedor) return;

    actualizarContadores(productos.length);

    if (!productos.length) {
        contenedor.innerHTML = `<p class="mensaje-vacio" style="color: white;">No se encontraron productos.</p>`;
        return;
    }

    contenedor.innerHTML = productos.map(producto => {
        const id = producto.id;
        const nombre = obtenerTexto(producto.nombre, "Producto sin nombre");
        const categoria = obtenerTexto(producto.categoria, "General");
        const descripcion = obtenerTexto(producto.descripcion, "Consulta los detalles de este producto.");
        const imagen = obtenerImagenProducto(producto);
        const precios = calcularPrecios(producto);

        const etiquetaDescuento = precios.tieneDescuento
            ? `<span class="card-descuento">-${precios.porcentaje}%</span>`
            : "";

        const precioAnterior = precios.tieneDescuento
            ? `<span class="card-precio-anterior">${formatearPrecio(precios.original)}</span>`
            : "";

        return `
            <article class="card-producto" data-producto-id="${escaparHTML(id)}">
                <div class="card-imagen-contenedor">
                    ${etiquetaDescuento}
                    <img class="card-imagen" src="${escaparHTML(imagen)}" alt="${escaparHTML(nombre)}"
                        loading="lazy" onerror="this.onerror=null;this.src='${escaparHTML(IMAGEN_POR_DEFECTO)}';">
                </div>
                <div class="card-contenido">
                    <span class="card-categoria">${escaparHTML(categoria)}</span>
                    <h3 class="card-titulo">${escaparHTML(nombre)}</h3>
                    <p class="card-descripcion">${escaparHTML(descripcion)}</p>
                    <div class="card-precios">
                        ${precioAnterior}
                        <span class="card-precio">${formatearPrecio(precios.actual)}</span>
                    </div>
                    <button type="button" class="btn-ver-detalle" data-producto-id="${escaparHTML(id)}">
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
    const contadorSuperior = document.getElementById("contador-productos");
    const contadorInferior = document.getElementById("contador-productos-pie");

    if (contadorSuperior) contadorSuperior.textContent = cantidad;
    if (contadorInferior) contadorInferior.textContent = cantidad;
}

// ======================================================
// MODAL DE DETALLES
// ======================================================

function configurarModal() {
    const modal = document.getElementById("modal-producto");
    if (!modal) return;

    const botonesCerrar = modal.querySelectorAll(".cerrar-modal");
    botonesCerrar.forEach(boton => {
        boton.addEventListener("click", cerrarModalProducto);
    });

    modal.addEventListener("click", evento => {
        if (evento.target === modal) cerrarModalProducto();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") cerrarModalProducto();
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
            if (producto) abrirModalProducto(producto);
        });
    });
}

function abrirModalProducto(producto) {
    const modal = document.getElementById("modal-producto");
    if (!modal) return;

    const titulo = document.getElementById("modal-titulo");
    const categoria = document.getElementById("modal-categoria");
    const descripcion = document.getElementById("modal-desc");
    const precio = document.getElementById("modal-precio");
    const imagen = document.getElementById("modal-img");

    const precios = calcularPrecios(producto);

    if (titulo) titulo.textContent = obtenerTexto(producto.nombre, "Producto sin nombre");
    if (categoria) categoria.textContent = obtenerTexto(producto.categoria, "General");
    if (descripcion) descripcion.textContent = obtenerTexto(producto.descripcion, "Sin descripción.");

    if (precio) {
        if (precios.tieneDescuento) {
            precio.innerHTML = `
                <span class="modal-precio-anterior">${formatearPrecio(precios.original)}</span>
                <span class="modal-precio-oferta">${formatearPrecio(precios.actual)}</span>
            `;
        } else {
            precio.textContent = formatearPrecio(precios.actual);
        }
    }

    if (imagen) {
        imagen.src = obtenerImagenProducto(producto);
        imagen.alt = obtenerTexto(producto.nombre, "Imagen del producto");
        imagen.onerror = () => { imagen.src = IMAGEN_POR_DEFECTO; };
    }

    modal.classList.add("activo", "mostrar");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-abierto");
}

function cerrarModalProducto() {
    const modal = document.getElementById("modal-producto");
    if (!modal) return;

    modal.classList.remove("activo", "mostrar");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-abierto");
}

// ======================================================
// SEGURIDAD
// ======================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => {
        const entidades = {
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        };
        return entidades[caracter];
    });
}