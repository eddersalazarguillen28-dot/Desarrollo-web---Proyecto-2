document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById("cuerpo-inventario");
    const contador = document.getElementById("contador-inventario");
    
    const modal = document.getElementById("modal-nuevo-producto");
    const formNuevo = document.getElementById("form-nuevo-producto");
    const btnAbrirModal = document.getElementById("btn-abrir-modal");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnCancelarModal = document.getElementById("btn-cancelar-modal");

    // 1. Inicializar datos si el LocalStorage está vacío
    if (!localStorage.getItem("db_inventario")) {
        const inventarioBase = [
            { img: "../Imagenes/laptop.png", nombre: "Laptop Dell XPS", categoria: "Electrónica", sku: "#ELC-1001", stock: 15 },
            { img: "../Imagenes/mouse.png", nombre: "Mouse inalámbrico Logitech", categoria: "Accesorios", sku: "#ACC-2045", stock: 50 },
            { img: "../Imagenes/teclado.png", nombre: "Teclado Mecánico", categoria: "Accesorios", sku: "#ACC-2088", stock: 28 },
            { img: "../Imagenes/monitor.png", nombre: "Monitor LG 24\"", categoria: "Electrónica", sku: "#ELC-1090", stock: 8 },
            { img: "../Imagenes/sillaGamer.png", nombre: "Silla Gamer Corsair", categoria: "Muebles", sku: "#MUE-5002", stock: 12 }
        ];
        localStorage.setItem("db_inventario", JSON.stringify(inventarioBase));
    }

    // 2. Función para dibujar la tabla leyendo la Base de Datos simulada
    function renderizarTabla() {
        const inventario = JSON.parse(localStorage.getItem("db_inventario")) || [];
        tbody.innerHTML = ""; 

        inventario.forEach((prod, index) => {
            const claseStock = prod.stock > 10 ? 'good' : 'low';
            const tr = document.createElement("tr");
            
            tr.innerHTML = `
                <td>
                    <div class="imagen-producto">
                        <img src="${prod.img}" alt="${prod.nombre}" style="width: 50px; height: 50px; object-fit: contain;">
                    </div>
                </td>
                <td><strong>${prod.nombre}</strong></td>
                <td>${prod.categoria}</td>
                <td>${prod.sku}</td>
                <td><span class="stock ${claseStock}">${prod.stock}</span></td>
                <td>
                    <div class="actions">
                        <button class="edit" data-index="${index}" style="padding: 5px 10px; cursor: pointer; background: #eef0ff; color: #7367f0; border: none; border-radius: 4px;">Ajustar</button>
                        <button class="delete" data-index="${index}" style="padding: 5px 10px; cursor: pointer; background: #ffebeb; color: #dc3545; border: none; border-radius: 4px; margin-left: 5px;">Baja</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        contador.innerText = `Mostrando ${inventario.length} artículos en inventario`;
    }

    // 3. Controles del Modal
    const cerrarModal = () => {
        modal.classList.remove("activo");
        formNuevo.reset();
    };

    btnAbrirModal.addEventListener("click", () => modal.classList.add("activo"));
    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCancelarModal.addEventListener("click", cerrarModal);

    // 4. Guardar un nuevo producto desde el formulario visual
    formNuevo.addEventListener("submit", (e) => {
        e.preventDefault();

        // Crear el objeto del nuevo producto
        const nuevoProducto = {
            img: "../Imagenes/Logo.png", // Usa el logo por defecto para los nuevos
            nombre: document.getElementById("nombreProd").value,
            categoria: document.getElementById("categoriaProd").value,
            sku: document.getElementById("skuProd").value,
            stock: parseInt(document.getElementById("stockProd").value)
        };

        // Leer DB, agregar producto y guardar
        const inventario = JSON.parse(localStorage.getItem("db_inventario"));
        inventario.unshift(nuevoProducto); // Lo añade al inicio de la lista
        localStorage.setItem("db_inventario", JSON.stringify(inventario));

        // Actualizar la vista y cerrar
        renderizarTabla();
        cerrarModal();
    });

    // 5. Ajustar o Eliminar producto (Usando delegación de eventos)
    tbody.addEventListener("click", (e) => {
        const inventario = JSON.parse(localStorage.getItem("db_inventario"));
        const index = e.target.getAttribute("data-index");

        if (e.target.classList.contains("edit")) {
            const prod = inventario[index];
            const nuevoStock = prompt(`Actualizar stock de: ${prod.nombre}\nStock actual: ${prod.stock}`, prod.stock);
            
            if (nuevoStock !== null && !isNaN(nuevoStock) && nuevoStock >= 0) {
                inventario[index].stock = parseInt(nuevoStock);
                localStorage.setItem("db_inventario", JSON.stringify(inventario));
                renderizarTabla();
            }
        } 
        else if (e.target.classList.contains("delete")) {
            if (confirm("¿Seguro que deseas eliminar este producto permanentemente?")) {
                inventario.splice(index, 1);
                localStorage.setItem("db_inventario", JSON.stringify(inventario));
                renderizarTabla();
            }
        }
    });

    // Ejecutar renderizado inicial
    renderizarTabla();
});