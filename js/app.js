// app.js - VERSIÓN FUSIONADA con notificaciones
let productos = [];
let productoActual = null;

// =============================================
// CONFIGURACIÓN DE CONTACTO Y NOTIFICACIONES
// =============================================
const configContacto = {
    telefono: "+584126597297",
    whatsapp: "584126597297", 
    email: "ramonsimancas61@gmail.com",
    mensajeWhatsapp: "Hola, me interesan sus artículos del catálogo",
    vendedor: "Cell Phone Snoopy: DE TODO UN POCO",
    
    proveedor: {
        email: "intelligere360@gmail.com",
        serviceId: "service_n6cbbge",
        templateId: "template_qx7z8s9", 
        userId: "hzEWYG4E0PQlhs2e_"
    }
};

// =============================================
// ESTADO GLOBAL DE LA APLICACIÓN
// =============================================
const AppState = {
    productoActual: null,
    sessionId: generarSessionId(),
    mensajesPendientes: []
};

// =============================================
// FUNCIONES DE UTILIDAD PARA NOTIFICACIONES
// =============================================

function generarSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function obtenerDatosUsuario() {
    return {
        sessionId: AppState.sessionId,
        timestamp: new Date().toISOString(),
        plataforma: navigator.platform,
        idioma: navigator.language,
        userAgent: navigator.userAgent.substring(0, 100)
    };
}

function obtenerProductoActual() {
    return AppState.productoActual;
}

// =============================================
// SISTEMA DE NOTIFICACIONES AL PROVEEDOR
// =============================================

async function enviarNotificacionProveedor(producto, tipoContacto) {
    const usuario = obtenerDatosUsuario();
    
    const notificationData = {
        timestamp: new Date().toISOString(),
        tipo: tipoContacto,
        usuario: usuario,
        producto: {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            categoria: producto.categoria
        }
    };

    try {
        await enviarNotificacionEmail(notificationData);
        console.log('✅ Notificación enviada al proveedor');
        mostrarNotificacion('Interés registrado correctamente', 'success');
        return Promise.resolve();
    } catch (error) {
        console.log('📦 Guardando notificación en cola offline');
        guardarEnColaOffline(notificationData);
        mostrarNotificacion('Sin conexión - Se enviará después', 'info');
        return Promise.reject(error);
    }
}

function guardarEnColaOffline(notificationData) {
    let cola = JSON.parse(localStorage.getItem('notificacionesPendientes') || '[]');
    cola.push({
        ...notificationData,
        intentos: 0,
        fechaCreacion: new Date().toISOString()
    });
    localStorage.setItem('notificacionesPendientes', JSON.stringify(cola));
    AppState.mensajesPendientes = cola;
}

async function procesarColaOffline() {
    if (!navigator.onLine) return;
    
    let cola = JSON.parse(localStorage.getItem('notificacionesPendientes') || '[]');
    if (cola.length === 0) return;

    const pendientes = [];
    
    for (let i = 0; i < cola.length; i++) {
        const item = cola[i];
        if (item.intentos < 3) {
            try {
                await enviarNotificacionEmail(item);
                console.log('✅ Notificación offline enviada');
            } catch (error) {
                item.intentos++;
                pendientes.push(item);
            }
        }
    }
    
    localStorage.setItem('notificacionesPendientes', JSON.stringify(pendientes));
    AppState.mensajesPendientes = pendientes;
}

async function enviarNotificacionEmail(data) {
    // Inicializar EmailJS si no está listo
    if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS no cargado');
    }

    const templateParams = {
        vendedor: configContacto.vendedor,
        product_name: data.producto.nombre,
        product_price: `$${data.producto.precio.toFixed(2)}`,
        product_category: data.producto.categoria,
        product_id: data.producto.id,
        contact_type: data.tipo,
        session_id: data.usuario.sessionId,
        platform: data.usuario.plataforma,
        language: data.usuario.idioma,
        timestamp: new Date(data.timestamp).toLocaleString('es-ES'),
        user_agent: data.usuario.userAgent,
        current_date: new Date().toLocaleDateString('es-ES'),
        to_email: configContacto.proveedor.email
    };

    try {
        const result = await emailjs.send(
            configContacto.proveedor.serviceId,
            configContacto.proveedor.templateId,
            templateParams
        );
        console.log('✅ Email de notificación enviado al proveedor');
        return result;
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        throw error;
    }
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensaje;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${tipo === 'success' ? '#27ae60' : tipo === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// =============================================
// SISTEMA DE DETECCIÓN DE CONTACTO
// =============================================

function configurarTrackingContacto() {
    // Detectar clics en enlaces de WhatsApp
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp"]');
        if (target && AppState.productoActual) {
            e.preventDefault();
            const producto = obtenerProductoActual();
            
            enviarNotificacionProveedor(producto, 'whatsapp')
                .finally(() => {
                    window.location.href = target.href;
                });
        }
    });

    // Detectar clics en enlaces de teléfono
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a[href^="tel:"]');
        if (target && AppState.productoActual) {
            e.preventDefault();
            const producto = obtenerProductoActual();
            
            enviarNotificacionProveedor(producto, 'llamada')
                .finally(() => {
                    window.location.href = target.href;
                });
        }
    });
}

