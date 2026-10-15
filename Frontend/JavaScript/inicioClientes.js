document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initScrollReveal();
});

function initThemeToggle() {
    const btnTheme = document.getElementById('btn-toggle-theme');
    const htmlElement = document.documentElement;

    // Recuperar preferencia previa guardada
    const savedTheme = localStorage.getItem('octoerp_theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);

    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('octoerp_theme', newTheme);
        });
    }
}


function initScrollReveal() {
    const revealItems = document.querySelectorAll('.reveal-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    revealItems.forEach(item => observer.observe(item));
}

/**
 
Contador interactivo para el carrito de compras*/
let totalCarrito = 0;

function agregarAlCarrito(nombreProducto) {
    totalCarrito++;
    const badge = document.getElementById('carrito-count');
    if (badge) {
        badge.innerText = totalCarrito;

        // Animación breve al presionar el botón
        badge.style.transform = 'scale(1.3)';
        setTimeout(() => {
            badge.style.transform = 'scale(1)';
        }, 200);
    }
}