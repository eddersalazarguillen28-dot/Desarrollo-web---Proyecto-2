"use strict";

const API_CLIENTE = "https://octo-erp.onrender.com";
let listaClientes = [];

document.addEventListener("DOMContentLoaded", () => {
    const tabla = document.getElementById("tablaClientes") || document.getElementById("tablaCliente");
    const formulario = document.getElementById("formCliente");
    const mensaje = document.getElementById("mensajeFormulario");
    const buscar = document.getElementById("buscarCliente");
    const formularioPanel = document.getElementById("formularioPanel");
    const btnCerrarForm = document.getElementById("btnCerrarForm");
    const cancelarBtn = document.getElementById("cancelarBtn");
    const botonNuevo = document.getElementById("nuevoClienteBtn") || document.getElementById("nuevoCliente");
    
    const clienteIdInput = document.getElementById("clienteId");
    const tituloForm = document.getElementById("tituloForm");
    const guardarBtn = document.getElementById("guardarBtn");

    // Ocultar formulario al iniciar
    if (formularioPanel) {
        formularioPanel.style.display = "none";
    }

    const cerrarFormulario = () => {
        if (formularioPanel) formularioPanel.style.display = "none";
        if (formulario) formulario.reset();
        if (clienteIdInput) clienteIdInput.value = "";
        if (tituloForm) tituloForm.textContent = "Nuevo cliente";
        if (guardarBtn) guardarBtn.textContent = "Guardar cliente";
        if (cancelarBtn) cancelarBtn.hidden = true;
        if (mensaje) mensaje.textContent = "";
    };

    // ========================================
    // VENTANA MODAL PERSONALIZADA DE CONFIRMACIÓN
    // ========================================
    function mostrarModalConfirmacion(texto) {
        return new Promise((resolve) => {
            const modal = document.getElementById("modalConfirmar");
            const textoElem = document.getElementById("textoModalConfirm");
            const btnAceptar = document.getElementById("btnAceptarConfirm");
            const btnCancelar = document.getElementById("btnCancelarConfirm");
            const btnCerrar = document.getElementById("btnCerrarModalConfirm");

            if (!modal) {
                // Fallback por si no existe el HTML del modal
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

    // ========================================
    // CARGAR CLIENTES DESDE EL BACKEND
    // ========================================
    async function cargarCliente() {
        try {
            const respuesta = await fetch(`${API_CLIENTE}/api/clientes`);
            
            if (!respuesta.ok) {
                const datosErr = await respuesta.json().catch(() => ({}));
                throw new Error(datosErr.message || datosErr.error || `Error ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            listaClientes = Array.isArray(datos) 
                ? datos 
                : (Array.isArray(datos.clientes) ? datos.clientes : []);
                
            mostrarClientes();

        } catch (error) {
            console.error("Error al cargar clientes:", error);

            let msg = error.message;
            if (error.name === "TypeError" && msg.includes("fetch")) {
                msg = "El servidor en Render se está conectando o no hay red. Intenta en unos segundos.";
            }

            if (mensaje) {
                mensaje.textContent = msg;
            }
        }
    }

    // ========================================
    // MOSTRAR CLIENTES EN TABLA
    // ========================================
    function mostrarClientes() {
        if (!tabla) return;

        tabla.replaceChildren();

        const texto = (buscar?.value || "").trim().toLocaleLowerCase("es-CR");

        const filtrados = listaClientes.filter(cliente =>
            (cliente.nombre || "").toLocaleLowerCase("es-CR").includes(texto) ||
            (cliente.correo || "").toLocaleLowerCase("es-CR").includes(texto) ||
            (cliente.telefono || "").toLocaleLowerCase("es-CR").includes(texto)
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

                const tdNombre = document.createElement("td");
                tdNombre.textContent = cliente.nombre || "";
                fila.appendChild(tdNombre);

                const tdTel = document.createElement("td");
                tdTel.textContent = cliente.telefono || "-";
                fila.appendChild(tdTel);

                const tdCorreo = document.createElement("td");
                tdCorreo.textContent = cliente.correo || "-";
                fila.appendChild(tdCorreo);

                const tdEstado = document.createElement("td");
                const spanEstado = document.createElement("span");
                const est = (cliente.estado || "Activo").toLowerCase();
                spanEstado.className = `status ${est}`;
                spanEstado.textContent = cliente.estado || "Activo";
                tdEstado.appendChild(spanEstado);
                fila.appendChild(tdEstado);

                const tdAcciones = document.createElement("td");
                const contAcciones = document.createElement("div");
                contAcciones.className = "actions";
                contAcciones.style.display = "flex";
                contAcciones.style.gap = "6px";

                const btnEditar = document.createElement("button");
                btnEditar.className = "actions-button edit-button";
                btnEditar.innerHTML = "/";
                btnEditar.title = "Editar cliente";
                btnEditar.onclick = () => prepararEdicion(cliente);

                const btnEliminar = document.createElement("button");
                btnEliminar.className = "actions-button delete-button";
                btnEliminar.innerHTML = "X";
                btnEliminar.title = "Eliminar cliente";
                btnEliminar.onclick = () => eliminarCliente(cliente.id, cliente.nombre);

                contAcciones.appendChild(btnEditar);
                contAcciones.appendChild(btnEliminar);
                tdAcciones.appendChild(contAcciones);
                fila.appendChild(tdAcciones);

                tabla.appendChild(fila);
            });
        }

        const total = document.getElementById("totalClientes");
        const activos = document.getElementById("clientesActivos");
        const inactivos = document.getElementById("clientesInactivos");
        const contador = document.getElementById("contadorClientes");
        const totalVentas = document.getElementById("totalVentas");

        if (totalVentas) {
            totalVentas.textContent = listaClientes.reduce((suma, cliente) => suma + Number(cliente.ventas_registradas || 0), 0);        
        }

        if (total) total.textContent = listaClientes.length;
        if (activos) {
            activos.textContent = listaClientes.filter(c => (c.estado || "Activo").toLowerCase() === "activo").length;
        }
        if (inactivos) {
            inactivos.textContent = listaClientes.filter(c => (c.estado || "").toLowerCase() === "inactivo").length;
        }
        if (contador) contador.textContent = `Mostrando ${filtrados.length} clientes`;
    }

    function prepararEdicion(cliente) {
        if (!formularioPanel) return;

        if (clienteIdInput) clienteIdInput.value = cliente.id;
        document.getElementById("nombre").value = cliente.nombre || "";
        document.getElementById("telefono").value = cliente.telefono || "";
        document.getElementById("correo").value = cliente.correo || "";
        document.getElementById("direccion").value = cliente.direccion || "";
        document.getElementById("estado").value = cliente.estado || "Activo";

        if (tituloForm) tituloForm.textContent = "Editar cliente";
        if (guardarBtn) guardarBtn.textContent = "Actualizar cliente";
        if (cancelarBtn) cancelarBtn.hidden = false;
        if (mensaje) mensaje.textContent = "";

        formularioPanel.style.display = "block";
        document.getElementById("nombre").focus();
    }

    // ========================================
    // ELIMINAR CLIENTE USANDO VENTANA CUSTOM
    // ========================================
    async function eliminarCliente(id, nombre) {
        if (!id) return;

        // Usa la ventana modal personalizada
        const confirmado = await mostrarModalConfirmacion(`¿Estás seguro de que deseas eliminar al cliente "${nombre}"?`);
        
        if (!confirmado) return;

        try {
            const respuesta = await fetch(`${API_CLIENTE}/api/clientes/${id}`, {
                method: "DELETE"
            });

            if (!respuesta.ok) {
                const datosErr = await respuesta.json().catch(() => ({}));
                throw new Error(datosErr.message || datosErr.error || "No se pudo eliminar");
            }

            await cargarCliente();
            
            if (clienteIdInput && clienteIdInput.value == id) {
                cerrarFormulario();
            }

        } catch (error) {
            console.error("Error al eliminar cliente:", error);
            let msg = error.message;
            if (error.name === "TypeError" && msg.includes("fetch")) {
                msg = "No hay conexión con el servidor. Verifica Render o tu conexión.";
            }
            alert(`Error: ${msg}`);
        }
    }

    // ========================================
    // GUARDAR O ACTUALIZAR CLIENTE
    // ========================================
    if (formulario) {
        formulario.addEventListener("submit", async function(evento) {
            evento.preventDefault();

            const id = clienteIdInput?.value;
            const esEdicion = Boolean(id);

            const clienteData = {
                nombre: document.getElementById("nombre")?.value.trim() || "",
                telefono: document.getElementById("telefono")?.value.trim() || "",
                correo: document.getElementById("correo")?.value.trim() || "",
                direccion: document.getElementById("direccion")?.value.trim() || "",
                estado: document.getElementById("estado")?.value || "Activo"
            };

            if (!clienteData.nombre) {
                if (mensaje) mensaje.textContent = "El nombre del cliente es obligatorio";
                document.getElementById("nombre")?.focus();
                return;
            }

            try {
                if (mensaje) {
                    mensaje.textContent = esEdicion ? "Actualizando cliente..." : "Guardando cliente...";
                }

                const url = esEdicion ? `${API_CLIENTE}/api/clientes/${id}` : `${API_CLIENTE}/api/clientes`;
                const metodo = esEdicion ? "PUT" : "POST";

                const respuesta = await fetch(url, {
                    method: metodo,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(clienteData)
                });

                if (!respuesta.ok) {
                    const datosErr = await respuesta.json().catch(() => ({}));
                    throw new Error(datosErr.message || datosErr.error || "Error en el servidor");
                }

                if (mensaje) {
                    mensaje.textContent = esEdicion ? "Cliente actualizado correctamente" : "Cliente guardado correctamente";
                }

                await cargarCliente();

                setTimeout(() => {
                    cerrarFormulario();
                }, 800);

            } catch (error) {
                console.error("Error al guardar cliente:", error);
                let msg = error.message;
                if (error.name === "TypeError" && msg.includes("fetch")) {
                    msg = "No se pudo contactar al servidor. Revisa tu conexión o el estado de Render.";
                }
                if (mensaje) mensaje.textContent = msg;
            }
        });
    }

    if (buscar) {
        buscar.addEventListener("input", mostrarClientes);
    }

    if (botonNuevo) {
        botonNuevo.addEventListener("click", () => {
            const estaOculto = formularioPanel.style.display === "none" || formularioPanel.style.display === "";
            
            if (estaOculto) {
                cerrarFormulario();
                formularioPanel.style.display = "block";
                document.getElementById("nombre").focus();
            } else {
                cerrarFormulario();
            }
        });
    }

    if (btnCerrarForm) btnCerrarForm.addEventListener("click", cerrarFormulario);
    if (cancelarBtn) cancelarBtn.addEventListener("click", cerrarFormulario);

    cargarCliente();
});