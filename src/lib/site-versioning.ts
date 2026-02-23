import { prisma } from './db'

const MAX_VERSIONS_PER_LEAD = 10

/**
 * Save a versioned backup of a lead's siteHtml.
 * Keeps the last MAX_VERSIONS_PER_LEAD versions; prunes the oldest when exceeded.
 * Returns the new version number.
 */
export async function saveSiteVersion(
  leadId: string,
  html: string,
  source: string
): Promise<number> {
  if (!html || html.length < 100) return 0

  // Get the current version counter
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { siteEditVersion: true },
  })
  const newVersion = (lead?.siteEditVersion ?? 0) + 1

  // Save the version + bump the counter atomically
  await prisma.$transaction([
    prisma.siteVersion.create({
      data: {
        leadId,
        html,
        source,
        version: newVersion,
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: { siteEditVersion: newVersion },
    }),
  ])

  // Prune old versions (keep only the latest MAX_VERSIONS_PER_LEAD)
  const allVersions = await prisma.siteVersion.findMany({
    where: { leadId },
    orderBy: { version: 'desc' },
    select: { id: true },
  })

  if (allVersions.length > MAX_VERSIONS_PER_LEAD) {
    const idsToDelete = allVersions.slice(MAX_VERSIONS_PER_LEAD).map(v => v.id)
    await prisma.siteVersion.deleteMany({
      where: { id: { in: idsToDelete } },
    })
  }

  return newVersion
}
