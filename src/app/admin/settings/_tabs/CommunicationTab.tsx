'use client'

import { AccordionSection } from '../_lib/components'
import AiBrain from '../_components/AiBrain'
import CloseEngineScenarios from '../_components/CloseEngineScenarios'
import EscalationRules from '../_components/EscalationRules'
import ScheduledMessages from '../_components/ScheduledMessages'

// ── CommunicationTab ─────────────────────────────────────────
export default function CommunicationTab() {
  return (
    <div className="space-y-4">

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: AI BRAIN
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="AI Brain"
        description="How the AI thinks, talks, and responds in live conversations"
        defaultOpen
      >
        <AiBrain />
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: STAGE PLAYBOOK
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Stage Playbook"
        description="Instructions the AI follows at each stage of the sales pipeline"
      >
        <CloseEngineScenarios />
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: ESCALATION RULES
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Escalation Rules"
        description="When the AI should stop and hand off to a human"
      >
        <EscalationRules />
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: SCHEDULED MESSAGES
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Scheduled Messages"
        description="Automated messages sent on a timer -- no AI involved"
      >
        <ScheduledMessages />
      </AccordionSection>

    </div>
  )
}
