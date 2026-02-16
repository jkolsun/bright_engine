import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

// Auto-start workers on first import (runs once)
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  console.log('[DB Auto-start] Attempting to start workers via db.ts import...')
  import('../worker/worker-manager').then(mod => {
    console.log('[DB Auto-start] Worker manager loaded, calling startWorkersOnce...')
    mod.startWorkersOnce().catch(e => console.warn('[Auto] Worker boot failed:', e))
  }).catch(e => console.warn('[DB Auto-start] Failed to import worker manager:', e))
}

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
