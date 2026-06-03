import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Redis connection URL
  // Format: redis://[:password@]host[:port][/db-number]
  // Example: redis://localhost:6379/0
  // Example with auth: redis://:mypassword@localhost:6379/0
  url: process.env.REDIS_URL || 'redis://localhost:6379',

  // Individual connection parameters (used if REDIS_URL is not set)
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // Enable/disable Redis for throttler storage
  // When false, falls back to in-memory storage
  enabled: process.env.REDIS_ENABLED === 'true',
}));
