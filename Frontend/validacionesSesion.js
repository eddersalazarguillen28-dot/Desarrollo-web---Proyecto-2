const formulario = document.getElementById("inicioSesion");
const email = document.getElementById("email");
const contrasena = document.getElementById("contrasena");
const errorEmail = document.getElementById("errorEmail");
const contrasenaError = document.getElementById("errorContrasena");

// URL de tu backend desplegado en Render
const API_URL = "https://octo-erp.onrender.com"; // Reemplaza con tu URL de Render

// Patrón para validar correo
const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validar correo
function validarEmail() {
    const valor = email.value.trim();

    // Campo vacío
    if (valor === "") {
        email.classList.add("input-error");
        errorEmail.textContent = "El correo electrónico es obligatorio";
        return false;
    }

    // Formato incorrecto
    if (!patronCorreo.test(valor)) {
        email.classList.add("input-error");
        errorEmail.textContent = "Ingresa un correo electrónico válido";
        return false;
    }

    // Correcto
    email.classList.remove("input-error");
    errorEmail.textContent = "";
    return true;
}

// Validar contraseña
function validarContrasena() {
    const valor = contrasena.value;

    // Campo vacío
    if (valor.trim() === "") {
        contrasena.classList.add("input-error");
        contrasenaError.textContent = "La contraseña es obligatoria";
        return false;
    }

    // Mínimo 8 caracteres
    if (valor.length < 8) {
        contrasena.classList.add("input-error");
        contrasenaError.textContent = "La contraseña debe tener al menos 8 caracteres";
        return false;
    }

    // Correcto
    contrasena.classList.remove("input-error");
    contrasenaError.textContent = "";
    return true;
}

// Valida mientras escribe
email.addEventListener("input", () => {
    validarEmail();
});

contrasena.addEventListener("input", () => {
    validarContrasena();
});

// Enviar formulario
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    
    const emailValid = validarEmail();
    const contrasenaValid = validarContrasena();

    // Si hay un error de validación local
    if (!emailValid || !contrasenaValid) {
        return;
    }

    contrasenaError.textContent = "Iniciando sesión...";
    contrasenaError.style.color = "blue";

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
            contrasenaError.textContent = "¡Inicio de sesión exitoso!";
            contrasenaError.style.color = "green";

            // Guardar usuario en localStorage si se requiere
            localStorage.setItem("usuario", JSON.stringify(datos.usuario));

            // Redirigir al inicio o dashboard tras iniciar sesión
            setTimeout(() => {
                window.location.href = "inicio.html"; // Cambia esta ruta a la página deseada
            }, 1000);
        } else {
            contrasenaError.textContent = datos.message || "Credenciales incorrectas";
            contrasenaError.style.color = "red";
        }
    } catch (error) {
        contrasenaError.textContent = "Error al conectar con el servidor";
        contrasenaError.style.color = "red";
    }
});


// Si API_URL ya está definida arriba en este archivo, NO vuelvas a escribir "const API_URL = ..."

document.getElementById("formularioLogin").addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita la recarga de la página

    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;

    try {
        const respuesta = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, password })
        });

        const datos = await respuesta.json();

        if (datos.status === "ok") {
            localStorage.setItem("usuario", JSON.stringify(datos.usuario));
            alert("¡Inicio de sesión exitoso!");
            window.location.href = "dashboard/dashboard.html"; // Cambia esta ruta según la ubicación de tu HTML
        } else {
            alert("Error: " + datos.message);
        }
    } catch (error) {
        console.error("Error al conectar:", error);
        alert("No se pudo conectar con el servidor en Render.");
    }
});