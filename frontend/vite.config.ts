import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /ws van al servidor Spring Boot (puerto 8080).
// host: true abre el servidor a la red local para probar desde el celular (http://<ip-del-pc>:5173). El proxy
// presenta el origen localhost:5173, que ya esta en CORS_ORIGENES; en produccion no hay proxy y el navegador
// entra directo por el dominio del servidor.
const ORIGEN_LOCAL = 'http://localhost:5173';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', headers: { origin: ORIGEN_LOCAL } },
      '/ws': { target: 'ws://localhost:8080', ws: true, headers: { origin: ORIGEN_LOCAL } },
    },
  },
  build: { outDir: 'dist' },
});
