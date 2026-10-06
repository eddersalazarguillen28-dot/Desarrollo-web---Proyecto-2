const formulario = document.getElementById("inicioSesion");
const email = document.getElementById("email");
const contrasena = document.getElementById("contrasena");
const errorEmail = document.getElementById("errorEmail");
const contrasenaError = document.getElementById("errorContrasena");

//Patrón para validar correo

const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//Validar correo//

function validarEmail(){
    const valor = email.value;

    //Campo vacío
    if (valor===""){
        email.classList.add("input-error");
        errorEmail.textContent = "El correo electrónico es obligatorio";
        return false;
    }

    //Formato incorrecto
    if(!patronCorreo.test(valor)){
        email.classList.add("input-error");
        errorEmail.textContent = "Ingresa un correo electrónico válido";
        return false;
    }

    //Correcto
    email.classList.remove("input-error");
    errorEmail.textContent="";
    return true;

}

//Validar contraseña

function validarContrasena(){
    const valor = contrasena.value;

    //Campo vacío
    if (valor.trim()===""){
        contrasena.classList.add("input-error");
        contrasenaError.textContent="La contraseña es obligatoria";
        return false;
    }

    //Mínimo 8 carácteres

    if (valor.length < 8 ){
        contrasena.classList.add("input-error");
        contrasenaError.textContent="La contraseña debe de tener al menos 8 caracteres";
        return false;

    }

    //Correcto
    contrasena.classList.remove("input-error");
    contrasenaError.textContent="";
    return true;

}

//Valida mientras escribe

email.addEventListener("input", ()=>{
    validarEmail();
});

contrasena.addEventListener("input", () => {
    validarContrasena();
});

//Enviar formulario//

formulario.addEventListener("submit",
    function(evento){
        evento.preventDefault();
        const emailValid = validarEmail();
        const contrasenaValid=validarContrasena();

        //Si hay error//

        if (!emailValid || !contrasenaValid){
            return;
        }

        //Todo correcto

        console.log("Formulario válido");

        
    }
)


