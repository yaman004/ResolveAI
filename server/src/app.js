import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: config.serveClient
        ? {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              'style-src': ["'self'", 'https:', "'unsafe-inline'"],
              'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
            },
          }
        : undefined,
    })
  );
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', globalLimiter, routes);
  app.use('/api', notFoundHandler);

  if (config.serveClient) {
    const dist = path.resolve(__dirname, '../../client/dist');
    if (fs.existsSync(dist)) {
      app.use(express.static(dist));
      app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    } else {
      console.warn('[server] SERVE_CLIENT=true but client/dist was not found. Run `npm run build` first.');
    }
  }

  app.use(errorHandler);
  return app;
}
