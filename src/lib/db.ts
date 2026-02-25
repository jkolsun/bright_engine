import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Append connection pool limits to DATABASE_URL if not already present
function getPooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return url
  if (url.includes('connection_limit')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}connection_limit=10&pool_timeout=10`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: { db: { url: getPooledUrl() } },
  })

// Workers are now handled by the dedicated worker service (npm run worker)
// Do NOT auto-start workers in the web process — it causes SIGSEGV crashes

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
