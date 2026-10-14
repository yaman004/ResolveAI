import { config } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  try {
    await connectDb();
    console.log('[db] connected to MongoDB');
  } catch (err) {
    console.error(`[db] could not connect to MongoDB at the configured MONGODB_URI: ${err.message}`);
    console.error('     Start a local MongoDB (or set a MongoDB Atlas URI in .env) and try again.');
    process.exit(1);
  }
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] ResolveAI API listening on http://localhost:${config.port} (${config.env})`);
    if (!config.ai.apiKey) console.log('[ai] AI_API_KEY not set: AI reply suggestions are disabled (the rest of the app works normally).');
  });
  const shutdown = async () => {
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
