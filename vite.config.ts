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

/**
 * Cross-browser state sync relay (SSE + POST).
 * Connects Google Chrome (broadcaster dashboard) and OBS Studio CEF (browser source)
 * with zero-configuration and real-time live mirroring.
 */
const localSyncPlugin = (): Plugin => {
  const sseClients = new Set<any>();
  let latestState: Record<string, any> = {};

  return {
    name: 'vite-plugin-local-sync-relay',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';

        // 1. SSE Stream: Clients (OBS, browser tabs) connect here to listen for live state updates
        if (url === '/api/sync/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', payload: latestState })}\n\n`);
          sseClients.add(res);

          const cleanup = () => {
            sseClients.delete(res);
          };
          req.on('close', cleanup);
          res.on('close', cleanup);
          res.on('error', cleanup);
          return;
        }

        // 2. Broadcast endpoint: Any client sends an update here to sync with other browsers & OBS
        if (url === '/api/sync/broadcast' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const msg = JSON.parse(body || '{}');
              const { type, payload } = msg;

              // Cache latest critical state for newly connecting OBS sources
              if (type === 'CONTEST_UPDATED') {
                latestState.contest = payload;
              } else if (type === 'STATE_SNAPSHOT') {
                latestState = { ...latestState, ...payload };
              } else if (type === 'USERS_UPDATED') {
                latestState.users = payload;
              } else if (type === 'TWITCH_CONFIG_UPDATED') {
                latestState.twitch = payload;
              } else if (type === 'ACTIVE_STYLE_UPDATED') {
                latestState.style = payload;
              } else if (type === 'WINNER_CELEBRATION') {
                latestState.celebration = payload.celebrationData;
              } else if (type === 'CLOSE_CELEBRATION' || type === 'RESET_CONTEST') {
                delete latestState.celebration;
              } else if (type === 'ENGINE_UPDATED') {
                latestState.renderEngine = payload.engine;
              } else if (type === 'BUCKET_CONFIG_UPDATED') {
                latestState.bucketConfig = payload;
              }

              // Relay message immediately to all connected browsers & OBS
              const rawData = `data: ${JSON.stringify(msg)}\n\n`;
              for (const client of sseClients) {
                try {
                  if (client.writableEnded || client.destroyed) {
                    sseClients.delete(client);
                  } else {
                    client.write(rawData);
                  }
                } catch {
                  sseClients.delete(client);
                }
              }

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ success: true, clients: sseClients.size }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err?.message || 'Invalid JSON' }));
            }
          });
          return;
        }

        // 3. Current State Snapshot (REST)
        if (url === '/api/sync/state' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(latestState));
          return;
        }

        next();
      });
    },
  };
};

const isHttps = process.env.VITE_HTTPS === 'true' || process.argv.includes('--https');

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(isHttps ? [basicSsl()] : []),
    privateNetworkAccessPlugin(),
    localSyncPlugin(),
  ],
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
        dashboard: resolve(__dirname, 'dashboard.html'),
        obs: resolve(__dirname, 'obs.html'),
        testbench: resolve(__dirname, 'testbench.html'),
      },
    },
  },
})

