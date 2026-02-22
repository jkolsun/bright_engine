// ── Settings Defaults ─────────────────────────────────────────
// All default values for settings, extracted from the monolith.
// Shared by all tab components.

export const DEFAULT_COMPANY = {
  companyName: 'Bright Automations',
  adminPhone: '',
  previewExpirationDays: 14,
  postPaymentExplainer: 'Once payment is confirmed, our team finalizes your site within 48 hours. You\'ll get a text when it\'s ready to review. We handle everything — no login needed. If you want any changes, just text us and we\'ll update it before it goes live.',
  competitiveAdvantages: 'Sites are mobile-first, load in under 2 seconds.\nSEO-optimized out of the box for local search.\nWe pre-build the site so they see it before they pay — nobody else does that.\nNo contracts, no hidden fees.\nChanges included before go-live.',
}

export const DEFAULT_SEQUENCES = {
  urgencyDays: [3, 5, 6, 7, 8, 10, 14],
  urgencyTemplates: {
    3: '\u{1F525} Hey {name}, your preview expires in {days_left} days. Take another look: {preview_url}',
    5: '\u23F0 {name}, {days_left} days left on your preview. Don\'t want to miss your window. Can we schedule a call?',
    6: '\u26A1 Quick question {name} — is time the only thing holding you back from launching?',
    7: '\u{1F6A8} {name}, {days_left} days left. We\'re holding your spot but can\'t wait forever. Ready to move forward?',
    8: 'Last chance to save your spot at this price, {name}. Preview expires in {days_left} days: {preview_url}',
    10: 'Your {company} preview is ending soon. We can have you live TODAY if you say yes: {preview_url}',
    14: '{name}, your preview is gone in 24 hours. This is your final notice: {preview_url}',
  } as Record<number, string>,
  safetyBuffer: 0.85,
}

export const DEFAULT_CLIENT_SEQUENCES = {
  touchpointDays: [7, 14, 30, 60, 90, 180, 365],
  touchpointGuidance: {
    7: 'Check-in + quick win. Use their site stats to show early traction. Suggest one actionable thing (Google Business Profile, share link on social) based on what their data is missing.',
    14: 'Performance report. Share real numbers (visits, forms, calls). If traffic is low, suggest how to drive it. If traffic is good, celebrate it.',
    30: 'Month milestone + first upsell. Use their actual data to recommend ONE upsell that would help the most: low traffic \u2192 SEO, no reviews \u2192 Review Widget.',
    60: 'Growth opportunity. Compare current stats to first month. Identify the biggest growth lever based on data.',
    90: 'Quarterly review + strategic upsell. Full quarter review. Use data to pitch the upsell that makes the most sense for their situation.',
    180: 'Half-year check. Share cumulative stats. Suggest a refresh or seasonal update. If they haven\'t purchased any upsells, make a tailored pitch.',
    365: 'Anniversary + expansion. Total year stats. Ask about goals for next year. Suggest premium plan based on what data says they need most.',
  } as Record<number, string>,
  touchpointTemplates: {} as Record<number, string>,
  upsellProducts: [
    { name: 'Google Business Profile', price: '$49 one-time', key: 'GBP' },
    { name: 'Review Widget', price: '$69/mo', key: 'REVIEW_WIDGET' },
    { name: 'SEO Package', price: '$59/mo', key: 'SEO' },
    { name: 'Social Media Management', price: '$99/mo', key: 'SOCIAL' },
  ],
  enabled: true,
}

export const DEFAULT_CHANNEL_ROUTING = {
  enabled: false,
  useAi: true,
  defaultChannel: 'SMS' as 'SMS' | 'EMAIL',
}

export const DEFAULT_PERSONALIZATION = {
  model: 'claude-haiku-4-5-20251001',
  enabled: true,
  fallbackBehavior: 'generic_template',
  defaultCallScript: `OPENER (10 sec):
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. Not trying to sell you anything crazy — quick question, do you have 30 seconds?"

If no: "When's a better time?"

HOOK — Bad Website (20 sec):
"I pulled up {{companyName}}'s website before I called. Not gonna sugarcoat it — not showing up well on mobile and the design looks dated. Are you getting leads from it?"

HOOK — No Website (20 sec):
"I searched for {{industry}} in {{location}} and couldn't find a site for {{companyName}}. Are you getting most business from referrals?"

PITCH (30 sec):
"Here's why I'm calling. We build professional sites specifically for {{industry}} businesses. Clean, works on phones, shows up on Google. $188, live in 48 hours. And actually — I already mocked up what a site for {{companyName}} would look like. Want me to text you the link so you can see it?"

CLOSE — If Interested:
"Awesome. I'm texting you the preview right now. Take a look, and if you like it, just text us back and we'll make it live. You don't pay until you're happy with it. What's the best number to text?"`,
}

