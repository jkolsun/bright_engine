import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/session'
import SiteEditorClient from '@/components/site-editor/SiteEditorClient'

export const dynamic = 'force-dynamic'

export default async function SiteEditorPage({ params }: { params: { id: string } }) {
  // Auth check
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      companyName: true,
      buildStep: true,
      previewId: true,
      siteHtml: true,
    },
  })

  if (!lead) return notFound()

  return (
    <SiteEditorClient
      leadId={lead.id}
      companyName={lead.companyName || 'Untitled Site'}
      buildStep={lead.buildStep || 'QA_REVIEW'}
      previewId={lead.previewId || ''}
      hasExistingHtml={!!lead.siteHtml}
      initialHtml={lead.siteHtml || ''}
    />
  )
}
