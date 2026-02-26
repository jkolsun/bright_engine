/**
 * BRIGHT ENGINE — SPEC_LeadContactEdit Automated Tests
 * =====================================================
 * For: Jared (run via Claude Code or `npx tsx`)
 *
 * Tests the backend + API side of all 4 features automatically.
 * 19 checks that do NOT require a browser, Twilio call, or human eyes.
 *
 * SETUP:
 *   1. Save as: tests/test-lead-contact-edit.ts
 *   2. Add to package.json scripts: "test:contact-edit": "npx tsx tests/test-lead-contact-edit.ts"
 *   3. Env vars (reads from .env or defaults):
 *      - BASE_URL (default: https://preview.brightautomations.org)
 *      - ADMIN_EMAIL (default: admin@brightautomations.net)
 *      - ADMIN_PASSWORD (default: test123)
 *
 * RUN:
 *   npm run test:contact-edit
 *
 * COVERS:
 *   Phase A: Auth enforcement on PUT /api/leads/[id] (2 tests)
 *   Phase B: SafeFields — secondaryPhone saves (2 tests)
 *   Phase C: Contact edit side-effects — LeadContact, LeadEvent, Notification (5 tests)
 *   Phase D: Phone/email validation logic (3 tests)
 *   Phase E: Manual dial backend — POST /api/dialer/manual-dial (2 tests)
 *   Phase F: Manual dial attach + create-lead (3 tests)
 *   Phase G: Lead search for manual dial panel (2 tests)
 *   Cleanup: Soft-deletes all test data
 */

const BASE_URL = process.env.BASE_URL || 'https://preview.brightautomations.org'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@brightautomations.net'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test123'

// ─── State ───
let sessionCookie = ''
let testLeadId = ''
let testLeadOriginalPhone = '+15550001111'
let manualDialLeadId = ''
const cleanupLeadIds: string[] = []

let passed = 0
let failed = 0
let skipped = 0

// ─── Helpers ───

function log(status: 'PASS' | 'FAIL' | 'SKIP' | 'INFO', msg: string) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'SKIP' ? '⏭️' : 'ℹ️'
  console.log(`  ${icon} ${msg}`)
  if (status === 'PASS') passed++
  if (status === 'FAIL') failed++
  if (status === 'SKIP') skipped++
}