// =============================================
// CARGA DE PRODUCTOS CON CORS PROXY
// =============================================
async function cargarProductos(forzarActualizacion = false) {
    try {
        console.log('📦 Cargando productos...');
        
        const jsonUrl = getProductsJsonUrl();
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jsonUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const productosData = await response.json();
        
        // ✅ PROCESAMIENTO DINÁMICO - El JSON ya trae toda la info de imágenes
        productos = productosData.map(producto => ({
            ...producto,
            imagenes: procesarImagenesDesdeJSON(producto),
            imagenPrincipal: obtenerImagenPrincipalDesdeJSON(producto)
        }));
        
        guardarCacheLocal(productos);
        console.log(`✅ ${productos.length} productos cargados`);
        mostrarProductos(productos);
        cargarCategorias();
        
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        await cargarDesdeCache();
    }
}

/**
 * Procesa las imágenes que vienen en el JSON
 */
function procesarImagenesDesdeJSON(producto) {
    if (producto.imagenes && Array.isArray(producto.imagenes)) {
        return producto.imagenes.map(img => ({
            id: img.id,
            url: buildImageUrl(img.id),  // ← Construye URL con ID real de Google Drive
            nombre: img.nombre,
            principal: img.principal || false,
            orden: img.orden || 1
        }));
    }
    
    // Fallback para productos sin array de imágenes
    console.warn(`⚠️ Producto ${producto.id} sin array de imágenes, usando fallback`);
    return [{
        id: `${producto.id}_1`,
        url: './images/placeholder.jpg',
        nombre: 'placeholder.jpg',
        principal: true,
        orden: 1
    }];
}

/**
 * Obtiene la imagen principal desde el JSON
 */
function obtenerImagenPrincipalDesdeJSON(producto) {
    if (producto.imagenes && producto.imagenes.length > 0) {
        // Buscar imagen marcada como principal
        const principal = producto.imagenes.find(img => img.principal);
        if (principal) {
            return buildImageUrl(principal.id);
        }
        // Si no hay principal, usar la primera
        return buildImageUrl(producto.imagenes[0].id);
    }
    
    return './images/placeholder.jpg';
}

// =============================================
// SISTEMA DE CACHE
// =============================================
function guardarCacheLocal(productos) {
    try {
        const cacheData = {
            productos: productos,
            timestamp: Date.now()
        };
        localStorage.setItem('catalogo_cache', JSON.stringify(cacheData));
    } catch (error) {
        console.warn('No se pudo guardar cache:', error);
    }
}

async function cargarDesdeCache() {
    try {
        const cache = localStorage.getItem('catalogo_cache');
        if (cache) {
            const data = JSON.parse(cache);
            // Cache válido por 1 hora
            if (Date.now() - data.timestamp < 60 * 60 * 1000) {
                productos = data.productos;
                console.log('📂 Productos cargados desde cache');
                mostrarProductos(productos);
                cargarCategorias();
                return true;
            }
        }
    } catch (error) {
        console.error('Error cargando cache:', error);
    }
    
    // Mostrar error
    productos = [];
    mostrarProductos(productos);
    mostrarError('No se pudieron cargar los productos. Verifica tu conexión.');
    return false;
}

