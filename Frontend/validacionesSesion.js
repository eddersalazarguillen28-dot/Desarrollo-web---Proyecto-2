const formulario = document.getElementById("inicioSesion");
const email = document.getElementById("email");
const contrasena = document.getElementById("contrasena");
const errorEmail = document.getElementById("errorEmail");
const contrasenaError = document.getElementById("errorContrasena");

// URL del backend desplegado en Render
const API_URL = "https://octo-erp.onrender.com";

// Patrón para validar correo
const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validar correo
function validarEmail() {
    const valor = email.value.trim();

    if (valor === "") {
        email.classList.add("input-error");
        errorEmail.textContent = "El correo electrónico es obligatorio";
        return false;
    }

    if (!patronCorreo.test(valor)) {
        email.classList.add("input-error");
        errorEmail.textContent = "Ingresa un correo electrónico válido";
        return false;
    }

    email.classList.remove("input-error");
    errorEmail.textContent = "";
    return true;
}

// Validar contraseña (Ajustado para permitir contraseñas cortas de prueba como 123456)
function validarContrasena() {
    const valor = contrasena.value;

    if (valor.trim() === "") {
        contrasena.classList.add("input-error");
        contrasenaError.textContent = "La contraseña es obligatoria";
        return false;
    }

    if (valor.length < 4) {
        contrasena.classList.add("input-error");
        contrasenaError.textContent = "La contraseña debe tener al menos 4 caracteres";
        return false;
    }

    contrasena.classList.remove("input-error");
    contrasenaError.textContent = "";
    return true;
}

// Escuchar cambios en los inputs
email.addEventListener("input", validarEmail);
contrasena.addEventListener("input", validarContrasena);

// Enviar formulario (Unico evento Submit)
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    
    const emailValid = validarEmail();
    const contrasenaValid = validarContrasena();

    if (!emailValid || !contrasenaValid) {
        return;
    }

    contrasenaError.style.color = "blue";
    contrasenaError.textContent = "Iniciando sesión...";

    try {
        const respuesta = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: email.value.trim(),
                password: contrasena.value
            })
        });

        const datos = await respuesta.json();

        if (datos.status === "ok") {
            contrasenaError.style.color = "green";
            contrasenaError.textContent = "¡Inicio de sesión exitoso!";

            // Guardar credenciales en el navegador
            localStorage.setItem("usuario", JSON.stringify(datos.usuario));

            // Redirigir al Dashboard tras 1 segundo
            setTimeout(() => {
                window.location.href = "dashboard/dashboard.html";
            }, 1000);
        } else {
            contrasenaError.style.color = "red";
            contrasenaError.textContent = datos.message || "Credenciales incorrectas";
        }
    } catch (error) {
        console.error("Error al conectar con Render:", error);
        contrasenaError.style.color = "red";
        contrasenaError.textContent = "Error al conectar con el servidor";
    }
});