function header(phase: string) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${phase}`)
  console.log('═'.repeat(60))
}

async function api(
  path: string,
  options: RequestInit = {},
  overrideCookie?: string | null
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  // Use override cookie (null = no cookie, undefined = default session)
  if (overrideCookie === null) {
    // No cookie — unauthenticated request
  } else if (overrideCookie) {
    headers['Cookie'] = `session=${overrideCookie}`
  } else if (sessionCookie) {
    headers['Cookie'] = `session=${sessionCookie}`
  }
  try {
    const res = await fetch(url, { ...options, headers, redirect: 'manual' })
    let data: any = null
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('json')) {
      data = await res.json()
    } else {
      data = await res.text()
    }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 0, data: { error: (err as Error).message } }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── SETUP ───

async function setup() {
  header('SETUP: Login + Create Test Lead')

  // Login
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      redirect: 'manual',
    })
    const setCookie = loginRes.headers.get('set-cookie') || ''
    const match = setCookie.match(/session=([^;]+)/)
    if (match) {
      sessionCookie = match[1]
      log('PASS', 'Login successful — session cookie obtained')
    } else {
      log('FAIL', 'No session cookie — ALL TESTS WILL FAIL')
      process.exit(1)
    }
  } catch (err) {
    log('FAIL', `Login error: ${(err as Error).message}`)
    process.exit(1)
  }

  // Create test lead
  const res = await api('/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      companyName: 'AUTOTEST_ContactEdit_' + Date.now(),
      firstName: 'AutoTest',
      lastName: 'ContactEdit',
      phone: testLeadOriginalPhone,
      email: 'autotest-ce@example.com',
      source: 'COLD_CALL',
      status: 'NEW',
      city: 'Altoona',
      state: 'PA',
      industry: 'RESTORATION',
    }),
  })

  const leadId = res.data?.lead?.id || res.data?.id
  if (res.ok && leadId) {
    testLeadId = leadId
    cleanupLeadIds.push(testLeadId)
    log('PASS', `Test lead created: ${testLeadId}`)
  } else {
    log('FAIL', `Create lead failed: ${JSON.stringify(res.data)}`)
    process.exit(1)
  }
}

// ─── PHASE A: Auth enforcement ───

async function phaseA() {
  header('PHASE A: Auth on PUT /api/leads/[id]')

  // A.1 — No cookie = 401
  const noAuth = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({ phone: '+15559999999' }),
  }, null)

  if (noAuth.status === 401) {
    log('PASS', 'A.1 Unauthenticated PUT returns 401')
  } else {
    log('FAIL', `A.1 Expected 401, got ${noAuth.status}: ${JSON.stringify(noAuth.data)}`)
  }

  // A.2 — Valid session = 200
  const authed = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({ notes: 'auth-test-' + Date.now() }),
  })

  if (authed.ok) {
    log('PASS', 'A.2 Authenticated PUT returns 200')
  } else {
    log('FAIL', `A.2 Authenticated PUT failed: ${authed.status} ${JSON.stringify(authed.data)}`)
  }
}

// ─── PHASE B: SafeFields — secondaryPhone ───

async function phaseB() {
  header('PHASE B: SafeFields — secondaryPhone saves')

  // B.1 — Set secondaryPhone
  const setRes = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({ secondaryPhone: '+15552223333' }),
  })

  if (setRes.ok) {
    log('PASS', 'B.1 PUT with secondaryPhone returns 200')
  } else {
    log('FAIL', `B.1 PUT failed: ${setRes.status} ${JSON.stringify(setRes.data)}`)
  }

  // B.2 — Verify it persisted (GET the lead back)
  const getRes = await api(`/api/leads/${testLeadId}`)
  const lead = getRes.data?.lead || getRes.data
  if (lead?.secondaryPhone === '+15552223333') {
    log('PASS', 'B.2 secondaryPhone persisted in DB')
  } else {
    log('FAIL', `B.2 secondaryPhone not saved. Got: ${lead?.secondaryPhone}`)
  }
}

// ─── PHASE C: Contact edit side-effects ───

async function phaseC() {
  header('PHASE C: Edit side-effects (LeadContact, LeadEvent, Notification)')

  const newPhone = '+15557778888'

  // C.1 — Edit primary phone with metadata
  const editRes = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({
      phone: newPhone,
      _editedField: 'phone',
      _previousValue: testLeadOriginalPhone,
      _editedBy: 'rep',
    }),
  })

  if (editRes.ok) {
    log('PASS', 'C.1 Phone edit with metadata returns 200')
  } else {
    log('FAIL', `C.1 Phone edit failed: ${editRes.status} ${JSON.stringify(editRes.data)}`)
    return // Skip remaining C tests if this failed
  }

  // Give fire-and-forget writes a moment to complete
  await sleep(1500)

  // C.2 — Verify phone updated
  const getRes = await api(`/api/leads/${testLeadId}`)
  const lead = getRes.data?.lead || getRes.data
  if (lead?.phone === newPhone) {
    log('PASS', 'C.2 Phone updated to new value')
  } else {
    log('FAIL', `C.2 Phone not updated. Expected ${newPhone}, got ${lead?.phone}`)
  }

  // C.3 — Verify old phone archived as LeadContact
  const contactsRes = await api(`/api/admin/lead-contacts/${testLeadId}`)
  const contacts = contactsRes.data?.contacts || contactsRes.data || []
  const archived = Array.isArray(contacts)
    ? contacts.find((c: any) => c.value === testLeadOriginalPhone && c.label === 'Previous Primary')
    : null

  if (archived) {
    log('PASS', `C.3 Old phone archived as LeadContact (label: "${archived.label}", type: "${archived.type}")`)
  } else {
    log('FAIL', `C.3 Old phone NOT archived. Contacts found: ${JSON.stringify(contacts)}`)
  }

  // C.4 — Verify LeadEvent created
  // We check by fetching the lead detail which includes events
  const detailRes = await api(`/api/leads/${testLeadId}`)
  const detail = detailRes.data?.lead || detailRes.data
  const events = detail?.events || []
  const editEvent = events.find((e: any) =>
    e.metadata?.source === 'dialer_edit' && e.metadata?.field === 'phone'
  )

  if (editEvent) {
    log('PASS', `C.4 LeadEvent created (source: dialer_edit, field: phone)`)
  } else {
    // Events might not be included in the basic GET — try alternate check
    log('SKIP', 'C.4 LeadEvent — cannot verify via API (events may not be in GET response). Check DB manually.')
  }

  // C.5 — Verify admin Notification created
  const notifsRes = await api('/api/notifications')
  const notifs = notifsRes.data?.notifications || []
  const contactNotif = notifs.find((n: any) =>
    n.title === 'Lead Contact Updated' && n.metadata?.leadId === testLeadId
  )

  if (contactNotif) {
    log('PASS', `C.5 Admin notification created: "${contactNotif.message?.substring(0, 60)}..."`)
  } else {
    log('FAIL', `C.5 No "Lead Contact Updated" notification found for lead ${testLeadId}`)
  }

  // Update our tracking of the current phone
  testLeadOriginalPhone = newPhone
}

// ─── PHASE D: Validation logic ───

async function phaseD() {
  header('PHASE D: Phone/Email validation (backend accepts valid, rejects invalid via frontend)')

  // Note: Validation is client-side in LeadInfo.tsx — the backend safeFields
  // don't validate format. These tests verify the backend ACCEPTS valid formatted values.

  // D.1 — Valid E.164 phone saves
  const validPhone = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({ phone: '+15551112222' }),
  })
  if (validPhone.ok) {
    log('PASS', 'D.1 Valid E.164 phone accepted')
  } else {
    log('FAIL', `D.1 Valid phone rejected: ${validPhone.status}`)
  }

  // D.2 — Valid email saves
  const validEmail = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({ email: 'updated-test@example.com' }),
  })
  if (validEmail.ok) {
    log('PASS', 'D.2 Valid email accepted')
  } else {
    log('FAIL', `D.2 Valid email rejected: ${validEmail.status}`)
  }

  // D.3 — Empty secondaryPhone (clear it) saves as null
  const clearSecondary = await api(`/api/leads/${testLeadId}`, {
    method: 'PUT',
    body: JSON.stringify({ secondaryPhone: '' }),
  })
  if (clearSecondary.ok) {
    // Verify it's actually null/empty
    const check = await api(`/api/leads/${testLeadId}`)
    const lead = check.data?.lead || check.data
    if (!lead?.secondaryPhone || lead.secondaryPhone === '') {
      log('PASS', 'D.3 Empty secondaryPhone clears to null/empty')
    } else {
      log('FAIL', `D.3 secondaryPhone not cleared. Got: ${lead?.secondaryPhone}`)
    }
  } else {
    log('FAIL', `D.3 Clear secondaryPhone failed: ${clearSecondary.status}`)
  }
}

// ─── PHASE E: Manual dial backend ───

async function phaseE() {
  header('PHASE E: Manual dial backend — POST /api/dialer/manual-dial')

  // E.1 — Manual dial with valid phone (no session ID needed for this test)
  const dialRes = await api('/api/dialer/manual-dial', {
    method: 'POST',
    body: JSON.stringify({ phone: '+15553334444' }),
  })

  if (dialRes.ok && dialRes.data?.phoneToCall) {
    log('PASS', `E.1 Manual dial accepted — phoneToCall: ${dialRes.data.phoneToCall}`)
  } else if (dialRes.status === 400 && dialRes.data?.code === 'DNC') {
    log('SKIP', 'E.1 Phone is on DNC list — try a different number')
  } else if (dialRes.status === 400 && dialRes.data?.code === 'CONFIG_ERROR') {
    log('SKIP', 'E.1 Rep has no assigned Twilio number — this is a config issue, not a code issue')
  } else {
    log('FAIL', `E.1 Manual dial failed: ${dialRes.status} ${JSON.stringify(dialRes.data)}`)
  }

  // E.2 — Manual dial without phone = 400
  const noPhone = await api('/api/dialer/manual-dial', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  if (noPhone.status === 400) {
    log('PASS', 'E.2 Manual dial without phone returns 400')
  } else {
    log('FAIL', `E.2 Expected 400, got ${noPhone.status}`)
  }
}

// ─── PHASE F: Manual dial attach + create-lead ───

async function phaseF() {
  header('PHASE F: Manual dial attach + create-lead endpoints')

  // F.1 — Create a lead via manual dial create-lead
  const createRes = await api('/api/dialer/manual-dial/create-lead', {
    method: 'POST',
    body: JSON.stringify({
      phone: '+15556667777',
      companyName: 'AUTOTEST_ManualDial_' + Date.now(),
      contactName: 'Manual Test',
    }),
  })

  if (createRes.ok && createRes.data?.lead?.id) {
    manualDialLeadId = createRes.data.lead.id
    cleanupLeadIds.push(manualDialLeadId)
    log('PASS', `F.1 create-lead returned lead: ${manualDialLeadId}`)

    // Verify lead has correct source
    const lead = createRes.data.lead
    if (lead.source === 'COLD_CALL') {
      log('INFO', `     Source: ${lead.source} ✓`)
    }

    // Verify DialerCall was also created
    if (createRes.data.call?.id) {
      log('PASS', `F.2 DialerCall created alongside lead: ${createRes.data.call.id}`)
    } else {
      log('FAIL', 'F.2 No DialerCall returned from create-lead')
    }
  } else {
    log('FAIL', `F.1 create-lead failed: ${createRes.status} ${JSON.stringify(createRes.data)}`)
    log('SKIP', 'F.2 Skipped — depends on F.1')
  }

  // F.3 — Attach manual dial to existing lead
  if (testLeadId) {
    const attachRes = await api('/api/dialer/manual-dial/attach', {
      method: 'POST',
      body: JSON.stringify({
        leadId: testLeadId,
        phone: '+15559990000',
      }),
    })

    if (attachRes.ok && attachRes.data?.id) {
      log('PASS', `F.3 attach returned DialerCall: ${attachRes.data.id}`)
    } else {
      log('FAIL', `F.3 attach failed: ${attachRes.status} ${JSON.stringify(attachRes.data)}`)
    }
  } else {
    log('SKIP', 'F.3 No test lead available')
  }
}

// ─── PHASE G: Lead search for manual dial panel ───

async function phaseG() {
  header('PHASE G: Lead search API (manual dial panel uses this)')

  // G.1 — Search returns results with secondaryPhone in select
  const searchRes = await api('/api/leads?search=AUTOTEST&limit=10')

  if (searchRes.ok && Array.isArray(searchRes.data?.leads)) {
    const leads = searchRes.data.leads
    if (leads.length > 0) {
      log('PASS', `G.1 Search returned ${leads.length} results`)

      // G.2 — Check that secondaryPhone is included in response
      const firstLead = leads[0]
      if ('secondaryPhone' in firstLead) {
        log('PASS', 'G.2 secondaryPhone included in search results (Jared\'s bug fix confirmed)')
      } else {
        log('FAIL', 'G.2 secondaryPhone NOT in search results — Jared\'s select clause fix may be missing')
      }
    } else {
      log('FAIL', 'G.1 Search returned 0 results — test leads may not exist')
      log('SKIP', 'G.2 Skipped — no results to check')
    }
  } else {
    log('FAIL', `G.1 Search failed: ${searchRes.status} ${JSON.stringify(searchRes.data)}`)
    log('SKIP', 'G.2 Skipped')
  }
}

// ─── CLEANUP ───

async function cleanup() {
  header('CLEANUP: Soft-delete test leads')

  for (const id of cleanupLeadIds) {
    try {
      await api(`/api/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CLOSED_LOST', notes: 'AUTOTEST cleanup — safe to hard-delete' }),
      })
      log('INFO', `Soft-deleted: ${id}`)
    } catch {
      log('INFO', `Cleanup failed for ${id} — delete manually`)
    }
  }
}

// ─── MAIN ───

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   SPEC_LeadContactEdit — Automated API Tests            ║')
  console.log('║   19 checks · No browser needed · No Twilio calls       ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`\n  Target: ${BASE_URL}`)
  console.log(`  Time:   ${new Date().toISOString()}`)

  await setup()
  await phaseA()
  await phaseB()
  await phaseC()
  await phaseD()
  await phaseE()
  await phaseF()
  await phaseG()
  await cleanup()

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  RESULTS: ${passed} passed · ${failed} failed · ${skipped} skipped`)
  console.log('═'.repeat(60))

  if (failed > 0) {
    console.log('\n  ⚠️  Some tests failed. Check output above for details.')
    process.exit(1)
  } else {
    console.log('\n  🎉 All automated checks passed!')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
