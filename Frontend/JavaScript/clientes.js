
/**Clientes/ */
let clientes = [];
let siguienteId = 1;

const tabla = document.getElementById("tablaClientes");
const buscar = document.getElementById("buscarCliente");
const formulario = document.getElementById("formCliente");
const panelFormulario = document.getElementById("formularioPanel");

const campos={
    id:document.getElementById("clienteId"),
    nombre:document.getElementById("nombre"),
    telefono:document.getElementById("telefono"),
    correo:document.getElementById("correo"),
    direccion:document.getElementById("direccion"),
    estado:document.getElementById("estado")

};

/*Fecha */

document.getElementById("fecha").textContent=
    ahora.toLocaleDateString("es-CR",{
    day:"numeric",
    month:"long",
    year:"numeric"
});

document.getElementById("diaSemana").textContent =
    ahora.toLocaleDateString("es-CR",{
        weekday:"long"
});

/*Protege el texto que se inserta en la tabla */ 
function escaparHTML(valor){
    return String(valor??"").replace(/[&<>"']/g,caracter=> ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
    })[caracter]);
}

/*Obtener iniciales del nombre*/

function iniciales(nombre){
    return nombre
    .trim()
    .split(/\s+/)
    .slice(0,2)
    .map(palabra => palabra[0] || "")
    .join("")
    .toUpperCase();

}

/*Mostrar y buscar clientes */

function renderizarClientes(){
    const texto = buscar.value.trim().toLowerCase();

    const filtrados = clientes.filter(cliente => [
        cliente.nombre,
        cliente.telefono,
        cliente.correo,
        cliente.direccion,
        cliente.estado
    ].some(valor=>
        String(valor?? "").toLowerCase().includes(texto)
    )
);

    tabla.innerHTML = "";

    if(filtrados.length === 0){
        tabla.innerHTML =   `
        <tr>
            <td colspan="5" class="empty-row">
                ${
                    clientes.length === 0
                        ? "Todavía no hay clientes registrados"
                        : "No se encontraron clientes"
                }
            </td>
        </tr> 
        `;

    }else{
        filtrados.forEach(cliente => {
            const fila = document.createElement("tr");

            fila.innerHTML= `
            <td>
                <div class="nombre-cliente>
                    <div class = "avatar-cliente">
                        ${escaparHTML(iniciales(cliente.nombre))}

                    </div>

                    <span>${escaparHTML(cliente.nombre)}</span>
                </div>
            </td>

            <td>${escaparHTML(cliente.telefono)}</td>
            <td>${escaparHTML(cliente.correo || "—")}</td>

            <td>
                <span class="status ${
                    cliente.estado === "Activo" ? "activo" : "inactivo"}">${escaparHTML(cliente.estado)}</span>
            </td>

            <td>
                <div class="actions>
                    <button
                     type:"button"
                     class="actions-button edit-button" 
                     data-accion="editar" 
                     data-id="${cliente.id}" 
                     title-"Editar cliente">
                     aria-label-"Editar cliente">
                    </button>

                    <button
                     type:"button"
                     class="actions-button delete-button" 
                     data-accion="eliminar" 
                     data-id="${cliente.id}" 
                     title-"Eliminar cliente">
                     aria-label-"Eliminar cliente">
                     
                    </button>


                </div>
            </td>`;
            tabla.appendChild(fila);
        });
    }

    /*Actualizar estadísticas */

    document.getElementById("totalClientes").textContent = clientes.length;
    document.getElementById("clientesActivos").textContent = clientes.filter(c=> c.estado === "Activo").length;
    document.getElementById("clientesInactivos").textContent = clientes.filter(c=> c.estado === "Inactivo").length;
    document.getElementById("contadorClientes").textContent = `Mostrando ${filtrados.length} de ${clientes.length}clientes`;



}

function limpiarFormulario(){
    formulario.reset();
    campos.id.value = "";

    document.getElementById("tituloFormulario").textContent = "Nuevo Cliente";
    document.getElementById("guardarBtn").textContent = "Guardar Cliente";
    document.getElementById("cancelarBtn").hidden = true;
    document.getElementById("mensajeFormulario").textContent = "";

}

function editarCliente(id){
    const cliente = cliente.find(c => c.id === id);
    if (!cliente) return;

    campos.id.value = cliente.id;
    campos.nombre.value = cliente.nombre;
    campos.telefono.value = cliente.correo;
    campos.direccion.value = cliente.direccion;
    campos.estado.value = cliente.estado;

    document.getElementById("tituloFormulario").textContent = "Editar cliente";
    document.getElementById("guardarBtn").textContent = "Guardar cambios";

    document.getElementById("cancelarBtn").hidden = false;
    document.getElementById("mensajeFormulario").textContent = "";

    panelFormulario.scrollIntoView({
        behavior:"smooth",
        block: "start"
    });
    
    campos.nombre.focus();

}

tabla.addEventListener("click", event => {
    const boton = event.target.closest("button[data-accion]");
    if(!boton) return;
    const id = Number(boton.dataset.id);

    if(boton.dataset.accion === "editar"){
        editarCliente(id);

    }

    if(boton.dataset.accion === "eliminar"){
        const cliente = clientes.find(c => c.id === id);
        if (!cliente) return;
        const confirmar = confirm(
            `¿Deseas eliminar al cliente ${cliente.nombre}?`
        );

        if(confirmar){
            clientes = clientes.filter(c => c.id !== id);
            renderizarClientes();
            limpiarFormulario();
        }
    }
});

buscar.addEventListener("input",renderizarClientes);
document.getElementById("nuevoClienteBtn").addEventListener("click",()=>{
    limpiarFormulario();
    panelFormulario,scrollIntoView({
        behavior:"smooth",
        block:"start"
    });
    campos.nombre.focus();
});

document.getElementById("cancelarBtn").addEventListener("click", () => {
    limpiarFormulario();

});

formulario.addEventListener("submit", event => {
    event.preventDefault();
    const id = campos.id.value ? Number(campos.id.value):null;

    const datos = {
        nombre: campos.nombre.value.trim(),
        telefono: campos.telefono.value.trim(),
        correo: campos.correo.value.trim(),
        direccion: campos.direccion.value.trim(),
        estado: campos.estado.value

    };

    if (!datos.nombre || !datos.telefono){
        document.getElementById("mensajeFormulario").textContent="Completa el nombre y el teléfono";
        return;
    }

    if (id !== null){
        const indice =clientes.findIndex(c => c.id === id);
        if(indice !== -1){
            clientes[indice]={
                ...clientes[indice],
                ...datos
            };
        }
    }else{
        clientes.push({
            id: siguienteId++,
            ...datos
        });
    }

    renderizarClientes();
    limpiarFormulario();

    document.getElementById("mensajeFormulario").textContent =
        id!== null
            ? "Cliente actualizado correctamente" : "Cliente registrado correctamente";
});

renderizarClientes();

