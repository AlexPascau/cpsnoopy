// drive-config.js - Para sistema dinámico
const GOOGLE_DRIVE_CONFIG = {
    // 🔗 URL del JSON principal
    // https://drive.google.com/file/d/16dIrjnuDWYU6HbF8-4UVOnWT-X3HS8b6/view?usp=drive_link
    // https://drive.google.com/file/d/16dIrjnuDWYU6HbF8-4UVOnWT-X3HS8b6/view?usp=drive_link
    productsJsonUrl: 'https://drive.google.com/uc?export=download&id=16dIrjnuDWYU6HbF8-4UVOnWT-X3HS8b6',
    
    // 🖼️ Nueva Base URL que SI funciona para embedding
    baseImageUrl: 'https://lh3.googleusercontent.com/d/',
    
    // ⚙️ Configuración
    cacheDuration: 30 * 60 * 1000,
    retryAttempts: 3
};

/**
 * Construye URL para imagen usando ID de Google Drive
 * ESTA VERSIÓN SÍ FUNCIONA para mostrar imágenes en la web
 */
function buildImageUrl(fileId) {
    if (!fileId || fileId === 'undefined' || fileId.includes('undefined')) {
        console.warn('❌ fileId inválido para imagen:', fileId);
        return './images/placeholder.jpg';
    }
    
    // Limpiar el fileId
    const cleanFileId = fileId.trim();
    
    // ✅ URL que SÍ funciona para embedding
    const url = `${GOOGLE_DRIVE_CONFIG.baseImageUrl}${cleanFileId}`;
    
    //console.log(`🖼️ URL generada para ${cleanFileId}:`, url);
    return url;
}

/**
 * Obtiene la URL del JSON
 */
function getProductsJsonUrl() {
    return GOOGLE_DRIVE_CONFIG.productsJsonUrl;
}