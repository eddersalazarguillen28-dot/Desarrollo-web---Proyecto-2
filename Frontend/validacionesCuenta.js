const formulario = document.getElementById("formularioRegistro");
const nombre = document.getElementById("nombre");
const email = document.getElementById("email");
const contrasena = document.getElementById("contrasena");
const confirmarContrasena = document.getElementById("confirmarContrasena");

const errorNombre = document.getElementById("errorNombre");
const errorEmail = document.getElementById("errorEmail");
const errorContrasena = document.getElementById("errorContrasena");
const errorConfirmar = document.getElementById("errorConfirmar");
const mensajeExito = document.getElementById("mensajeExito");

//Funcion mostrar errores

function mostrarErrores(campo,elementoError,mensaje){
    elementoError.textContent = mensaje;
    campo.classList.toggle("invalido",mensaje !== "");
    campo.setAtribute("aria-invalid", mensaje !== "true" && mensaje !== ""? "true":"false");
}

//Validar nombre
function validarNombre(){
    const valor= nombre.value.trim();

    if(valor === ""){
        errorNombre.textContent="El nombre es obligatorio"
        nombre.classList.add("invalido");
        return false;
    }

    if(valor.length < 3){
        errorNombre.textContent="El nombre debe tener al menos 3 caracteres";
        nombre.classList.add("invalido");
        return false;
    }

    errorNombre.textContent = "";
    nombre.classList.remove("invalido");
    return true;
}

//Validar correo 

function validarCorreo(){
    const valor = email.value.trim();
    const expresionEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (valor === ""){
        errorEmail.textContent="El correo es obligatorio"
        email.classList.add("invalido");
        return false;
    }

    if (!expresionEmail.test(valor)){
        errorEmail.textContent="Ingresa un correo válido";
        email.classList.add("invalido");
        return false;
    }

    errorEmail.textContent="";
    email.classList.add.remove("invalido");
    return true;
}

//Validar contraseña
function validarContrasena(){
    const valor = contrasena.value;

    if (valor === ""){
        errorContrasena.textContent="La contraseña es obligatoria"
        contrasena.classList.add("invalido");
        return false;
    }

    if (valor.length < 8){
        errorContrasena.textContent="La contraseña es obligatoria"
        contrasena.classList.add("invalido");
        return false;
    }

    if (!/[A-Z]/.test(valor)){
        errorContrasena.textContent="Incluye al menos una letra mayúscula"
        contrasena.classList.add("invalido");
        return false;
    }

    if (!/[a-z]/.test(valor)){
        errorContrasena.textContent="Incluye al menos una letra minúscula"
        contrasena.classList.add("invalido");
        return false;
    }

    if (!/[0-9]/.test(valor)){
        errorContrasena.textContent="Incluye al menos un número"
        contrasena.classList.add("invalido");
        return false;
    }

    if (!/[^A-Za-z0-9]]/.test(valor)){
        errorContrasena.textContent="Incluye al menos un caracter especial"
        contrasena.classList.add("invalido");
        return false;
    }

    errorContrasena.textContent="";
    contrasena.classList.add.remove("invalido");
    return true;
}

//Valida confirmacion de contraseña

function validarConfirmacion(){
    if(confirmarContrasena.value===""){
        errorConfirmar.textContent="Confirma tu contraseña";
        confirmarContrasena.classList.add("invalido");
        return false;
    }

    if(confirmarContrasena.value!==contrasena.value){
        errorConfirmar.textContent="Las contraseñas no coinciden";
        confirmarContrasena.classList.add.remove("invalido");
        return false;
    }

    errorConfirmar.textContent="";
    confirmarContrasena.classList.add.remove("invalido");
    return true;
}


nombre.addEventListener("input",validarNombre);
email.addEventListener("input",validarCorreo);
contrasena.addEventListener("input",()=>{
    validarContrasena();

    if(confirmarContrasena.value !== ""){
        validarConfirmacion();
    }
});

confirmarContrasena.addEventListener("input",validarConfirmacion);


formulario.addEventListener("submit", function (evento){
    evento.preventDefault();

    mensajeExito.textContent="";

    const nombreValido = validarNombre();
    const emailValido= validarCorreo();
    const contrasenaValida = validarContrasena();
    const confirmacionValida = validarConfirmacion();

    if (nombreValido && emailValido && contrasenaValida && confirmacionValida){
        mensajeExito.textContent="Se registró la cuenta correctamente"
        mensajeExito.style.color ="green";
    }else{
        mensajeExito.textContent="Revisa los campos e intenta nuevamente"
        mensajeExito.style.color ="red";
    }

    
})

