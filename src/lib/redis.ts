import Redis from 'ioredis'

// Note: Redis connection is created during build but won't connect until runtime
// We accept this as Next.js build process may import this file
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  lazyConnect: true, // Don't connect until first command is issued
})

redis.on('error', (err) => {
  // Only log in runtime, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    console.error('Redis connection error:', err)
  }
})

redis.on('connect', () => {
  console.log('Redis connected successfully')
})

export default redis
