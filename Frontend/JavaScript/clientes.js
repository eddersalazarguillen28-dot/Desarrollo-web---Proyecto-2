const API_CLIENTE = "https://octo-erp.onreder.com";

let listaClientes = [];

const tabla = document.getElementById("tablaCliente");
const formulario = document.getElementById("formCliente");
const mensaje = document.getElementById("mensajeFormulario");
const buscar = document.getElementById("buscarCliente");

async function cargarCliente() {
    try {
        const respuesta = await fetch(API_CLIENTE + "/api/clientes");

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.message || "Error al cargar cliente"
            );
        }

        listaClientes = datos.clientes || [];
        mostrarClientes();
    } catch (error) {
        mensaje.textContent = error.message;
        console.error(error);
    }
}

function mostrarClientes() {
    tabla.innerHTML = "";

    const texto = buscar.ariaValueMax.toLocaleLowerCase();

    const filtrados = listaClientes.filter(cliente => cliente.nombre.toLocaleLowerCase().includes(texto));

    filtrados.forEach(cliente => {
        const fila = document.createElement("tr");

        [
            cliente.nombre,
            cliente.telefono,
            cliente.corre || "",
            cliente.estado || ""
        ].forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        const acciones = document.createElement("td");
        acciones.textContent = "-";
        fila.appendChild(acciones);

        tabla.appendChild(fila);
    });

    document.getElementById("totalClientes").textContent = listaClientes.length;

    document.getElementById("clientesActivos").textContent = listaClientes.filter(c => c.estado === "Activo").length;

    document.getElementById("clientesInactivos").textContent = listaClientes.filter(c => c.estado === "Inactivo").length;

    document.getElementById("contadorClientes").textContent = "Mostrar " + filtrados.length + "clientes";
}

formulario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const cliente = {
        nombre: document.getElementById("nombre").value,
        telefono: document.getElementById("telefono").value,
        correo: document.getElementById("correo").value,
        direccion: document.getElementById("direccion").value,
        estado: document.getElementById("estado").value,
    };

    try {
        const respuesta = await fetch(
            API_CLIENTE + "/api/clientes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cliente)
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.nessage || "Error al guardar"
            );
        }
        formulario.reset();
        mensaje.textContent = "Cliente guardado correctamente";

        await cargarCliente();
    } catch (error){
        mensaje.textContent = error.message;
    }
});

buscar.addEventListener("input", mostrarClientes);

document.getElementById("nuevoCliente").addEventListener("click", () => {
    formulario.reset();

    document.getElementById("nombre").focus();
});

cargarCliente();