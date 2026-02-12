import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatPhone } from '@/lib/utils'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  ExternalLink,
  MessageSquare,
  Activity
} from 'lucide-react'
import Link from 'next/link'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: true,
      events: {
        orderBy: { createdAt: 'desc' },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
      },
      activities: {
        include: {
          rep: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      },
      client: true
    }
  })

  if (!lead) {
    notFound()
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h1>
            <StatusBadge status={lead.status} />
            {lead.priority === 'HOT' && (
              <Badge variant="destructive">HOT</Badge>
            )}
          </div>
          <p className="text-lg text-gray-600">{lead.companyName}</p>
        </div>
        <div className="flex gap-2">
          {lead.previewUrl && (
            <Link href={lead.previewUrl} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink size={16} className="mr-2" />
                View Preview
              </Button>
            </Link>
          )}
          <Button size="sm">Send SMS</Button>
          <Button variant="outline" size="sm">Edit</Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem 
                  icon={<Phone size={18} />}
                  label="Phone"
                  value={formatPhone(lead.phone)}
                  href={`tel:${lead.phone}`}
                />
                {lead.email && (
                  <InfoItem 
                    icon={<Mail size={18} />}
                    label="Email"
                    value={lead.email}
                    href={`mailto:${lead.email}`}
                  />
                )}
                {lead.enrichedAddress && (
                  <InfoItem 
                    icon={<MapPin size={18} />}
                    label="Address"
                    value={lead.enrichedAddress}
                  />
                )}
                <InfoItem 
                  icon={<MapPin size={18} />}
                  label="Location"
                  value={`${lead.city}, ${lead.state}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Enriched Data */}
          {lead.enrichedServices && (
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(lead.enrichedServices as string[]).map((service, i) => (
                    <Badge key={i} variant="outline">{service}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lead.events.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          {lead.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lead.messages.map((message) => (
                    <MessageItem key={message.id} message={message} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Key Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Industry" value={lead.industry.replace('_', ' ')} />
              <DetailRow label="Source" value={lead.source} />
              {lead.sourceDetail && (
                <DetailRow label="Source Detail" value={lead.sourceDetail} />
              )}
              {lead.assignedTo && (
                <DetailRow label="Assigned To" value={lead.assignedTo.name} />
              )}
              <DetailRow 
                label="Created" 
                value={new Date(lead.createdAt).toLocaleDateString()} 
              />
              {lead.previewExpiresAt && (
                <DetailRow 
                  label="Preview Expires" 
                  value={new Date(lead.previewExpiresAt).toLocaleDateString()} 
                />
              )}
            </CardContent>
          </Card>

          {/* Enrichment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Enrichment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <EnrichmentStatus 
                label="Address" 
                status={!!lead.enrichedAddress} 
              />
              <EnrichmentStatus 
                label="Photos" 
                status={!!lead.enrichedPhotos} 
              />
              <EnrichmentStatus 
                label="Services" 
                status={!!lead.enrichedServices} 
              />
              <EnrichmentStatus 
                label="Reviews" 
                status={!!lead.enrichedReviews} 
              />
              <EnrichmentStatus 
                label="Personalization" 
                status={!!lead.personalization} 
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone size={16} className="mr-2" />
                Call Lead
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare size={16} className="mr-2" />
                Send SMS
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Mail size={16} className="mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, any> = {
    NEW: 'outline',
    HOT_LEAD: 'destructive',
    QUALIFIED: 'info',
    INFO_COLLECTED: 'info',
    BUILDING: 'warning',
    QA: 'warning',
    CLIENT_REVIEW: 'warning',
    APPROVED: 'success',
    PAID: 'success',
  }

  return (
    <Badge variant={variants[status] || 'default'}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

function InfoItem({ 
  icon, 
  label, 
  value, 
  href 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="block hover:bg-gray-50 -m-2 p-2 rounded transition-colors">
        {content}
      </a>
    )
  }

  return content
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function EnrichmentStatus({ label, status }: { label: string, status: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <Badge variant={status ? 'success' : 'outline'} className="text-xs">
        {status ? 'Complete' : 'Pending'}
      </Badge>
    </div>
  )
}

function TimelineItem({ event }: { event: any }) {
  const getIcon = () => {
    switch (event.eventType) {
      case 'PREVIEW_VIEWED':
        return <ExternalLink size={16} />
      case 'EMAIL_SENT':
      case 'EMAIL_OPENED':
        return <Mail size={16} />
      case 'TEXT_SENT':
      case 'TEXT_RECEIVED':
        return <MessageSquare size={16} />
      default:
        return <Activity size={16} />
    }
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {event.eventType.replace('_', ' ')}
        </p>
        {event.toStage && (
          <p className="text-sm text-gray-600">→ {event.toStage.replace('_', ' ')}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {new Date(event.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

function MessageItem({ message }: { message: any }) {
  const isInbound = message.direction === 'INBOUND'

  return (
    <div className={`p-3 rounded-lg ${isInbound ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-900">
          {isInbound ? 'Client' : message.sender}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-sm text-gray-700">{message.content}</p>
      {message.escalated && (
        <Badge variant="destructive" className="mt-2 text-xs">
          Escalated: {message.escalationReason}
        </Badge>
      )}
    </div>
  )
}