export const DEFAULT_TARGETS = {
  dailyDials: 100,
  dailyConversations: 20,
  dailyCloses: 3,
  dailyLeadCap: 25,
  monthlyRevenueTarget: 50000,
  minAutoDialDelay: 3,
}

export const DEFAULT_SYSTEM_MSGS: Record<string, { text: string; enabled: boolean }> = {
  form_thank_you: { text: "Got it, thank you {firstName}! Our team is reviewing everything now and we'll get started on your site. You'll get a text when it's ready for review.", enabled: true },
  preview_sent: { text: "Hey {firstName}! Your website for {companyName} is ready for review. Take a look and let me know what you think: {previewUrl}", enabled: true },
  payment_link: { text: "Here's your payment link to go live: {paymentLink}\n\n{firstMonthTotal} gets your site built and launched, plus monthly hosting at {monthlyHosting}/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!", enabled: true },
  welcome_after_payment: { text: "Welcome aboard, {firstName}! Your site is going live. You'll get a text from us when it's up. Quick win: make sure your Google Business Profile is claimed \u2014 that alone can double your local visibility.", enabled: true },
  site_live: { text: "Hey {firstName}! Your site for {companyName} is officially live at {siteUrl}. Check it out and let us know if you want any changes!", enabled: true },
}

export const SYS_MSG_META = [
  { key: 'form_thank_you', label: 'Form Thank You', desc: 'Sent immediately after lead completes the onboarding form.', vars: ['firstName'] },
  { key: 'preview_sent', label: 'Preview Sent', desc: 'Sent when admin approves sending the site preview.', vars: ['firstName', 'companyName', 'previewUrl'] },
  { key: 'payment_link', label: 'Payment Link Sent', desc: 'Sent with the Stripe checkout link when admin approves payment.', vars: ['firstName', 'companyName', 'paymentLink', 'firstMonthTotal', 'monthlyHosting'] },
  { key: 'welcome_after_payment', label: 'Welcome After Payment', desc: 'Sent ~2.5 min after Stripe payment succeeds.', vars: ['firstName'] },
  { key: 'site_live', label: 'Site Live Notification', desc: 'Sent after domain is set up and site goes live.', vars: ['firstName', 'companyName', 'siteUrl'] },
]

export const DEFAULT_AUTO_MSGS: Record<string, { text: string; enabled: boolean; delayHours?: number }> = {
  form_nudge: { text: "Hey {firstName}, just following up \u2014 did you get a chance to fill out the form? Here's the link again: {formUrl}", enabled: true, delayHours: 24 },
  preview_followup: { text: "Hey {firstName}, wanted to check in \u2014 did you get a chance to look at the preview? Let me know what you think: {previewUrl}", enabled: true, delayHours: 24 },
  payment_followup_4h: { text: "Hey {firstName}, just checking \u2014 any questions about getting your site live?", enabled: true, delayHours: 4 },
  payment_followup_24h: { text: "Hey {firstName}, just wanted to make sure you got the payment link. Any questions about getting your site live?", enabled: true, delayHours: 24 },
  payment_followup_48h: { text: "Hey {firstName}, your preview is looking great. Payment link is ready when you are!", enabled: true, delayHours: 48 },
  payment_followup_72h: { text: "Last check-in \u2014 want me to hold your spot or should I free it up for someone else, {firstName}?", enabled: true, delayHours: 72 },
  touchpoint_day_3: { text: "Hey {firstName}! Quick tip \u2014 make sure your Google Business Profile is claimed and up to date. That alone can double your local visibility for {companyName}.", enabled: true, delayHours: 72 },
  touchpoint_day_7: { text: "Hey {firstName}! Your {companyName} site has been live for a week now. Everything looking good? Reply if you need anything.", enabled: true, delayHours: 168 },
  touchpoint_day_14: { text: "Hey {firstName}, quick 2-week check-in on {companyName}'s site. How's it working for you so far? Any changes you'd like?", enabled: true, delayHours: 336 },
  touchpoint_day_21: { text: "Hey {firstName}, just wanted to see how things are going with {companyName}'s site. Getting any leads from it?", enabled: true, delayHours: 504 },
  touchpoint_day_28: { text: "Hey {firstName}! It's been a month since {companyName} went live. Love to hear how it's going \u2014 and I have some ideas that could help you get even more out of it.", enabled: true, delayHours: 672 },
  winback_day_7: { text: 'Your hosting was cancelled. {companyName}\'s site goes offline in 7 days. Reply "keep it" to reactivate.', enabled: true, delayHours: 168 },
  winback_day_14: { text: "Hey, just wanted to let you know {companyName}'s site will be taken down soon. If you change your mind, just reply and we'll keep it live.", enabled: true, delayHours: 336 },
  winback_day_30: { text: "Last chance \u2014 {companyName}'s site data will be deleted in 48 hours. Reply to save it.", enabled: true, delayHours: 720 },
}

