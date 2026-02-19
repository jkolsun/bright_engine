# TASK 8: Entry Point 4 — Preview CTA Banner + Endpoint

## Overview
Add a sticky "Get This Site Live — $149/month" banner to the preview page. Clicking it does NOT go to Stripe — it triggers the Close Engine so Claude qualifies the lead first.

**Files:** `src/app/preview/[id]/page.tsx` (MODIFY) + `src/app/api/preview/cta-click/route.ts` (NEW)
**Est. Time:** 1.5 hours
**Dependencies:** Task 5 (close-engine.ts must exist)

---

## IMPORTANT: Paste the existing preview page into Claude Code alongside this prompt.

---

## What To Do

### FILE 1: `src/app/api/preview/cta-click/route.ts` (NEW)

Create a PUBLIC POST endpoint (no auth required — called from the preview page):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { previewId } = await request.json();
    
    if (!previewId) {
      return NextResponse.json({ error: 'previewId required' }, { status: 400 });
    }
    
    // Find lead by previewId
    const lead = await prisma.lead.findUnique({
      where: { previewId },
    });
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    
    // Rate limit: Skip if CTA already clicked in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentClick = await prisma.previewAnalytics.findFirst({
      where: {
        previewId,
        event: 'cta_click',
        createdAt: { gte: oneHourAgo },
      },
    });
    
    // Always log the click event
    await prisma.previewAnalytics.create({
      data: {
        previewId,
        event: 'cta_click',
      },
    });
    
    // Only trigger Close Engine if not recently clicked
    if (!recentClick) {
      // Update lead priority to HOT
      await prisma.lead.update({
        where: { id: lead.id },
        data: { priority: 'HOT' },
      });
      
      // Create notification
      await prisma.notification.create({
        data: {
          type: 'HOT_LEAD',
          title: 'Preview CTA Clicked!',
          message: `${lead.firstName} at ${lead.companyName} clicked "Get This Site Live" on their preview!`,
          metadata: { leadId: lead.id, previewId, source: 'preview_cta' },
        },
      });
      
      // Trigger Close Engine
      try {
        const { triggerCloseEngine } = await import('@/lib/close-engine');
        await triggerCloseEngine({
          leadId: lead.id,
          entryPoint: 'PREVIEW_CTA',
        });
      } catch (err) {
        console.error('[Preview CTA] Close Engine trigger failed:', err);
        // Don't fail the response
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Preview CTA] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### FILE 2: `src/app/preview/[id]/page.tsx` (MODIFY)

Add a sticky CTA banner at the bottom of the preview page:

**Banner component to add:**
- Sticky to bottom of viewport (`fixed bottom-0 left-0 right-0 z-50`)
- Teal background (`bg-[#0D7377]`), white text
- Left side: "Get This Site Live — $149/month"
- Right side: "Get Started" button (white bg, teal text, rounded)
- Small X button to dismiss (top-right corner)
- Dismissal stored in `sessionStorage` so it re-shows on new visits

**On "Get Started" click:**
1. POST to `/api/preview/cta-click` with `{ previewId }`
2. Replace banner content with confirmation: "Thank you for your interest! A team member will reach out shortly." with a checkmark icon
3. Auto-dismiss after 5 seconds

**Styling notes:**
- Banner should not overlap the existing "Call Now" or "Get Started" buttons in the preview content
- Add `pb-16` (padding bottom) to the main content container so the banner doesn't cover the footer
- Mobile responsive: stack text and button vertically on small screens

---

## Verify Before Moving On

- [ ] CTA banner visible on preview page (sticky at bottom)
- [ ] Banner has teal background with "Get This Site Live — $149/month"
- [ ] "Get Started" button is visible and clickable
- [ ] Clicking fires POST to `/api/preview/cta-click`
- [ ] Confirmation message shows after click ("Thank you for your interest!")
- [ ] `preview_analytics` table has new `cta_click` event
- [ ] Lead priority updated to HOT in database
- [ ] Notification created for Andrew
- [ ] Close Engine triggered (check `close_engine_conversations` table)
- [ ] Second click within 1 hour doesn't create duplicate conversation
- [ ] X button dismisses banner
- [ ] Banner re-shows on page reload (new session)
- [ ] Banner doesn't overlap existing page content
- [ ] Mobile responsive (stacks on small screens)
