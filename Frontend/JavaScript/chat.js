document.addEventListener('DOMContentLoaded', () => {
  const btnAbrir = document.getElementById('btn-abrir-chat');
  const btnCerrar = document.getElementById('btn-cerrar-chat');
  const ventanaChat = document.getElementById('ventana-chat');
  const btnEnviar = document.getElementById('btn-enviar-chat');
  const inputChat = document.getElementById('chat-input');
  const contenedorMensajes = document.getElementById('chat-mensajes');

  const API_URL = 'https://octo-erp.onrender.com/chat';

  if (
    !btnAbrir || !btnCerrar || !ventanaChat ||
    !btnEnviar || !inputChat || !contenedorMensajes
  ) {
    console.error('No se encontraron todos los elementos del chat.');
    return;
  }

  btnAbrir.addEventListener('click', () => {
    ventanaChat.classList.remove('oculta');
  });

  btnCerrar.addEventListener('click', () => {
    ventanaChat.classList.add('oculta');
  });

  function agregarMensajeUI(texto, emisor) {
    const divMensaje = document.createElement('div');
    divMensaje.classList.add('mensaje', emisor);

    const burbuja = document.createElement('div');
    burbuja.className = 'burbuja';

    if (emisor === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'avatar-pequeno';
      avatar.textContent = 'X';

      // Permitir solo formato básico y evitar insertar HTML peligroso.
      const documento = new DOMParser().parseFromString(
        String(texto ?? ''),
        'text/html'
      );

      function copiarSeguro(nodo, destino) {
        nodo.childNodes.forEach(hijo => {
          if (hijo.nodeType === Node.TEXT_NODE) {
            destino.appendChild(
              document.createTextNode(hijo.textContent)
            );
            return;
          }

          if (hijo.nodeType !== Node.ELEMENT_NODE) return;

          const permitidas = ['B', 'BR', 'UL', 'LI'];

          if (!permitidas.includes(hijo.tagName)) {
            copiarSeguro(hijo, destino);
            return;
          }

          const nuevo = document.createElement(
            hijo.tagName.toLowerCase()
          );

          copiarSeguro(hijo, nuevo);
          destino.appendChild(nuevo);
        });
      }

      copiarSeguro(documento.body, burbuja);
      divMensaje.append(avatar, burbuja);
    } else {
      burbuja.textContent = String(texto ?? '');
      divMensaje.appendChild(burbuja);
    }

    contenedorMensajes.appendChild(divMensaje);
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

    return divMensaje;
  }

  async function enviarMensaje() {
    const texto = inputChat.value.trim();

    if (!texto || btnEnviar.disabled) return;

    agregarMensajeUI(texto, 'usuario');
    inputChat.value = '';
    btnEnviar.disabled = true;

    const mensajeCarga = agregarMensajeUI(
      'Consultando inventario y asistente...',
      'bot'
    );

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Enviar ambos nombres para compatibilidad con versiones
        // del backend que todavía lean "pregunta".
        body: JSON.stringify({
          mensaje: texto,
          pregunta: texto
        })
      });

      // Leer como texto primero para poder mostrar errores no JSON.
      const cuerpo = await respuesta.text();

      let data;

      try {
        data = JSON.parse(cuerpo);
      } catch {
        console.error(
          'El servidor no devolvió JSON:',
          respuesta.status,
          cuerpo
        );

        throw new Error(
          `El servidor respondió con HTTP ${respuesta.status} ` +
          'y una respuesta que no es JSON.'
        );
      }

      console.log('Estado HTTP del chat:', respuesta.status);
      console.log('Respuesta del backend:', data);

      if (!respuesta.ok) {
        if (respuesta.status === 503) {
          throw new Error(
            'El asistente de IA está temporalmente ocupado. ' +
            'Espera unos segundos e inténtalo de nuevo.'
          );
        }

        if (respuesta.status >= 500) {
          throw new Error(
            'El servidor no pudo completar la consulta. ' +
            'Revisa los registros de Render.'
          );
        }

        throw new Error(
          data.message ||
          data.respuesta ||
          `El servidor respondió con HTTP ${ respuesta.status }`
        );
      }

      if (
        typeof data.respuesta !== 'string' ||
        !data.respuesta.trim()
      ) {
        throw new Error(
          data.message ||
          'El servidor no devolvió el campo "respuesta".'
        );
      }

      mensajeCarga.remove();
      agregarMensajeUI(data.respuesta, 'bot');

    } catch (error) {
      console.error('Error del chat:', error);

      mensajeCarga.remove();

      agregarMensajeUI(
        `No se pudo completar la consulta: ${error.message}`,
        'bot'
      );
    } finally {
      btnEnviar.disabled = false;
      inputChat.focus();
    }
  }

  btnEnviar.addEventListener('click', enviarMensaje);

  inputChat.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      enviarMensaje();
    }
  });
});