export const AUTO_MSG_META = [
  { key: 'form_nudge', label: 'Form Nudge', desc: "Sent if client hasn't filled out form.", vars: ['firstName', 'formUrl'], cat: 'pre_client' as const },
  { key: 'preview_followup', label: 'Preview Follow-up', desc: "Sent if client hasn't responded after seeing preview.", vars: ['firstName', 'previewUrl'], cat: 'pre_client' as const },
  { key: 'payment_followup_4h', label: 'Payment Follow-up (4h)', desc: '4 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'payment_followup_24h', label: 'Payment Follow-up (24h)', desc: '24 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'payment_followup_48h', label: 'Payment Follow-up (48h)', desc: '48 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'payment_followup_72h', label: 'Payment Follow-up (72h)', desc: 'Final follow-up 72 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'touchpoint_day_3', label: 'Day 3 \u2014 GBP Reminder', desc: 'Google Business Profile optimization tip.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_7', label: 'Day 7 \u2014 First Week Stats', desc: 'First week check-in.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_14', label: 'Day 14 \u2014 Two Week Check-in', desc: 'Two week check-in.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_21', label: 'Day 21 \u2014 Lead Check', desc: "Check if they're getting leads.", vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_28', label: 'Day 28 \u2014 Month Review', desc: 'Andrew takes over for upsell conversation.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'winback_day_7', label: 'Win-Back Day 7', desc: '7 days after hosting cancellation.', vars: ['companyName'], cat: 'winback' as const },
  { key: 'winback_day_14', label: 'Win-Back Day 14', desc: '14 days after hosting cancellation.', vars: ['companyName'], cat: 'winback' as const },
  { key: 'winback_day_30', label: 'Win-Back Day 30', desc: 'Final notice 30 days after cancellation.', vars: ['companyName'], cat: 'winback' as const },
]

export const DEFAULT_AI_CONTROLS = {
  globalEnabled: true,
  preClientEnabled: true,
  postClientEnabled: true,
  delayMin: 15,
  delayMax: 45,
  humanizingPrompt: '',
}

export const DEFAULT_ONBOARDING_FLOW = {
  welcome: "Welcome aboard! Let's get {companyName} live.",
  domainQuestion: "Do you already have a domain you'd like to use, or would you like us to help pick one?",
  gbpPrompt: "Do you have a Google Business Profile? If so, we can connect it to your site for better local visibility.",
  stageTemplate: '',
}

export const DEFAULT_AI_HANDLER = {
  globalAiAutoRespond: true,
  preClientAi: true,
  postClientAi: true,
  tone: 'casual',
  useEmojis: 'sparingly',
  maxResponseLength: 2,
  responseDelay: { min: 30, max: 90 },
  humanizingPrompt: '',
  escalationMessage: 'Let me get the right person on this for you. Someone will follow up shortly.',
  escalationTriggers: [
    { id: 'negative_sentiment', label: 'Client is upset / negative sentiment', enabled: true },
    { id: 'custom_package', label: 'Wants custom or bigger package', enabled: true },
    { id: 'cancel_request', label: 'Asks to cancel', enabled: true },
    { id: 'refund_request', label: 'Asks for refund', enabled: true },
    { id: 'competitor_mention', label: 'Mentions a competitor', enabled: true },
    { id: 'human_request', label: 'Asks to speak to a person / manager', enabled: true },
    { id: 'legal_threat', label: 'Legal or threatening language', enabled: true },
    { id: 'unparseable', label: "AI can't parse the request", enabled: true },
    { id: 'back_and_forth', label: '3+ back-and-forth without resolution', enabled: true, threshold: 3 },
    { id: 'billing_dispute', label: 'Payment dispute / billing question', enabled: true },
    { id: 'out_of_scope', label: 'Question outside your service scope', enabled: true },
    { id: 'message_flood', label: '10+ messages/day from one client', enabled: true, threshold: 10 },
  ],
}

