# TASK 9: Entry Point 3 — Rep Close Button

## Overview
Add a "Close → AI Handoff" button to the dialer UI. When a rep is on a call and the lead is interested, clicking this button triggers the Close Engine with the rep's ID for commission tracking.

**Files:** `src/components/rep/DialerCore.tsx` (MODIFY) + `src/app/api/close-engine/trigger/route.ts` (NEW)
**Est. Time:** 1 hour
**Dependencies:** Task 5 (close-engine.ts must exist)

---

## IMPORTANT: Paste the existing DialerCore.tsx into Claude Code alongside this prompt.

---

## What To Do

### FILE 1: `src/app/api/close-engine/trigger/route.ts` (NEW)

Universal trigger endpoint used by the rep button and also available for manual admin triggers:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { triggerCloseEngine } from '@/lib/close-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Require auth (Admin or Rep)
    const sessionCookie = request.cookies.get('session')?.value;
    const session = sessionCookie ? await verifySession(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { leadId, entryPoint, repId } = await request.json();
    
    if (!leadId || !entryPoint) {
      return NextResponse.json({ error: 'leadId and entryPoint required' }, { status: 400 });
    }
    
    // Validate entryPoint
    const validEntryPoints = ['INSTANTLY_REPLY', 'SMS_REPLY', 'REP_CLOSE', 'PREVIEW_CTA'];
    if (!validEntryPoints.includes(entryPoint)) {
      return NextResponse.json({ error: 'Invalid entryPoint' }, { status: 400 });
    }
    
    const result = await triggerCloseEngine({ leadId, entryPoint, repId });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CloseEngine Trigger API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### FILE 2: `src/components/rep/DialerCore.tsx` (MODIFY)

Add a new button to the dialer interface:

1. **Button placement:** Add near the existing call outcome buttons, visible when `currentLead` exists. Could be in the actions row or as a prominent secondary button.

2. **Button design:**
   - Label: "Close → AI Handoff" 
   - Icon: sparkles or robot emoji (✨ or 🤖)
   - Style: teal background (`bg-[#0D7377]`), white text, rounded
   - State: disabled after click to prevent double-trigger
   - Only visible when a lead is currently loaded

3. **On click handler:**
```typescript
const handleAIHandoff = async () => {
  if (!currentLead || aiHandoffSent) return;
  setAiHandoffSent(true); // Add this state variable
  
  try {
    const res = await fetch('/api/close-engine/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: currentLead.id,
        entryPoint: 'REP_CLOSE',
        repId: session?.user?.id, // From auth session
      }),
    });
    
    if (res.ok) {
      // Show success toast/notification
      // You can use whatever toast system the existing code uses
      alert('Lead handed to AI Close Engine — Claude will text them shortly');
    }
  } catch (e) {
    console.error('AI Handoff failed:', e);
    setAiHandoffSent(false); // Re-enable on failure
  }
};
```

4. **Add state variable:** `const [aiHandoffSent, setAiHandoffSent] = useState(false);`

5. **Reset on lead change:** When `currentLead` changes, reset `aiHandoffSent` to false.

6. **Keyboard shortcut:** Add `'a'` key (for AI) to the existing keyboard handler — `case 'a': case 'A': e.preventDefault(); handleAIHandoff(); break;`

---

## Verify Before Moving On

- [ ] "Close → AI Handoff" button visible in dialer when lead is loaded
- [ ] Button has teal styling that matches the platform
- [ ] Clicking button calls POST `/api/close-engine/trigger`
- [ ] Request includes leadId, entryPoint: 'REP_CLOSE', and repId
- [ ] CloseEngineConversation created with repId (check database)
- [ ] Lead status updates to QUALIFIED
- [ ] Confirmation message shown after click
- [ ] Button disables after click (no double-trigger)
- [ ] Button re-enables when a new lead is loaded
- [ ] Keyboard shortcut 'A' triggers handoff
- [ ] API endpoint rejects unauthenticated requests
- [ ] API endpoint validates entryPoint