// =============================================
// FUNCIONES DE UI
// =============================================
function mostrarProductos(productosAMostrar) {
    const grid = document.getElementById('productsGrid');
    
    if (!productosAMostrar || productosAMostrar.length === 0) {
        grid.innerHTML = `
            <div class="no-products">
                <p>No hay productos disponibles.</p>
                <button onclick="cargarProductos(true)" class="btn-retry">
                    Reintentar carga
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = productosAMostrar.map(producto => `
        <div class="product-card" onclick="mostrarDetallesProducto(${producto.id})">
            <div class="product-image-container">
                <img src="${producto.imagenPrincipal}" 
                     alt="${producto.nombre}"
                     class="product-image"
                     loading="lazy"
                     onerror="this.src='./images/placeholder.jpg'">
            </div>
            <div class="product-info">
                <div class="product-name">${producto.nombre}</div>
                <div class="product-category">${producto.categoria}</div>
                <div class="product-price">$${producto.precio.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

function mostrarDetallesProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    // ACTUALIZAR ESTADO GLOBAL para notificaciones
    productoActual = producto;
    AppState.productoActual = producto;
    
    const modalContent = document.getElementById('modalContent');
    
    // Crear carrusel de imágenes
    const carouselHTML = crearCarruselImagenes(producto);
    
    // Formatear especificaciones como lista HTML
    const especificacionesHTML = formatearEspecificaciones(producto.especificaciones);
    
    modalContent.innerHTML = `
        <div class="product-detail">
            <div class="detail-images">
                ${carouselHTML}
            </div>
            <div class="detail-info">
                <h2>${producto.nombre}</h2>
                <p class="product-category">${producto.categoria}</p>
                <p class="product-price">$${producto.precio.toFixed(2)}</p>
                <p class="product-description">${producto.descripcion}</p>
                ${especificacionesHTML}
            </div>
        </div>
    `;
    
    // Inicializar el carrusel después de mostrar el modal
    setTimeout(() => {
        inicializarCarrusel(producto);
    }, 100);
    
    // Actualizar enlaces de contacto
    const mensaje = `Hola, me interesa: ${producto.nombre} - $${producto.precio.toFixed(2)}`;
    const urlWhatsapp = `https://wa.me/${configContacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    document.getElementById('whatsappModal').href = urlWhatsapp;
    
    document.getElementById('productModal').style.display = 'block';
}

/**
 * Formatea las especificaciones como lista HTML con viñetas
 */
function formatearEspecificaciones(especificaciones) {
    if (!especificaciones) return '';
    
    // Dividir por punto y coma y limpiar espacios
    const items = especificaciones.split(';')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    
    if (items.length === 0) return '';
    
    // Crear lista HTML
    const listaItems = items.map(item => 
        `<li>${item}</li>`
    ).join('');
    
    return `
        <div class="product-specs">
            <h4>Especificaciones:</h4>
            <ul class="specs-list">
                ${listaItems}
            </ul>
        </div>
    `;
}

/**
 * Crea el HTML del carrusel de imágenes - VERSIÓN FADE
 */
function crearCarruselImagenes(producto) {
    if (!producto.imagenes || producto.imagenes.length === 0) {
        return `<div class="no-image">Imagen no disponible</div>`;
    }
    
    const slides = producto.imagenes.map((img, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}">
            <img src="${img.url}" alt="${producto.nombre} - Imagen ${index + 1}" 
                 onerror="this.src='./images/placeholder.jpg'"
                 loading="lazy">
        </div>
    `).join('');
    
    const dots = producto.imagenes.length > 1 ? producto.imagenes.map((_, index) => `
        <span class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
    `).join('') : '';
    
    const navigationButtons = producto.imagenes.length > 1 ? `
        <button class="carousel-btn carousel-prev">‹</button>
        <button class="carousel-btn carousel-next">›</button>
    ` : '';
    
    return `
        <div class="carousel-container">
            <div class="carousel-track">
                ${slides}
            </div>
            ${navigationButtons}
            ${producto.imagenes.length > 1 ? `
                <div class="carousel-dots">
                    ${dots}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Inicializa la funcionalidad del carrusel - VERSIÓN CON AUTO-DESPLAZAMIENTO
 */
function inicializarCarrusel(producto) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const carouselContainer = document.querySelector('.carousel-container');
    
    if (slides.length <= 1) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoSlideInterval;

    console.log(`🖼️ Carrusel auto-desplazamiento con ${totalSlides} imágenes`);

    // Función para mostrar slide específico
    function goToSlide(index) {
        // Ocultar slide actual
        slides[currentSlide].classList.remove('active');
        if (dots.length > 0) {
            dots[currentSlide].classList.remove('active');
        }
        
        // Actualizar índice
        currentSlide = (index + totalSlides) % totalSlides;
        
        // Mostrar nuevo slide
        slides[currentSlide].classList.add('active');
        if (dots.length > 0) {
            dots[currentSlide].classList.add('active');
        }
    }

    // Función para ir al siguiente slide automáticamente
    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    // Iniciar auto-desplazamiento
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 3000); // 3 segundos
    }

    // Detener auto-desplazamiento
    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        }
    }

    // Reiniciar auto-desplazamiento
    function restartAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }

    // Event listeners para botones
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
            restartAutoSlide(); // Reiniciar el timer al interacción manual
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
            restartAutoSlide(); // Reiniciar el timer al interacción manual
        });
    }

    // Event listeners para dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            restartAutoSlide(); // Reiniciar el timer al interacción manual
        });
    });

    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('productModal').style.display === 'block') {
            if (e.key === 'ArrowLeft') {
                goToSlide(currentSlide - 1);
                restartAutoSlide();
            } else if (e.key === 'ArrowRight') {
                goToSlide(currentSlide + 1);
                restartAutoSlide();
            }
        }
    });

    // Swipe para móviles
    let startX = 0;

    if (carouselContainer) {
        carouselContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            stopAutoSlide(); // Pausar auto-desplazamiento durante swipe
        });

        carouselContainer.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    goToSlide(currentSlide + 1);
                } else {
                    goToSlide(currentSlide - 1);
                }
            }
            startAutoSlide(); // Reanudar auto-desplazamiento después del swipe
        });

        // Pausar auto-desplazamiento cuando el mouse está sobre el carrusel
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
    }

    // Pausar auto-desplazamiento cuando el modal no está visible
    const modal = document.getElementById('productModal');
    if (modal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    if (modal.style.display === 'block') {
                        startAutoSlide();
                    } else {
                        stopAutoSlide();
                    }
                }
            });
        });
        
        observer.observe(modal, { attributes: true });
    }

    // Iniciar auto-desplazamiento
    startAutoSlide();

    // Limpiar intervalo cuando se cierre el modal
    window.addEventListener('beforeunload', stopAutoSlide);
}

