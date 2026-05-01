import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback/google',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || 'change-me-in-production',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // MongoDB connection parts (password comes from separate secret)
  mongodbHost: process.env.MONGODB_HOST || 'localhost',
  mongodbPort: parseInt(process.env.MONGODB_PORT, 10) || 27017,
  mongodbDatabase: process.env.MONGODB_DATABASE || 'ai-knowledge-ops',
  mongodbUser: process.env.MONGODB_USER || '',
  mongodbPassword: process.env.MONGODB_PASSWORD || '',
}));
