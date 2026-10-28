document.addEventListener("DOMContentLoaded", () => {
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

    // Validar contraseña
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
    if (email) email.addEventListener("input", validarEmail);
    if (contrasena) contrasena.addEventListener("input", validarContrasena);

    // Enviar formulario
    if (formulario) {
        formulario.addEventListener("submit", async function (evento) {
            evento.preventDefault();
            
            const emailValid = validarEmail();
            const contrasenaValid = validarContrasena();

            if (!emailValid || !contrasenaValid) {
                return;
            }

            // 1. LIMPIAR SESIÓN ANTERIOR (Para evitar conflictos de caché)
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

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

                    // 2. GUARDAR LOS DATOS NUEVOS
                    localStorage.setItem("token", datos.token);
                    localStorage.setItem("usuario", JSON.stringify(datos.usuario));

                    // 3. FORZAR LA REDIRECCIÓN SEGÚN EL ROL
                    setTimeout(() => {
                        const rol = (datos.usuario.rol || datos.usuario.rango || "").toLowerCase();
                        
                        console.log("Rol detectado por el sistema:", rol); // Para depurar en consola

                        if (rol === "administrador" || rol === "admin" || rol === "vendedor") {
                            // Admin y Vendedor van al panel administrativo
                            window.location.replace("inicio.html"); 
                        } else {
                            // Clientes van a la tienda
                            window.location.replace("inicioClientes.html");
                        }
                    }, 800); // 0.8 segundos para que se vea el mensaje verde

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
    }
});

// =========================================================
// MOSTRAR / OCULTAR CONTRASEÑA
// =========================================================
const campoContrasena = document.getElementById("contrasena");
const botonMostrarConstrasena = document.getElementById("mostrarContrasena");

if (campoContrasena && botonMostrarConstrasena) {
    botonMostrarConstrasena.addEventListener("click", () => {
        const mostrar = campoContrasena.type === "password";
        campoContrasena.type = mostrar ? "text" : "password";
        
        botonMostrarConstrasena.textContent = mostrar ? "°" : "|"; 

        botonMostrarConstrasena.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
        botonMostrarConstrasena.setAttribute("aria-pressed", String(mostrar));
    });
}