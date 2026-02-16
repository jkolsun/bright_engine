# 🔍 Live Testing - Session Verification Debug

**Date**: Feb 16, 2026, 11:41 AM EST  
**Status**: ⏸️ **SESSION_SECRET Issue Identified**

---

## What Works ✅

1. **App Deployment**: Live and responding
2. **Database**: Connected and populated
3. **Login Endpoint**: `/api/auth/simple-login` ✅
   - Email: admin@brightautomations.net
   - Password: test123
   - Returns: `{"success": true, "redirectUrl": "/admin/dashboard"}`
   - Session cookie generated: `session=<payload>.<signature>`

---

## What's Broken ❌

4. **Session Verification**: `/api/auth/me` fails
   - Request: Valid session cookie from login
   - Response: 401 "Not authenticated"
   - Root Cause: Session signature verification failing

5. **CSV Import**: `/api/leads/import` fails
   - Request: CSV file + session cookie
   - Response: 403 "Admin required" (actually 401 in session layer)
   - Root Cause: Same session verification issue

---

## Technical Analysis

### Session Flow

**Step 1: Login** (works)
```
POST /api/auth/simple-login
├─ signSession() in login endpoint
│  ├─ Validates SESSION_SECRET env var
│  ├─ Creates payload: base64(JSON.stringify(userData))
│  ├─ Signs with: HMAC-SHA256(payload, SESSION_SECRET)
│  └─ Returns: payload.signature as cookie
└─ ✅ Session cookie created successfully
```

**Step 2: Verify Session** (fails)
```
GET /api/auth/me
├─ verifySession(cookie) in session middleware
│  ├─ Validates SESSION_SECRET env var
│  ├─ Extracts payload and signature from cookie
│  ├─ Recalculates: HMAC-SHA256(payload, SESSION_SECRET)
│  ├─ Compares: expected_sig === provided_sig
│  │  ❌ MISMATCH!
│  └─ Returns: null (verification failed)
└─ 401 Not authenticated
```

### Why Verification Fails

Two possibilities:

1. **SESSION_SECRET Not Set on Railway**
   - Login uses placeholder: `'build-placeholder-do-not-use-in-production'`
   - Verify uses same placeholder
   - They should match... but maybe Railway env vars changed?

2. **SESSION_SECRET Set Differently**
   - Login uses: `SESSION_SECRET` value X
   - Verify uses: `SESSION_SECRET` value Y (different)
   - HMAC signatures won't match

3. **Session Secret Changed Between Requests**
   - Railway restarted/scaled
   - Different process instances see different env vars
   - Unlikely but possible

---

## Session Code Review

### Signing (works):
```typescript
async function signSession(data: object): Promise<string> {
  validateSessionSecret() // ✅ Must not be placeholder
  const payload = btoa(JSON.stringify(data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const sig = await hmacSign(payload, SESSION_SECRET)
  return `${payload}.${sig}`
}
```

### Verifying (fails):
```typescript
async function verifySession(cookie: string): Promise<any | null> {
  validateSessionSecret() // ✅ Must not be placeholder
  const [payload, sig] = cookie.split('.')
  const expected = await hmacSign(payload, SESSION_SECRET)
  if (sig !== expected) return null // ❌ FAILING HERE
  return JSON.parse(atob(payload))
}
```

---

## Expected Session_SECRET Value

Railway should have:
```env
SESSION_SECRET=<any-random-string>
```

Examples:
- `SESSION_SECRET=prod-secret-key-xyz123`
- `SESSION_SECRET=your-secure-random-string`
- `SESSION_SECRET=$(openssl rand -hex 32)` ← Best practice

---

## How to Fix

### 1. Check Railway Environment
```bash
railway env list
# Look for: SESSION_SECRET=<value>
```

### 2. If Missing, Set It
```bash
railway env set SESSION_SECRET=prod-secret-key-12345
railway restart  # or railway deploy
```

### 3. Re-test
```bash
# Try /api/auth/me with session cookie again
# Then CSV import should work
```

---

## Ready to Execute Once Fixed

Once SESSION_SECRET is set and Railway restarts:

```
1. Login: admin@brightautomations.net / test123 ✅
2. Get session cookie from Set-Cookie header ✅
3. Use session cookie to import CSV ← WILL WORK
4. Verify 9 leads created in database
5. Monitor enrichment jobs
6. Show activity logs
7. Complete E2E pipeline test
```

**ETA after fix**: 2 minutes to complete full test

---

## Current Session Cookie

Generated at: 11:44 AM EST  
Value: `session=eyJ1c2VySWQiOiJjbWxvZ25ra2swMDAwaTRyZHo3NmQ0NGh0IiwiZW1haWwiOiJhZG1pbkBicmlnaHRhdXRvbWF0aW9ucy5uZXQiLCJuYW1lIjoiQW5kcmV3Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzcxMjYwMjg0MTU4fQ.c4afacfef9b0e147dca47269bbd6ea97df7d23bcc9fd8295c21ad10c7b092b7b`

Decoded Payload:
```json
{
  "userId": "cmlogrnkk000i4rdz76d44ht",
  "email": "admin@brightautomations.net",
  "name": "Andrew",
  "role": "ADMIN",
  "iat": 1771260284158
}
```

Signature doesn't verify because SESSION_SECRET mismatch.

---

**Waiting for**: SESSION_SECRET verification on Railway  
**Will resume**: CSV import test immediately after fix
