#!/usr/bin/env python3
"""
Servidor local para Windows - PWA Testing
"""
import http.server
import socketserver
import webbrowser
import os
import sys

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    
    def end_headers(self):
        # Headers para CORS y PWA
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Manejar preflight requests
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Log personalizado
        print(f"🌐 {self.address_string()} - {format % args}")

def main():
    PORT = 8000
    
    # Obtener directorio actual de forma segura para Windows
    try:
        web_dir = os.getcwd()
        print(f"📁 Directorio actual: {web_dir}")
        
        # Verificar que existe index.html
        index_path = os.path.join(web_dir, 'index.html')
        if not os.path.exists(index_path):
            print(f"❌ ERROR: No se encuentra index.html en {web_dir}")
            print("💡 Asegúrate de ejecutar el script desde la carpeta de tu proyecto PWA")
            input("Presiona Enter para salir...")
            return
            
        os.chdir(web_dir)
        print(f"✅ Directorio cambiado correctamente a: {web_dir}")
        
    except Exception as e:
        print(f"❌ Error accediendo al directorio: {e}")
        input("Presiona Enter para salir...")
        return
    
    try:
        with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
            print(f"🚀 Servidor PWA ejecutándose en: http://localhost:{PORT}")
            print("📂 Sirviendo archivos desde:", web_dir)
            print("⚡ Presiona Ctrl+C para detener el servidor")
            print("-" * 50)
            
            # Verificar archivos importantes
            important_files = ['index.html', 'manifest.json', 'sw.js', 'css/style.css', 'js/app.js']
            for file in important_files:
                if os.path.exists(file):
                    print(f"✅ {file} - OK")
                else:
                    print(f"⚠️  {file} - NO ENCONTRADO")
            
            print("-" * 50)
            
            # Abrir navegador automáticamente
            try:
                webbrowser.open(f'http://localhost:{PORT}')
                print("🌐 Navegador abierto automáticamente")
            except:
                print("💡 Abre manualmente: http://localhost:8000")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n🛑 Servidor detenido por el usuario")
                
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ El puerto {PORT} ya está en uso")
            print("💡 Cierra otros servidores o usa: python server.py 8080")
        else:
            print(f"❌ Error del servidor: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    # Permitir puerto personalizado
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except:
            PORT = 8000
    else:
        PORT = 8000
        
    main()