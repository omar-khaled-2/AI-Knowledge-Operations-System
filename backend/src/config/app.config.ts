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
  // S3 configuration
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  // RabbitMQ configuration
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE || 'documents',
  rabbitmqDocumentQueue: process.env.RABBITMQ_DOCUMENT_QUEUE || 'document-jobs',
  rabbitmqEmbeddingQueue: process.env.RABBITMQ_EMBEDDING_QUEUE || 'embedding-jobs',
  // Redis configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD || '',
  wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) || 30000,
  wsRedisTtl: parseInt(process.env.WS_REDIS_TTL, 10) || 300,
}));
