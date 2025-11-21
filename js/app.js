// app.js - VERSIÓN CORREGIDA CON SCROLL FUNCIONAL
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
    mensajesPendientes: [],
    imagenesPrecargadas: new Set()
};

// =============================================
// DETECCIÓN Y CONFIGURACIÓN PARA MODO APP/APK
// =============================================

function configurarModoApp() {
    // Detectar si estamos en modo standalone (PWA instalada)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true;
    
    if (isStandalone) {
        console.log('📱 Ejecutando en modo App/APK');
        
        // Aplicar clases específicas para modo app
        document.body.classList.add('fullscreen-app');
        document.documentElement.style.setProperty('--app-mode', 'true');
        
        // Ocultar cualquier elemento que pueda mostrar la URL
        ocultarElementosNavegacion();
        
        // Configurar comportamiento de salida
        configurarSalidaApp();
    } else {
        console.log('🌐 Ejecutando en modo navegador');
    }
}

function ocultarElementosNavegacion() {
    // Intentar ocultar cualquier barra de navegación nativa
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
        metaViewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // Inyectar estilos para ocultar posibles elementos de navegación - VERSIÓN CORREGIDA
    const style = document.createElement('style');
    style.textContent = `
        /* Ocultar cualquier elemento que pueda mostrar la URL */
        iframe[src*="browser"], 
        [class*="address"], 
        [class*="url"],
        [id*="address"],
        [id*="url"] {
            display: none !important;
        }
        
        /* CORRECCIÓN: Permitir scroll en el contenido principal */
        .fullscreen-app {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        
        .fullscreen-app .container {
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        /* Prevenir bounce/rebote en iOS */
        .fullscreen-app .container {
            overscroll-behavior: contain;
        }
    `;
    document.head.appendChild(style);
}

function configurarSalidaApp() {
    // Configurar doble tap para salir (comportamiento común en apps Android)
    let backButtonPressed = 0;
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            backButtonPressed++;
            
            if (backButtonPressed === 1) {
                mostrarNotificacion('Presiona de nuevo para salir', 'info');
                setTimeout(() => {
                    backButtonPressed = 0;
                }, 2000);
            } else if (backButtonPressed === 2) {
                // Cerrar la app (solo funciona en algunos entornos)
                if (window.navigator.app) {
                    window.navigator.app.exitApp();
                } else {
                    window.close();
                }
            }
        }
    });
}

// =============================================
// SISTEMA DE CARGA PROGRESIVA
// =============================================

/**
 * Precarga imágenes en segundo plano para mejor rendimiento
 */
function precargarImagenes(productos) {
    productos.forEach(producto => {
        if (producto.imagenes && producto.imagenes.length > 0) {
            // Precargar imagen principal inmediatamente
            const imgPrincipal = new Image();
            imgPrincipal.src = producto.imagenPrincipal;
            imgPrincipal.onload = () => {
                AppState.imagenesPrecargadas.add(producto.imagenPrincipal);
                // Actualizar producto si ya está visible
                actualizarImagenProducto(producto.id, producto.imagenPrincipal);
            };
            imgPrincipal.onerror = () => {
                console.warn(`❌ No se pudo precargar imagen principal de ${producto.nombre}`);
            };
            
            // Precargar otras imágenes en segundo plano
            producto.imagenes.slice(1).forEach(imagen => {
                const img = new Image();
                img.src = imagen.url;
                img.onload = () => {
                    AppState.imagenesPrecargadas.add(imagen.url);
                };
            });
        }
    });
}

/**
 * Actualiza la imagen de un producto específico cuando se carga
 */
function actualizarImagenProducto(productoId, imagenUrl) {
    const productCard = document.querySelector(`[data-product-id="${productoId}"]`);
    if (productCard) {
        const imgElement = productCard.querySelector('.product-image');
        if (imgElement && imgElement.src !== imagenUrl) {
            imgElement.src = imagenUrl;
            imgElement.style.opacity = '0';
            setTimeout(() => {
                imgElement.style.opacity = '1';
                imgElement.style.transition = 'opacity 0.3s ease';
            }, 50);
        }
    }
}

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
// CARGA PROGRESIVA DE PRODUCTOS
// =============================================
async function cargarProductos(forzarActualizacion = false) {
    try {
        console.log('📦 Cargando productos de forma progresiva...');
        
        // MOSTRAR ESQUELETOS MIENTRAS SE CARGA
        mostrarEsqueletosCarga();
        
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
        console.log(`✅ ${productos.length} productos procesados`);
        
        // MOSTRAR PRODUCTOS INMEDIATAMENTE (con placeholders)
        mostrarProductos(productos);
        
        // PRECARGAR IMÁGENES EN SEGUNDO PLANO
        precargarImagenes(productos);
        
        cargarCategorias();
        
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        await cargarDesdeCache();
    }
}

