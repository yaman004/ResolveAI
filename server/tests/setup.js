// Runs before every test file: configure the environment before the app's config module loads.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/resolveai-test-placeholder';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.BCRYPT_ROUNDS = '4';
process.env.AI_API_KEY = '';
process.env.CLIENT_URL = 'http://localhost:5173';