// Stage Playbook defaults from spec
export const DEFAULT_STAGE_PLAYBOOK: Record<string, { instructions_override: string; enabled: boolean }> = {
  INITIATED: {
    instructions_override: 'Lead just entered the funnel. Send the appropriate first message template based on how they came in. Your only goal is to get a response.',
    enabled: true,
  },
  QUALIFYING: {
    instructions_override: "You're confirming this lead is a real buyer. They already saw the preview and clicked the CTA so they're interested. Ask 2 questions: 1) do they currently have a website or is this their first one, 2) are they the decision maker for marketing at their company. After both are answered, send the form link. Your message with the form link MUST include all 3 of these no matter how you word it: 1) the actual form link {formUrl} 2) that it takes about 5-10 minutes 3) that they won't pay anything until they see the final product and love it. If they already answered both questions in one message skip straight to the form link. If they go off script roll with it but get to the form link as fast as possible.",
    enabled: true,
  },
  COLLECTING_INFO: {
    instructions_override: "The form has been sent. If the client says they completed it, confirm and let them know the team is on it. If they text info instead of using the form, collect it through chat. If they ask questions about pricing, answer honestly: $149 one time to go live, $39/month after the first month, no contracts. Remind them they won't pay until they see and approve the final product.",
    enabled: true,
  },
  BUILDING: {
    instructions_override: "The site is being built by the team. If the client asks about progress say their site is being finalized and they'll have a preview to review shortly. If they send additional photos or info, accept them. Keep responses short. One check-in per day max. Don't be annoying.",
    enabled: true,
  },
  PREVIEW_SENT: {
    instructions_override: "The client received their preview link. Wait for their reaction. If they approve (looks good, love it, yes, thumbs up), confirm their excitement and tell them you're getting the payment link ready. The system will create a PAYMENT_LINK approval for Andrew to review. Do NOT send the payment link yourself. If they want changes, acknowledge the request and let them know the team will update it. If they ask about pricing: $149 one time, $39/month, no contracts. If they go quiet for 24+ hours send one follow up.",
    enabled: true,
  },
  EDIT_LOOP: {
    instructions_override: "The client requested changes. Those changes are being applied by the team. If they ask about status say the changes are being worked on and they'll get an updated preview soon. If they send more change requests, acknowledge and add to the list. Keep this stage moving.",
    enabled: true,
  },
  PAYMENT_SENT: {
    instructions_override: "The payment link has been sent. If they ask what's included: $149 gets the site live on their own domain, hosting, SSL, mobile optimization. $39/month after the first month for hosting, security, and support. No contracts cancel anytime. If they say it's too expensive: it's less than one service call and their site starts generating leads day one. If they ask what happens after payment: site goes live on their custom domain within 48 hours.",
    enabled: true,
  },
  STALLED: {
    instructions_override: "This lead went quiet. Send one re-engagement message based on what stage they were in when they went silent. If they were in qualifying, reference the preview. If they were after preview, ask if something held them back. One message only. If no response wait 7 days before trying again. After 3 attempts with no response mark as closed lost. Never be guilt-trippy.",
    enabled: true,
  },
  CLOSED_LOST: {
    instructions_override: "Don't actively reach out. If they text back on their own, be warm and welcoming. Check if their preview is still valid. Treat it as a fresh opportunity. Don't reference that they ghosted.",
    enabled: true,
  },
}

export const DEFAULT_FIRST_MESSAGES: Record<string, string> = {
  INSTANTLY_REPLY: "Hey {name}! Thanks for getting back to us. I actually already put together a preview site for {company} \u2014 check it out: {previewUrl}. Let me know what you think!",
  SMS_REPLY: "Hey {name}, this is the Bright Automations team. We built a preview site for {company} \u2014 take a look: {previewUrl}. What do you think?",
  REP_CLOSE: "Hey {name}, I just got off the phone with our team and they put together a site for {company}. Check it out here: {previewUrl} \u2014 I think you're going to like it.",
  PREVIEW_CTA: "Hey {name}! Saw you checking out the preview we built for {company}. What do you think so far? Any changes you'd want before we make it official?",
}

export const INDUSTRY_MAP: Record<string, string> = {
  RESTORATION: 'restoration', WATER_DAMAGE: 'water damage restoration',
  ROOFING: 'roofing', PLUMBING: 'plumbing', HVAC: 'HVAC',
  PAINTING: 'painting', LANDSCAPING: 'landscaping', ELECTRICAL: 'electrical',
  GENERAL_CONTRACTING: 'general contracting', CLEANING: 'cleaning',
  PEST_CONTROL: 'pest control', CONSTRUCTION: 'construction',
}
