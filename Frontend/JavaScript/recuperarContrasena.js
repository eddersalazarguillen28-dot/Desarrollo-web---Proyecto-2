document.addEventListener('DOMContentLoaded',() => {
    const form = document.getElementById('recuperarForm');
    const inputCorreo=document.getElementById('correo');
    const btnEnviar= document.getElementById('enviarBtn');

    form.addEventListener('submit',async(e) => {
        e.preventDefault();

        const correo = inputCorreo.value.trim();

        if(!correo){
            mostrarMensaje("Por favor, ingresa tu correo electrónico","error");
            return;
        }

        const textoOriginal = btnEnviar.innerHTML;
        btnEnviar.disabled = true;
        btnEnviar.style.cursor="wait";
        btnEnviar.textContent="Enviando enlace..."; 

        try{
            //conexion con backend API
            const respuesta = await fetch('/api/recuperar-password',{//Endpoint
                method:'POST',
                headers:{
                    'content-Type':'application/json'
                },
                body:JSON.stringify({correo})
            });

            const datos = await respuesta.json();
            if (respuesta.ok){
                alert("El correo ha sido enviado, revisa tu bandeja de entrada para restablecer tu contraseña");
                form.reset();
            }else{
                alert(datos.mensaje||"No se pudo procesar la solicitud, verifica el correo");
            }
        
        }catch(error){
            console.error("Error de red o servidor:",error);
            alert("Ocurrió un error de conexión.Inténtalo más tarde");
        }finally{
            btnEnviar.disabled = false;
            btnEnviar.style.cursor='pointer';
            btnEnviar.textContent = textoOriginal;

        }
    });
});