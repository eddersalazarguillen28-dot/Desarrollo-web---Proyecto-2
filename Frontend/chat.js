document.addEventListener('DOMContentLoaded', () => {
  const btnAbrir = document.getElementById('btn-abrir-chat');
  const btnCerrar = document.getElementById('btn-cerrar-chat');
  const ventanaChat = document.getElementById('ventana-chat');
  const btnEnviar = document.getElementById('btn-enviar-chat');
  const inputChat = document.getElementById('chat-input');
  const contenedorMensajes = document.getElementById('chat-mensajes');

  btnAbrir.addEventListener('click', () => ventanaChat.classList.remove('oculta'));
  btnCerrar.addEventListener('click', () => ventanaChat.classList.add('oculta'));

  const enviarMensaje = async () => {
    const texto = inputChat.value.trim();
    if (!texto) return;

    agregarMensajeUI(texto, 'usuario');
    inputChat.value = '';

    const idCarga = "msg-carga-" + Date.now();
    agregarMensajeTemporal("Analizando base de datos...", 'bot', idCarga);

    try {
        const respuesta = await fetch('http://octo-erp.onrender.com/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: texto })
        });
        
        const data = await respuesta.json();
        
        document.getElementById(idCarga).remove();
        agregarMensajeUI(data.respuesta, 'bot');
        
    } catch (error) {
        document.getElementById(idCarga).remove();
        agregarMensajeUI("Error de conexión. Asegúrate de que interfaz.py esté corriendo.", 'bot');
    }
  };

  function agregarMensajeUI(texto, emisor) {
    const divMensaje = document.createElement('div');
    divMensaje.classList.add('mensaje', emisor);
    
    if (emisor === 'bot') {
        divMensaje.innerHTML = `<div class="avatar-pequeno">X</div><div class="burbuja">${texto}</div>`;
    } else {
        divMensaje.innerHTML = `<div class="burbuja">${texto}</div>`;
    }
    
    contenedorMensajes.appendChild(divMensaje);
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
  }

  function agregarMensajeTemporal(texto, emisor, id) {
    const divMensaje = document.createElement('div');
    divMensaje.classList.add('mensaje', emisor);
    divMensaje.id = id;
    divMensaje.innerHTML = `<div class="avatar-pequeno"></div><div class="burbuja">${texto}</div>`;
    contenedorMensajes.appendChild(divMensaje);
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
  }

  btnEnviar.addEventListener('click', enviarMensaje);
  inputChat.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
  });
});