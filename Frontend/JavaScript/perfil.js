"use strict";

// ============================================
// CONFIGURACIÓN DE OCTO ERP
// ============================================

const API_BASE = "https://octo-erp.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    inicializarPerfil();
});


// ============================================
// INICIALIZAR PERFIL
// ============================================

function inicializarPerfil() {
    const formulario = document.getElementById("form-perfil");
    const inputFoto = document.getElementById("foto-perfil-input");
    const botonCancelar = document.getElementById("btn-cancelar");

    cargarPerfil();

    if (inputFoto) {
        inputFoto.addEventListener("change", manejarFoto);
    }

    if (formulario) {
        formulario.addEventListener("submit", guardarPerfil);
    }

    if (botonCancelar && formulario) {
        botonCancelar.addEventListener("click", () => {
            setTimeout(() => {
                cargarPerfil();
                limpiarFotoSeleccionada();
                limpiarMensaje();
            }, 0);
        });
    }
}


// ============================================
// CARGAR INFORMACIÓN DEL USUARIO
// ============================================

async function cargarPerfil() {
    const nombreInput = document.getElementById("nombre");
    const correoInput = document.getElementById("correo");

    // Obtenemos el token guardado en el navegador durante el inicio de sesión
    const token = localStorage.getItem("token");

    if (!token) {
        mostrarMensaje("No has iniciado sesión. Redirigiendo...", "error");
        setTimeout(() => {
            window.location.href = "inicioSesion.html";
        }, 1500);
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/usuarios/perfil`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!respuesta.ok) {
            throw new Error(
                respuesta.status === 404
                    ? "La ruta del perfil no está disponible en el servidor."
                    : `No se pudo cargar el perfil (HTTP ${respuesta.status}).`
            );
        }

        const datos = await respuesta.json();
        const usuario = datos.usuario || datos;

        if (nombreInput) {
            nombreInput.value = usuario.nombre || "";
        }

        if (correoInput) {
            correoInput.value = usuario.correo || "";
        }

        actualizarResumen(usuario.nombre, usuario.correo);

        // Muestra la foto si el backend devuelve una URL o Base64
        if (usuario.foto || usuario.foto_url || usuario.imagen_url) {
            mostrarFoto(usuario.foto || usuario.foto_url || usuario.imagen_url);
        }

    } catch (error) {
        console.error("Error al cargar el perfil:", error);
        mostrarMensaje(
            "No se pudo cargar la información del perfil desde el servidor.",
            "error"
        );
    }
}


// ============================================
// ACTUALIZAR RESUMEN
// ============================================

function actualizarResumen(nombre, correo) {
    const resumenNombre = document.getElementById("resumen-nombre");
    const resumenCorreo = document.getElementById("resumen-correo");
    const avatar = document.getElementById("avatar-perfil");

    const nombreFinal = (nombre || "").trim();

    if (resumenNombre) {
        resumenNombre.textContent = nombreFinal || "Mi cuenta";
    }

    if (resumenCorreo) {
        resumenCorreo.textContent = correo || "Correo no disponible";
    }

    if (avatar && nombreFinal) {
        avatar.textContent = nombreFinal.charAt(0).toUpperCase();
    }
}


// ============================================
// VISTA PREVIA DE LA FOTO (BASE64)
// ============================================

let fotoBase64Temporal = null;

function manejarFoto(evento) {
    const archivo = evento.target.files?.[0];

    if (!archivo) {
        return;
    }

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const maximoBytes = 15 * 1024 * 1024; // Ampliado a 15MB para coincidir con el backend

    if (!tiposPermitidos.includes(archivo.type)) {
        mostrarMensaje(
            "Selecciona una imagen JPG, PNG o WEBP.",
            "error"
        );
        evento.target.value = "";
        return;
    }

    if (archivo.size > maximoBytes) {
        mostrarMensaje(
            "La imagen no puede superar los 15 MB.",
            "error"
        );
        evento.target.value = "";
        return;
    }

    const lector = new FileReader();

    lector.onload = () => {
        fotoBase64Temporal = lector.result; // Guardamos el string en Base64
        mostrarFoto(fotoBase64Temporal);
        limpiarMensaje();
    };

    lector.onerror = () => {
        mostrarMensaje("No se pudo leer la imagen seleccionada.", "error");
    };

    lector.readAsDataURL(archivo);
}


function mostrarFoto(origen) {
    const imagen = document.getElementById("foto-perfil-preview");
    const avatar = document.getElementById("avatar-perfil");

    if (!imagen || !avatar || !origen) {
        return;
    }

    imagen.src = origen;
    imagen.hidden = false;
    avatar.hidden = true;
}


function limpiarFotoSeleccionada() {
    const inputFoto = document.getElementById("foto-perfil-input");
    const imagen = document.getElementById("foto-perfil-preview");
    const avatar = document.getElementById("avatar-perfil");

    fotoBase64Temporal = null;

    if (inputFoto) {
        inputFoto.value = "";
    }

    if (imagen) {
        imagen.removeAttribute("src");
        imagen.hidden = true;
    }

    if (avatar) {
        avatar.hidden = false;
    }
}


// ============================================
// GUARDAR CAMBIOS DEL PERFIL
// ============================================

async function guardarPerfil(evento) {
    evento.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const correo = document.getElementById("correo")?.value.trim() || "";
    
    // Contraseñas (opcionales)
    const passwordNueva = document.getElementById("password-nueva")?.value || "";
    const passwordConfirmacion = document.getElementById("password-confirmacion")?.value || "";

    const token = localStorage.getItem("token");

    if (!token) {
        mostrarMensaje("Sesión caducada. Inicia sesión nuevamente.", "error");
        return;
    }

    if (nombre.length < 2) {
        mostrarMensaje("El nombre debe tener al menos 2 caracteres.", "error");
        return;
    }

    if (!correoValido(correo)) {
        mostrarMensaje("Escribe un correo electrónico válido.", "error");
        return;
    }

    let passwordAEnviar = null;
    if (passwordNueva || passwordConfirmacion) {
        if (passwordNueva.length < 4) {
            mostrarMensaje("La nueva contraseña debe tener al menos 4 caracteres.", "error");
            return;
        }

        if (passwordNueva !== passwordConfirmacion) {
            mostrarMensaje("Las contraseñas nuevas no coinciden.", "error");
            return;
        }
        passwordAEnviar = passwordNueva;
    }

    const botonGuardar = document.getElementById("btn-guardar");

    try {
        if (botonGuardar) {
            botonGuardar.disabled = true;
            botonGuardar.textContent = "Guardando...";
        }

        // Estructura JSON compatible con el endpoint PUT /api/usuarios/perfil del backend
        const cuerpoPeticion = {
            nombre: nombre,
            foto: fotoBase64Temporal, // Envía la imagen convertida en Base64
            password: passwordAEnviar
        };

        const respuesta = await fetch(`${API_BASE}/api/usuarios/perfil`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(cuerpoPeticion)
        });

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(
                datos.message ||
                datos.mensaje ||
                `No se pudieron guardar los cambios (HTTP ${respuesta.status}).`
            );
        }

        // Actualizamos los datos locales del usuario en el navegador
        const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "{}");
        usuarioGuardado.nombre = nombre;
        if (fotoBase64Temporal) {
            usuarioGuardado.foto = fotoBase64Temporal;
        }
        localStorage.setItem("usuario", JSON.stringify(usuarioGuardado));

        actualizarResumen(nombre, correo);

        // Limpiar los campos de contraseña después de guardar
        const inputPassNueva = document.getElementById("password-nueva");
        const inputPassConf = document.getElementById("password-confirmacion");
        if (inputPassNueva) inputPassNueva.value = "";
        if (inputPassConf) inputPassConf.value = "";

        mostrarMensaje("¡Perfil actualizado correctamente!", "exito");

        // Redirección inteligente basada en el rol del usuario guardado
        setTimeout(() => {
            if (usuarioGuardado.rol === "administrador") {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "inicio.html";
            }
        }, 1200);

    } catch (error) {
        console.error("Error al guardar el perfil:", error);
        mostrarMensaje(
            error.message || "Ocurrió un error al guardar los cambios.",
            "error"
        );
    } finally {
        if (botonGuardar) {
            botonGuardar.disabled = false;
            botonGuardar.textContent = "Guardar cambios";
        }
    }
}


// ============================================
// VALIDACIONES Y MENSAJES
// ============================================

function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}


function mostrarMensaje(texto, tipo = "info") {
    const contenedor = document.getElementById("mensaje-perfil");

    if (!contenedor) {
        console.log(texto);
        return;
    }

    contenedor.textContent = texto;
    contenedor.className = `mensaje-perfil mensaje-${tipo}`;
    contenedor.hidden = false;
}


function limpiarMensaje() {
    const contenedor = document.getElementById("mensaje-perfil");

    if (contenedor) {
        contenedor.textContent = "";
        contenedor.hidden = true;
        contenedor.className = "mensaje-perfil";
    }
}