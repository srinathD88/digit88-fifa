import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fifa';
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 60000,
    keepAlive: true,
  });
  // Prevent unhandled errors when the cloud pooler closes idle connections
  pool.on('error', (err) => {
    console.error('[pg.Pool] idle connection error (will reconnect on next query):', err.message);
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