/**
 * Muestra esqueletos de carga mientras se obtienen los productos
 */
function mostrarEsqueletosCarga() {
    const grid = document.getElementById('productsGrid');
    const skeletonCount = 8; // Número de esqueletos a mostrar
    
    grid.innerHTML = Array(skeletonCount).fill(0).map(() => `
        <div class="product-card skeleton">
            <div class="product-image-container">
                <div class="skeleton-image"></div>
            </div>
            <div class="product-info">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-category"></div>
                <div class="skeleton-line skeleton-price"></div>
            </div>
        </div>
    `).join('');
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
// FUNCIONES DE UI MEJORADAS
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
    
    // MOSTRAR PRODUCTOS INMEDIATAMENTE con lazy loading
    grid.innerHTML = productosAMostrar.map(producto => `
        <div class="product-card" 
             onclick="mostrarDetallesProducto(${producto.id})"
             data-product-id="${producto.id}">
            <div class="product-image-container">
                <img src="${producto.imagenPrincipal}" 
                     alt="${producto.nombre}"
                     class="product-image"
                     loading="lazy"
                     onload="this.style.opacity='1'"
                     onerror="this.src='./images/placeholder.jpg'; this.style.opacity='1'"
                     style="opacity: ${AppState.imagenesPrecargadas.has(producto.imagenPrincipal) ? '1' : '0.7'}; transition: opacity 0.3s ease">
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
    
    // ✅ CORRECCIÓN: Usar template literal más simple y confiable
    modalContent.innerHTML = `
        <div class="product-detail">
            <div class="detail-images">
                ${crearCarruselImagenes(producto)}
            </div>
            <div class="detail-info">
                <h2>${producto.nombre}</h2>
                <p class="product-category">${producto.categoria}</p>
                <p class="product-price">$${producto.precio.toFixed(2)}</p>
                <div class="product-description">${producto.descripcion}</div>
                ${formatearEspecificaciones(producto.especificaciones)}
            </div>
        </div>
    `;
    
    // ✅ CORRECCIÓN MEJORADA: Usar MutationObserver para detectar cuando el DOM está listo
    inicializarCarruselCuandoEsteListo(producto);
    
    // Actualizar enlaces de contacto
    const mensaje = `Hola, me interesa: ${producto.nombre} - $${producto.precio.toFixed(2)}`;
    const urlWhatsapp = `https://wa.me/${configContacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    document.getElementById('whatsappModal').href = urlWhatsapp;
    
    document.getElementById('productModal').style.display = 'block';
}

// ✅ NUEVA FUNCIÓN: Inicializar carrusel cuando el DOM esté listo
function inicializarCarruselCuandoEsteListo(producto) {
    const observer = new MutationObserver((mutations, obs) => {
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer) {
            console.log('✅ Carrusel detectado en el DOM, inicializando...');
            inicializarCarrusel(producto);
            obs.disconnect(); // Dejar de observar
        }
    });
    
    // Comenzar a observar
    observer.observe(document.getElementById('modalContent'), {
        childList: true,
        subtree: true
    });
    
    // Timeout de respaldo por si MutationObserver falla
    setTimeout(() => {
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer) {
            console.log('✅ Carrusel inicializado por timeout de respaldo');
            inicializarCarrusel(producto);
        }
    }, 300);
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

