import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL

const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })

redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Redis connection error:', err)
  }
})

redis.on('connect', () => {
  console.log('Redis connected successfully')
})

export default redis
