import { resolve } from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Satisfies Chrome's Private Network Access (PNA) / Local Network Access (LNA) specification
 * when public websites (twitch.tv) load local development iframes (localhost:5173).
 */
const privateNetworkAccessPlugin = (): Plugin => ({
  name: 'vite-plugin-private-network-access',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      next();
    });
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), basicSsl(), privateNetworkAccessPlugin()],
  server: {
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['*'],
      exposedHeaders: ['Access-Control-Allow-Private-Network'],
      preflightContinue: false,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        panel: resolve(__dirname, 'panel.html'),
        config: resolve(__dirname, 'config.html'),
        viewer: resolve(__dirname, 'viewer.html'),
      },
    },
  },
})

