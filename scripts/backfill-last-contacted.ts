/**
 * One-time backfill script: sets lastContactedAt on all leads
 * that have existing DialerCall records.
 *
 * Run with: npx ts-node scripts/backfill-last-contacted.ts
 * Idempotent — only updates leads where last_contacted_at IS NULL.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[Backfill] Starting lastContactedAt backfill...')

  const result = await prisma.$executeRawUnsafe(`
    UPDATE leads
    SET last_contacted_at = sub.max_started
    FROM (
      SELECT lead_id, MAX(started_at) as max_started
      FROM dialer_calls
      GROUP BY lead_id
    ) sub
    WHERE leads.id = sub.lead_id
    AND leads.last_contacted_at IS NULL
  `)

  console.log(`[Backfill] Updated ${result} leads with lastContactedAt from their most recent DialerCall.`)
}

main()
  .catch((err) => {
    console.error('[Backfill] Error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
