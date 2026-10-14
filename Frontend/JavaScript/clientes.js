"use strict";

// API de OCTO ERP desplegada en Render
const API_CLIENTE = "https://octo-erp.onrender.com";

let listaClientes = [];

const tabla = document.getElementById("tablaClientes") || document.getElementById("tablaCliente");
const formulario = document.getElementById("formCliente");
const mensaje = document.getElementById("mensajeFormulario");
const buscar = document.getElementById("buscarCliente");
const formularioPanel = document.getElementById("formularioPanel");
const btnCerrarForm = document.getElementById("btnCerrarForm");
const cancelarBtn = document.getElementById("cancelarBtn");
const botonNuevo = document.getElementById("nuevoClienteBtn") || document.getElementById("nuevoCliente");

// Ocultar formulario al iniciar
if (formularioPanel) {
    formularioPanel.style.display = "none";
}

const cerrarFormulario = () => {
    if (formularioPanel) formularioPanel.style.display = "none";
    if (formulario) formulario.reset();
    if (mensaje) mensaje.textContent = "";
};

// ========================================
// CARGAR CLIENTES DESDE EL BACKEND
// ========================================
async function cargarCliente() {
    try {
        const respuesta = await fetch(`${API_CLIENTE}/api/clientes`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.message || datos.error || "Error al cargar clientes"
            );
        }

        listaClientes = Array.isArray(datos) 
            ? datos 
            : (Array.isArray(datos.clientes) ? datos.clientes : []);
            
        mostrarClientes();

    } catch (error) {
        console.error("Error al cargar clientes:", error);

        if (mensaje) {
            mensaje.textContent = error.message;
        }
    }
}

// ========================================
// MOSTRAR Y FILTRAR CLIENTES
// ========================================
function mostrarClientes() {
    if (!tabla) return;

    tabla.replaceChildren();

    const texto = (buscar?.value || "")
        .trim()
        .toLocaleLowerCase("es-CR");

    const filtrados = listaClientes.filter(cliente =>
        (cliente.nombre || "")
            .toLocaleLowerCase("es-CR")
            .includes(texto)
    );

    if (filtrados.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 5;
        celda.className = "empty-row";
        celda.textContent = "No hay clientes registrados.";
        fila.appendChild(celda);
        tabla.appendChild(fila);
    } else {
        filtrados.forEach(cliente => {
            const fila = document.createElement("tr");

            const valores = [
                cliente.nombre || "",
                cliente.telefono || "",
                cliente.correo || "",
                cliente.estado || "Activo"
            ];

            valores.forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            const acciones = document.createElement("td");
            acciones.textContent = "-";
            fila.appendChild(acciones);

            tabla.appendChild(fila);
        });
    }

    // Actualizar contadores
    const total = document.getElementById("totalClientes");
    const activos = document.getElementById("clientesActivos");
    const inactivos = document.getElementById("clientesInactivos");
    const contador = document.getElementById("contadorClientes");

    if (total) {
        total.textContent = listaClientes.length;
    }

    if (activos) {
        activos.textContent = listaClientes.filter(
            cliente => (cliente.estado || "Activo") === "Activo"
        ).length;
    }

    if (inactivos) {
        inactivos.textContent = listaClientes.filter(
            cliente => cliente.estado === "Inactivo"
        ).length;
    }

    if (contador) {
        contador.textContent = `Mostrando ${filtrados.length} clientes`;
    }
}

// REGISTRAR CLIENTE EN POSTGRESQL

if (formulario) {
    formulario.addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const campoNombre = document.getElementById("nombre");
        const campoTelefono = document.getElementById("telefono");
        const campoCorreo = document.getElementById("correo");
        const campoDireccion = document.getElementById("direccion");
        const campoEstado = document.getElementById("estado");

        const cliente = {
            nombre: campoNombre?.value.trim() || "",
            telefono: campoTelefono?.value.trim() || "",
            correo: campoCorreo?.value.trim() || "",
            direccion: campoDireccion?.value.trim() || "",
            estado: campoEstado?.value || "Activo"
        };

        if (!cliente.nombre) {
            if (mensaje) {
                mensaje.textContent = "El nombre del cliente es obligatorio";
            }
            campoNombre?.focus();
            return;
        }

        try {
            if (mensaje) {
                mensaje.textContent = "Guardando cliente...";
            }

            const respuesta = await fetch(`${API_CLIENTE}/api/clientes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cliente)
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.message ||
                    datos.error ||
                    "No se pudo guardar el cliente"
                );
            }

            formulario.reset();
            await cargarCliente();

            if (mensaje) {
                mensaje.textContent = "Cliente guardado correctamente";
            }

            setTimeout(() => {
                cerrarFormulario();
            }, 800);

        } catch (error) {
            console.error("Error al guardar cliente:", error);

            if (mensaje) {
                mensaje.textContent = error.message;
            }
        }
    });
}


// BUSCADOR Y BOTONES DE CONTROL

if (buscar) {
    buscar.addEventListener("input", mostrarClientes);
}

if (botonNuevo && formulario) {
    botonNuevo.addEventListener("click", () => {
        const estaOculto = formularioPanel.style.display === "none" || formularioPanel.style.display === "";
        
        formularioPanel.style.display = estaOculto ? "block" : "none";

        if (estaOculto) {
            formulario.reset();
            const campoNombre = document.getElementById("nombre");
            if (campoNombre) campoNombre.focus();
            if (mensaje) mensaje.textContent = "";
        }
    });
}

if (btnCerrarForm) btnCerrarForm.addEventListener("click", cerrarFormulario);
if (cancelarBtn) cancelarBtn.addEventListener("click", cerrarFormulario);

// CARGA INICIAL

cargarCliente();