// =============================================
// INICIALIZACIÓN MEJORADA
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // 1. Inicializar EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(configContacto.proveedor.userId);
    }
    
    // 2. Cargar productos
    cargarProductos();
    
    // 3. Configurar eventos básicos
    configurarEventListeners();
    
    // 4. Configurar sistema de notificaciones
    configurarTrackingContacto();
    
    // 5. Configurar detección de conexión
    configurarDeteccionConexion();
    
    console.log('🚀 Catálogo iniciado con sistema de notificaciones');
});

function configurarEventListeners() {
    // Cerrar modal
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('productModal').style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('productModal')) {
            document.getElementById('productModal').style.display = 'none';
        }
    });
    
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProductos);
    }
    
    // Filtro de categoría
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filtrarProductos);
    }
}

function configurarDeteccionConexion() {
    // Detectar cambios de conexión
    window.addEventListener('online', () => {
        mostrarNotificacion('Conexión restablecida', 'success');
        procesarColaOffline();
    });

    window.addEventListener('offline', () => {
        mostrarNotificacion('Sin conexión - Los mensajes se enviarán después', 'info');
    });
}

function filtrarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    const filtrados = productos.filter(producto => {
        const matchSearch = producto.nombre.toLowerCase().includes(searchTerm) ||
                           producto.descripcion.toLowerCase().includes(searchTerm);
        const matchCategory = category === 'all' || producto.categoria === category;
        
        return matchSearch && matchCategory;
    });
    
    mostrarProductos(filtrados);
}

function cargarCategorias() {
    const categorias = [...new Set(productos.map(p => p.categoria))];
    const filter = document.getElementById('categoryFilter');
    
    if (filter) {
        // Limpiar opciones excepto "Todas"
        filter.innerHTML = '<option value="all">Todas las categorías</option>';
        
        // Agregar categorías
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            filter.appendChild(option);
        });
    }
}

function mostrarError(mensaje) {
    console.error('❌ Error:', mensaje);
    // Puedes mostrar una notificación en la UI si quieres
}