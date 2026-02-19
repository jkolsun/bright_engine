# TASK: Clients Tab Complete Overhaul

## Overview
The clients page (`src/app/admin/clients/page.tsx`) has several broken/incomplete areas. This task fixes all of them and adds missing functionality to make it a fully operational post-sale command center.

**File:** `src/app/admin/clients/page.tsx`
**API files already exist and work:**
- `src/app/api/clients/[id]/route.ts` — GET (detail w/ messages, revenue, commissions), PUT (update), DELETE (soft delete → CANCELLED)
- `src/app/api/clients/delete/route.ts` — POST bulk delete (⚠️ currently hard-deletes, not soft), DELETE single
- `src/app/api/clients/route.ts` — GET list (includes lead, rep, analytics, editRequests summary, _count), POST create
- `src/app/api/messages/route.ts` — POST create message (fields: `clientId`, `to`, `content`, `channel`, `senderType`)
- `src/app/api/edit-requests/[id]/route.ts` — PUT update status (approved/rejected/live)

**Est. Time:** 3–4 hours
**Dependencies:** None — all APIs already exist

---

## IMPORTANT: Paste the FULL existing `src/app/admin/clients/page.tsx` into context alongside this prompt.

---

## What's Broken (6 Issues)

### ISSUE 1: Chevron Arrow Does Nothing
**Problem:** The `expandedClient` state toggles (line ~665), but there's NO expanded `<tr>` rendered after the row. The chevron button sets `isExpanded` but nothing renders when `isExpanded === true`.

**Fix:** Add an expanded row `<tr>` immediately after the closing `</tr>` of each client row (before the closing of the `.map()` callback). The expanded row should show a quick-action panel inline:

```tsx
{/* After the closing </tr> of each client row, add: */}
{isExpanded && (
  <tr className="bg-gray-50/50">
    <td colSpan={viewMode === 'billing' ? 8 : 8} className="px-4 py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Quick Info */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase">Contact</div>
          {(client.phone || client.lead?.phone) && (
            <a href={`tel:${client.phone || client.lead?.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <Phone size={14} /> {client.phone || client.lead?.phone}
            </a>
          )}
          {(client.email || client.lead?.email) && (
            <a href={`mailto:${client.email || client.lead?.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <Mail size={14} /> {client.email || client.lead?.email}
            </a>
          )}
        </div>

        {/* Site Links */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase">Site</div>
          {client.siteUrl ? (
            <a href={client.siteUrl.startsWith('http') ? client.siteUrl : `https://${client.siteUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <ExternalLink size={14} /> Live Site
            </a>
          ) : <span className="text-sm text-gray-400">No site URL</span>}
          {client.stagingUrl && (
            <a href={client.stagingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-500 hover:underline">
              <Eye size={14} /> Staging
            </a>
          )}
          {client.lead?.previewUrl && (
            <a href={client.lead.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-500 hover:underline">
              <Eye size={14} /> Preview
            </a>
          )}
        </div>

        {/* Key Dates */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase">Dates</div>
          <div className="text-sm text-gray-600">Closed: {client.closedDate ? new Date(client.closedDate).toLocaleDateString() : new Date(client.createdAt).toLocaleDateString()}</div>
          {client.siteLiveDate && <div className="text-sm text-gray-600">Site Live: {new Date(client.siteLiveDate).toLocaleDateString()}</div>}
          {client.lastInteraction && <div className="text-sm text-gray-600">Last Contact: {new Date(client.lastInteraction).toLocaleDateString()}</div>}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase">Actions</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setViewMode('profile'); setProfileTab('overview') }}>
              <Eye size={14} className="mr-1" /> Full Profile
            </Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setViewMode('profile'); setProfileTab('messages') }}>
              <Mail size={14} className="mr-1" /> Messages
            </Button>
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.companyName) }}>
              <Trash2 size={14} className="mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Notes (if any) */}
      {client.notes && (
        <div className="mt-3 pt-3 border-t text-sm text-gray-600">
          <span className="font-medium text-gray-700">Notes:</span> {client.notes}
        </div>
      )}
    </td>
  </tr>
)}
```

**Also add `Trash2` to the existing lucide-react import at the top of the file** (line ~3):
```tsx
import { ..., Trash2 } from 'lucide-react'
```

> **Note:** `client.lead?.previewUrl` is available at list level because the GET `/api/clients` endpoint includes `lead` with selected fields. However, `previewUrl` is NOT in the current select — you may need to add it to the lead select in `src/app/api/clients/route.ts` (line ~111).

---

### ISSUE 2: No Delete Functionality
**Problem:** No delete button anywhere in the UI despite the API existing at `DELETE /api/clients/[id]` (soft delete → sets `hostingStatus: 'CANCELLED'`).

**Fix:** Add `handleDeleteClient` function alongside the existing handlers (near `handleUpdateClient`, `handleExportCSV`, etc.):

```tsx
const handleDeleteClient = async (clientId: string, companyName: string) => {
  if (!confirm(`Delete ${companyName}? This will mark them as cancelled.`)) return
  try {
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchClients()
      fetchOverviewStats()
      if (selectedClient?.id === clientId) {
        setSelectedClient(null)
        setViewMode('list')
      }
    } else {
      alert('Failed to delete client')
    }
  } catch (error) {
    console.error('Error deleting client:', error)
    alert('Failed to delete client')
  }
}
```

The DELETE endpoint at `/api/clients/[id]` already does a soft delete (sets hostingStatus to CANCELLED). This is the correct behavior.

**Also add a delete button inside the `ClientProfile` header area** (next to the status Badge, around line ~730):

```tsx
<div className="flex items-center gap-3">
  <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : 'destructive'}>{client.hostingStatus}</Badge>
  <Button size="sm" variant="destructive" onClick={() => {
    if (confirm(`Delete ${client.companyName}?`)) {
      fetch(`/api/clients/${client.id}`, { method: 'DELETE' }).then(res => {
        if (res.ok) onBack()
      })
    }
  }}>
    <Trash2 size={14} className="mr-1" /> Delete
  </Button>