function crearCarruselImagenes(producto) {
    console.log('🖼️ Creando carrusel para producto:', producto.nombre);
    console.log('📸 Imágenes disponibles:', producto.imagenes);
    
    if (!producto.imagenes || producto.imagenes.length === 0) {
        console.warn('⚠️ No hay imágenes para el producto');
        return `<div class="no-image">Imagen no disponible</div>`;
    }
    
    // ✅ CORRECCIÓN: Verificar que las URLs sean válidas
    const slides = producto.imagenes.map((img, index) => {
        const imageUrl = img.url || './images/placeholder.jpg';
        console.log(`📸 Imagen ${index}:`, imageUrl);
        
        return `
            <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                <img src="${imageUrl}" 
                     alt="${producto.nombre} - Imagen ${index + 1}" 
                     onerror="this.src='./images/placeholder.jpg'; console.log('❌ Error cargando imagen: ${imageUrl}')"
                     loading="lazy"
                     style="width: 100%; height: 100%; object-fit: contain;">
            </div>
        `;
    }).join('');
    
    const isSingleImage = producto.imagenes.length === 1;
    const containerClass = isSingleImage ? 'carousel-container single-image' : 'carousel-container';
    
    const dots = producto.imagenes.length > 1 ? producto.imagenes.map((_, index) => `
        <span class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
    `).join('') : '';
    
    const navigationButtons = producto.imagenes.length > 1 ? `
        <button class="carousel-btn carousel-prev">‹</button>
        <button class="carousel-btn carousel-next">›</button>
    ` : '';
    
    return `
        <div class="${containerClass}">
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
 * Inicializa la funcionalidad del carrusel - VERSIÓN CON MODO MAXIMIZADO Y ZOOM
 */
function inicializarCarrusel(producto) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const carouselContainer = document.querySelector('.carousel-container');
    
    if (slides.length === 0) return;

    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoSlideInterval;
    let isMaximized = false;
    let isZoomed = false;
    let currentMaximizedImage = null;

    console.log(`🖼️ Carrusel avanzado con ${totalSlides} imágenes`);

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

    // 🆕 CORRECCIÓN: Función mejorada para inicializar eventos de imágenes
    function inicializarEventosImagenes() {
        slides.forEach((slide, index) => {
            const img = slide.querySelector('img');
            if (img) {
                // Remover event listeners previos para evitar duplicados
                const newImg = img.cloneNode(true);
                img.parentNode.replaceChild(newImg, img);
                
                // Click simple para maximizar - SOLO en la imagen, no en el slide
                newImg.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('🖱️ Click en imagen para maximizar');
                    toggleMaximizedMode(newImg);
                });
                
                // Prevenir arrastre accidental
                newImg.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                });
            }
        });
    }

    // Inicializar eventos de imágenes
    inicializarEventosImagenes();

    // Función para modo maximizado - CORREGIDA
    function toggleMaximizedMode(imgElement) {
        console.log('🔍 Toggle maximized mode, estado actual:', isMaximized);
        
        if (!isMaximized) {
            // Entrar en modo maximizado
            openMaximizedMode(imgElement);
        } else {
            // Salir del modo maximizado
            closeMaximizedMode();
        }
    }

    // Abrir modo maximizado - VERSIÓN CON PANEO
    function openMaximizedMode(imgElement) {
        console.log('📱 Abriendo modo maximizado');
        isMaximized = true;
        currentMaximizedImage = imgElement;
        
        // Detener auto-slide cuando se maximiza
        stopAutoSlide();
        
        // Crear overlay para modo maximizado
        const overlay = document.createElement('div');
        overlay.className = 'maximized-overlay';
        overlay.innerHTML = `
            <div class="maximized-container">
                <img src="${imgElement.src}" alt="${imgElement.alt}" class="maximized-image">
                <button class="maximized-close">×</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Elementos del DOM
        const maximizedImg = overlay.querySelector('.maximized-image');
        const closeBtn = overlay.querySelector('.maximized-close');
        const container = overlay.querySelector('.maximized-container');
        
        // Variables para el paneo/arrastre
        let isDragging = false;
        let startX, startY;
        let translateX = 0, translateY = 0;
        let currentScale = 1;

        // Función para actualizar la transformación
        function updateTransform() {
            maximizedImg.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        }

        // Función para limitar el paneo
        function constrainPan() {
            if (!isZoomed) return;
            
            const imgRect = maximizedImg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const maxX = Math.max(0, (imgRect.width * currentScale - containerRect.width) / 2);
            const maxY = Math.max(0, (imgRect.height * currentScale - containerRect.height) / 2);
            
            translateX = Math.max(-maxX, Math.min(maxX, translateX));
            translateY = Math.max(-maxY, Math.min(maxY, translateY));
        }

        // Manejar inicio del arrastre
        function startPan(e) {
            if (!isZoomed) return;
            
            isDragging = true;
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            startX = clientX - translateX;
            startY = clientY - translateY;
            maximizedImg.style.cursor = 'grabbing';
            e.preventDefault();
        }

        // Manejar movimiento durante arrastre
        function handlePan(e) {
            if (!isDragging || !isZoomed) return;
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            translateX = clientX - startX;
            translateY = clientY - startY;
            constrainPan();
            updateTransform();
            e.preventDefault();
        }

        // Detener arrastre
        function stopPan() {
            isDragging = false;
            if (isZoomed) {
                maximizedImg.style.cursor = 'grab';
            }
        }

        // Event listeners para desktop
        maximizedImg.addEventListener('mousedown', startPan);
        document.addEventListener('mousemove', handlePan);
        document.addEventListener('mouseup', stopPan);

        // Event listeners para móviles
        maximizedImg.addEventListener('touchstart', startPan);
        document.addEventListener('touchmove', handlePan);
        document.addEventListener('touchend', stopPan);

        // Toggle zoom
        function toggleZoom() {
            if (!isZoomed) {
                // Activar zoom
                currentScale = 2.0;
                isZoomed = true;
                maximizedImg.classList.add('zoomed');
                maximizedImg.style.cursor = 'grab';
                console.log('🔍 Zoom activado - Puedes arrastrar la imagen');
            } else {
                // Desactivar zoom y resetear paneo
                currentScale = 1;
                isZoomed = false;
                translateX = 0;
                translateY = 0;
                maximizedImg.classList.remove('zoomed');
                maximizedImg.style.cursor = 'zoom-in';
                console.log('🔍 Zoom desactivado');
            }
            updateTransform();
        }

        // Cerrar con botón
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMaximizedMode();
        });

        // Cerrar haciendo clic fuera de la imagen
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeMaximizedMode();
            }
        });

        // Doble clic para zoom
        maximizedImg.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            toggleZoom();
        });

        // Double tap para móviles
        let lastTap = 0;
        maximizedImg.addEventListener('touchend', (e) => {
            if (isDragging) return;
            
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0) {
                toggleZoom();
                e.preventDefault();
            }
            lastTap = currentTime;
        });

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        // Efecto de entrada
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);

        // Guardar referencia para cerrar
        currentMaximizedOverlay = overlay;
    }

    // Cerrar modo maximizado - VERSIÓN CORREGIDA
    function closeMaximizedMode() {
        if (!isMaximized) return;
        
        console.log('📱 Cerrando modo maximizado');
        isMaximized = false;
        isZoomed = false;
        
        const overlay = document.querySelector('.maximized-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                startAutoSlide(); // Reanudar carrusel
            }, 300);
        }
        
        // Restaurar scroll
        document.body.style.overflow = '';
        currentMaximizedImage = null;
        currentMaximizedOverlay = null;
    }

    // Toggle zoom en modo maximizado
    function toggleZoom() {
        const maximizedImg = document.querySelector('.maximized-image');
        if (!maximizedImg) return;
        
        if (!isZoomed) {
            // Activar zoom
            maximizedImg.classList.add('zoomed');
            isZoomed = true;
            console.log('🔍 Zoom activado');
        } else {
            // Desactivar zoom
            maximizedImg.classList.remove('zoomed');
            isZoomed = false;
            console.log('🔍 Zoom desactivado');
        }
    }

    // 🆕 CORRECCIÓN: Asegurar que los botones de navegación sean visibles
    function actualizarVisibilidadBotones() {
        if (prevBtn && nextBtn) {
            // Mostrar botones siempre que haya más de una imagen
            if (totalSlides > 1) {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'block';
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }
    }

    // Función para siguiente slide automático
    function nextSlide() {
        if (totalSlides > 1) {
            goToSlide(currentSlide + 1);
        }
    }

    // Iniciar auto-desplazamiento
    function startAutoSlide() {
        if (totalSlides > 1 && !isMaximized) {
            autoSlideInterval = setInterval(nextSlide, 3000);
        }
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

    // 🆕 CORRECCIÓN: Event listeners mejorados para botones de navegación
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(currentSlide - 1);
            restartAutoSlide();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(currentSlide + 1);
            restartAutoSlide();
        });
    }

    // Event listeners para dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(index);
            restartAutoSlide();
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
            } else if (e.key === 'Escape' && isMaximized) {
                closeMaximizedMode();
            }
        }
    });

    // Swipe para móviles
    let startX = 0;

    if (carouselContainer) {
        carouselContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            stopAutoSlide();
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
            startAutoSlide();
        });

        // Pausar auto-desplazamiento cuando el mouse está sobre el carrusel
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
    }

    // 🆕 CORRECCIÓN: Asegurar visibilidad inicial de botones
    actualizarVisibilidadBotones();
    
    // Iniciar auto-desplazamiento
    startAutoSlide();
}

// =============================================
// INICIALIZACIÓN MEJORADA
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // 1. Configurar modo App/APK primero
    configurarModoApp();
    
    // 2. Inicializar EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(configContacto.proveedor.userId);
    }
    
    // 3. Cargar productos (ahora con carga progresiva)
    cargarProductos();
    
    // 4. Configurar eventos básicos
    configurarEventListeners();
    
    // 5. Configurar sistema de notificaciones
    configurarTrackingContacto();
    
    // 6. Configurar detección de conexión
    configurarDeteccionConexion();
    
    console.log('🚀 Catálogo iniciado con soporte para APK');
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
