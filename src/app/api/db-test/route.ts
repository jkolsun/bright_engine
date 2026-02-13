import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection with a simple query
    const result = await prisma.$queryRaw`SELECT NOW() as timestamp`
    
    return Response.json({
      status: 'ok',
      message: 'Database connected',
      result: result,
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