</div>
```

---

### ISSUE 3: Bulk Delete for Selected Clients
**Problem:** When checkboxes are selected, the bulk action bar (line ~552) shows "Send Upsell", "Send Stat Report", "Change Tags" — but no delete. Also, all three existing buttons have **no onClick handlers** (they're non-functional placeholders).

**Fix:** Add a working delete button to the selected actions bar. Find the `selectedClients.size > 0` section (line ~552):

```tsx
{selectedClients.size > 0 && (
  <div className="mt-3 pt-3 border-t flex items-center gap-3">
    <span className="text-sm text-gray-600">{selectedClients.size} selected</span>
    <Button variant="outline" size="sm">Send Upsell</Button>
    <Button variant="outline" size="sm">Send Stat Report</Button>
    <Button variant="outline" size="sm">Change Tags</Button>
    <Button variant="destructive" size="sm" onClick={async () => {
      if (!confirm(`Delete ${selectedClients.size} client(s)? They will be marked as cancelled.`)) return
      try {
        const res = await fetch('/api/clients/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientIds: Array.from(selectedClients) })
        })
        if (res.ok) {
          setSelectedClients(new Set())
          fetchClients()
          fetchOverviewStats()
        }
      } catch (err) { console.error(err) }
    }}>
      <Trash2 size={14} className="mr-1" /> Delete Selected
    </Button>
  </div>
)}
```

> **⚠️ Important:** The bulk delete endpoint at `POST /api/clients/delete` currently does a **hard delete** (`prisma.client.deleteMany`), not a soft delete. The single-client `DELETE /api/clients/[id]` does a soft delete (CANCELLED). You may want to align the bulk endpoint to also do soft deletes by changing it to `updateMany({ data: { hostingStatus: 'CANCELLED' } })` instead. Update the confirm message accordingly.

---

### ISSUE 4: ClientProfile Messages Tab is a Stub
**Problem:** The messages, edit-requests, upsells, and stat-reports tabs (line ~913) all just say "View full ___ in the dedicated tab above." — they render no actual content.

**Fix:** Replace the stub block for messages with actual content. The current stub is:
```tsx
{['messages', 'edit-requests', 'upsells', 'stat-reports'].includes(profileTab) && (
  <Card className="p-6">
    <h3>...</h3>
    <p>View full {profileTab} in the dedicated tab above.</p>
  </Card>
)}
```

Break this into separate blocks. First, the **messages tab**:

```tsx
{profileTab === 'messages' && (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-gray-900">Messages</h3>
      <span className="text-sm text-gray-500">{client.messages?.length || 0} messages</span>
    </div>
    {(!client.messages || client.messages.length === 0) ? (
      <p className="text-sm text-gray-500">No messages yet.</p>
    ) : (
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {(client.messages || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((msg: any) => {
          const isOutbound = msg.direction === 'OUTBOUND'
          const isAi = msg.senderType === 'CLAWDBOT' || msg.aiGenerated
          return (
            <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isOutbound ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">{isOutbound ? (isAi ? 'AI' : 'You') : contact?.split(' ')[0] || 'Client'}</span>
                  <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {isAi && msg.aiDelaySeconds && <span className="text-xs text-blue-500">[auto — {msg.aiDelaySeconds}s]</span>}
                </div>
                <div className="text-sm text-gray-800">{msg.content}</div>
                {msg.escalated && <div className="mt-1 text-xs text-orange-600">Escalated{msg.escalationReason ? `: ${msg.escalationReason}` : ''}</div>}
              </div>
            </div>
          )
        })}
      </div>
    )}

    {/* Quick Send */}
    <div className="mt-4 pt-4 border-t">
      <QuickSendMessage clientId={client.id} phone={phone} onSent={() => {
        fetch(`/api/clients/${client.id}`).then(r => r.json()).then(data => {
          if (data.client) setClient({ ...client, ...data.client })
        })
      }} />
    </div>
  </Card>
)}
```

You'll need to create a `QuickSendMessage` sub-component (place it at the bottom of the file, before the exports):

```tsx
function QuickSendMessage({ clientId, phone, onSent }: { clientId: string; phone: string; onSent: () => void }) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!msg.trim() || !phone) return
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, content: msg, clientId, channel: 'SMS', senderType: 'ADMIN' })
      })
      setMsg('')
      onSent()
    } catch (err) { console.error(err) }
    setSending(false)
  }

  return (
    <div className="flex gap-2">
      <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={phone ? 'Type a message...' : 'No phone number'} disabled={!phone}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} className="flex-1" />
      <Button onClick={send} disabled={sending || !msg.trim() || !phone}>{sending ? 'Sending...' : 'Send SMS'}</Button>
    </div>
  )
}
```

> **API field mapping:** The messages POST endpoint at `/api/messages` expects `{ content, clientId, to, channel, senderType }` — NOT `{ message, sender }`. The QuickSendMessage component above uses the correct field names.

---

### ISSUE 5: Edit-Requests Tab is a Stub
**Fix:** Replace with real edit request list:

```tsx
{profileTab === 'edit-requests' && (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-gray-900">Edit Requests</h3>
      <span className="text-sm text-gray-500">{client.editRequests?.length || 0} requests</span>
    </div>
    {(!client.editRequests || client.editRequests.length === 0) ? (
      <p className="text-sm text-gray-500">No edit requests yet.</p>
    ) : (
      <div className="space-y-3">
        {client.editRequests.map((req: any) => (
          <div key={req.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  req.status === 'live' ? 'bg-green-100 text-green-700' :
                  req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  req.status === 'ready_for_review' ? 'bg-amber-100 text-amber-700' :
                  req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{req.status}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  req.complexityTier === 'simple' ? 'bg-green-50 text-green-600' :
                  req.complexityTier === 'complex' ? 'bg-red-50 text-red-600' :
                  'bg-yellow-50 text-yellow-600'
                }`}>{req.complexityTier}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-800 mb-1">{req.requestText}</p>
            {req.aiInterpretation && <p className="text-xs text-gray-500 italic">AI: {req.aiInterpretation}</p>}
            {req.status === 'ready_for_review' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => fetch(`/api/edit-requests/${req.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) }).then(() => {
                  fetch(`/api/clients/${client.id}`).then(r => r.json()).then(data => { if (data.client) setClient({ ...client, ...data.client }) })
                })}>
                  <CheckCircle size={14} className="mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => fetch(`/api/edit-requests/${req.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) }).then(() => {
                  fetch(`/api/clients/${client.id}`).then(r => r.json()).then(data => { if (data.client) setClient({ ...client, ...data.client }) })
                })}>
                  <X size={14} className="mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </Card>
)}
```

> **API dependency:** The `GET /api/clients/[id]` detail endpoint currently does NOT include `editRequests` in its Prisma `include`. You must add this to `src/app/api/clients/[id]/route.ts` (line ~20):
> ```ts
> editRequests: {
>   orderBy: { createdAt: 'desc' },
>   take: 50
> },
> ```

---

### ISSUE 6: Billing Tab is a Stub
**Problem:** The billing tab (line ~867) only shows plan, Stripe IDs, hosting status, and est. LTV in a simple key-value list. No revenue history, no payment records, no commissions.

**Fix:** Replace with full billing/revenue view:

```tsx
{profileTab === 'billing' && (
  <Card className="p-6">
    <h3 className="font-semibold text-gray-900 mb-4">Billing & Revenue</h3>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Monthly Revenue</div>
          <div className="text-2xl font-bold">{formatCurrency(client.monthlyRevenue)}<span className="text-sm text-gray-400">/mo</span></div>
          <div className="text-xs text-gray-400 mt-1">Plan: {(client.plan || 'base').charAt(0).toUpperCase() + (client.plan || 'base').slice(1)}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Stripe Status</div>
          <div className={`text-lg font-semibold ${client.stripeCustomerId ? 'text-green-600' : 'text-gray-400'}`}>
            {client.stripeCustomerId ? 'Connected' : 'Not linked'}
          </div>
          {client.stripeCustomerId && <div className="text-xs text-gray-400 mt-1 truncate">ID: {client.stripeCustomerId}</div>}
        </div>
      </div>

      {/* Revenue History */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Revenue History</h4>
        {(!client.revenue || client.revenue.length === 0) ? (
          <p className="text-sm text-gray-500">No revenue records yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Product</th>
                  <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {client.revenue.map((rev: any) => (
                  <tr key={rev.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{new Date(rev.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">{rev.type.replace(/_/g, ' ')}</td>
                    <td className="p-3">{rev.product || '—'}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(rev.amount)}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${rev.status === 'PAID' ? 'bg-green-100 text-green-700' : rev.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{rev.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commissions */}
      {client.commissions && client.commissions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Commissions</h4>
          <div className="space-y-2">
            {client.commissions.map((comm: any) => (
              <div key={comm.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <span className="text-sm font-medium">{comm.type.replace(/_/g, ' ')}</span>
                  {comm.rep && <span className="text-xs text-gray-500 ml-2">→ {comm.rep.name}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(comm.amount)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    comm.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    comm.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{comm.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </Card>
)}
```

> **Data available:** `client.revenue` and `client.commissions` (with `comm.rep.name`) are both included in the `GET /api/clients/[id]` detail endpoint response. `formatCurrency` is already imported from `@/lib/utils` (line ~16).

---

## Additional Enhancement: Inline Edit in Overview Tab

The existing overview tab (line ~780) shows static details with a tags section and notes section. Make notes and tags editable inline.

In the `ClientProfile` component, add these state variables:

```tsx
const [noteInput, setNoteInput] = useState(client.notes || '')
const [tagInput, setTagInput] = useState('')
const [editingOverview, setEditingOverview] = useState(false)
```

Then update the overview tab to include:

```tsx
{profileTab === 'overview' && (
  <div className="space-y-6">
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Details</h3>
        <Button size="sm" variant="outline" onClick={() => setEditingOverview(!editingOverview)}>
          <Edit3 size={14} className="mr-1" /> {editingOverview ? 'Cancel' : 'Edit'}
        </Button>
      </div>
      {/* ... existing detail grid ... */}
    </Card>

    {/* Notes Card — make editable */}
    <Card className="p-6">
      <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
      <textarea
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        className="w-full border rounded-lg p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Add notes about this client..."
      />
      {noteInput !== (client.notes || '') && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => { onUpdate({ notes: noteInput }) }}>Save Notes</Button>
          <Button size="sm" variant="outline" onClick={() => setNoteInput(client.notes || '')}>Cancel</Button>
        </div>
      )}
    </Card>

    {/* Tags Card — make editable */}
    <Card className="p-6">
      <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {(client.tags || []).map((tag: string) => (
          <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
            {tag}
            <button className="text-gray-400 hover:text-red-500" onClick={() => {
              onUpdate({ tags: (client.tags || []).filter((t: string) => t !== tag) })
            }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              onUpdate({ tags: [...(client.tags || []), tagInput.trim()] })
              setTagInput('')
            }
          }} className="max-w-[200px]" />
        <Button size="sm" variant="outline" disabled={!tagInput.trim()} onClick={() => {
          onUpdate({ tags: [...(client.tags || []), tagInput.trim()] })
          setTagInput('')
        }}>Add</Button>
      </div>
    </Card>
  </div>
)}
```

> **Note:** The existing overview tab already has a tags section and notes section. Merge the editable versions above into the existing code rather than duplicating.

---

## Required: Fetch Full Client Data on Profile Open

The existing code passes the list-level client object to `ClientProfile`, which does NOT include `messages`, `revenue`, `commissions`, or full `editRequests` — the `GET /api/clients` list endpoint only includes summary counts (`_count.messages`, `_count.editRequests`) and `editRequests` with just `{ id, status }`.

**Fix:** In `ClientProfile`, add a fetch on mount to get full detail data:

```tsx
function ClientProfile({ client: initialClient, onBack, onUpdate, profileTab, setProfileTab }: any) {
  const [client, setClient] = useState(initialClient)
  const [loadingDetail, setLoadingDetail] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/clients/${initialClient.id}`)
        if (res.ok) {
          const data = await res.json()
          setClient({ ...initialClient, ...data.client })
        }
      } catch (err) { console.error(err) }
      setLoadingDetail(false)
    }
    fetchDetail()
  }, [initialClient.id])

  // Rest of component uses `client` (which now has full data including messages, revenue, commissions)
  // The `contact`, `phone`, `email`, `location` variables derived from `client` will auto-update
  // ...
}
```

This way the profile view has messages, revenue, commissions, and editRequests data from the detail endpoint.

> **Also update `GET /api/clients/[id]`** in `src/app/api/clients/[id]/route.ts` to include `editRequests`:
> ```ts
> include: {
>   lead: true,
>   analytics: true,
>   messages: { orderBy: { createdAt: 'desc' }, take: 50 },
>   editRequests: { orderBy: { createdAt: 'desc' }, take: 50 },  // ADD THIS
>   commissions: { include: { rep: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
>   revenue: { orderBy: { createdAt: 'desc' }, take: 50 },
> }
> ```

---

## Summary of Changes

| Issue | Fix | Location |
|-------|-----|----------|
| Chevron does nothing | Add expanded `<tr>` with contact, site links, dates, quick actions | After each client row `</tr>` |
| No delete button | Add `handleDeleteClient()` + delete buttons in expanded row + profile header | Main component + ClientProfile |
| No bulk delete | Add "Delete Selected" to bulk action bar | `selectedClients.size > 0` block |
| Messages tab stub | Replace with real message list + `QuickSendMessage` component | ClientProfile messages block |
| Edit-requests tab stub | Replace with real edit queue with approve/reject | ClientProfile edit-requests block |
| Billing tab stub | Replace with revenue table + commissions list | ClientProfile billing block |
| Profile lacks full data | Add `useEffect` fetch on mount for detail endpoint | ClientProfile component |
| Notes not saveable | Make notes textarea with save/cancel | Overview tab |
| Tags not editable | Add/remove tags inline | Overview tab |
| Detail endpoint missing editRequests | Add `editRequests` to Prisma include | `src/app/api/clients/[id]/route.ts` |
| Lead previewUrl not in list query | Add `previewUrl: true` to lead select | `src/app/api/clients/route.ts` |

**Total: ~365 lines of new/changed code across 3 files**

---

## Files to Modify

1. **`src/app/admin/clients/page.tsx`** — Main changes (expanded row, delete, profile tabs, QuickSendMessage)
2. **`src/app/api/clients/[id]/route.ts`** — Add `editRequests` to include
3. **`src/app/api/clients/route.ts`** — Add `previewUrl: true` to lead select (line ~111)

---

## Verify Before Moving On

- [ ] Chevron arrow toggles an expanded row with contact, site links, dates, and action buttons
- [ ] Expanded row has "Full Profile", "Messages", and "Delete" buttons that work
- [ ] Delete button in expanded row works (soft delete → CANCELLED)
- [ ] Delete button in ClientProfile header works
- [ ] Bulk delete with checkboxes works via `POST /api/clients/delete`
- [ ] Clicking company name still opens full ClientProfile
- [ ] ClientProfile fetches full data on mount (messages, revenue, commissions, editRequests)
- [ ] Messages tab shows real message history with outbound/inbound styling
- [ ] Messages tab has working Send SMS input (correct API fields: `content`, `channel`, `senderType`)
- [ ] AI messages show indicator and delay seconds
- [ ] Escalated messages show warning
- [ ] Edit-requests tab shows real requests with status + complexity badges
- [ ] Edit-requests tab has Approve/Reject buttons for `ready_for_review` items
- [ ] Billing tab shows monthly revenue, Stripe status, revenue history table
- [ ] Billing tab shows commissions with rep name
- [ ] Notes save and persist via `PUT /api/clients/[id]`
- [ ] Tags add and remove via `PUT /api/clients/[id]`
- [ ] Overview tab has Edit button
- [ ] No TypeScript errors
- [ ] Existing functionality unchanged (Add Client dialog, Export CSV, search, filters, view modes, edit queue, upsells, sequences, referrals)
