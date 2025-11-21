// app.js - Con solución para CORS de Google Drive
let productos = [];
let productoActual = null;

// =============================================
// CONFIGURACIÓN DE CONTACTO
// =============================================
const configContacto = {
    telefono: "+584126597297",
    whatsapp: "584126597297", 
    email: "ramonsimancas61@gmail.com",
    mensajeWhatsapp: "Hola, me interesan sus artículos del catálogo",
    
    proveedor: {
        email: "intelligere360@gmail.com",
        serviceId: "service_n6cbbge",
        templateId: "template_qx7z8s9", 
        userId: "hzEWYG4E0PQlhs2e_"
    }
};

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

// Procesar imágenes para un producto
async function procesarImagenesProducto(producto) {
    const imageCount = producto.imageCount || 1;
    const images = [];
    
    for (let i = 1; i <= imageCount; i++) {
        const imageId = `${producto.id}_${i}`;
        const imageUrl = `https://drive.google.com/uc?export=view&id=${imageId}`;
        
        images.push({
            id: imageId,
            url: imageUrl,
            main: i === 1,
            index: i
        });
    }
    
    return images;
}

// Obtener imagen principal
async function obtenerImagenPrincipal(producto) {
    if (producto.imagenes && producto.imagenes.length > 0) {
        return producto.imagenes[0].url;
    }
    return `https://drive.google.com/uc?export=view&id=${producto.id}_1`;
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
                ${producto.imagenes && producto.imagenes.length > 1 ? `
                    <div class="image-badge">${producto.imagenes.length} 📷</div>
                ` : ''}
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
    
    productoActual = producto;
    
    const modalContent = document.getElementById('modalContent');
    
    // Generar slider de imágenes simple
    const imageSlider = producto.imagenes && producto.imagenes.length > 0 ? 
        producto.imagenes.map(img => `
            <div class="product-image-detail">
                <img src="${img.url}" alt="${producto.nombre}" 
                     onerror="this.src='./images/placeholder.jpg'">
            </div>
        `).join('') : 
        `<div class="no-image">Imagen no disponible</div>`;
    
    modalContent.innerHTML = `
        <div class="product-detail">
            <div class="detail-images">
                ${imageSlider}
            </div>
            <div class="detail-info">
                <h2>${producto.nombre}</h2>
                <p class="product-category">${producto.categoria}</p>
                <p class="product-price">$${producto.precio.toFixed(2)}</p>
                <p class="product-description">${producto.descripcion}</p>
                ${producto.especificaciones ? `
                    <div class="product-specs">
                        <h4>Especificaciones:</h4>
                        <p>${producto.especificaciones.replace(/; /g, '<br>• ')}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Actualizar enlaces de contacto
    const mensaje = `Hola, me interesa: ${producto.nombre} - $${producto.precio.toFixed(2)}`;
    const urlWhatsapp = `https://wa.me/${configContacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    document.getElementById('whatsappModal').href = urlWhatsapp;
    
    document.getElementById('productModal').style.display = 'block';
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(configContacto.proveedor.userId);
    }
    
    // Cargar productos
    cargarProductos();
    
    // Configurar eventos básicos
    configurarEventListeners();
    
    console.log('🚀 Catálogo iniciado');
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
