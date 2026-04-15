export const CHECKLIST_TEMPLATE = [
  // ── Feasibility ───────────────────────────────────────────────────────────
  { stageId: 'feasibility', label: 'Appraisal complete', requiredToProgress: false },
  { stageId: 'feasibility', label: 'Feasibility complete', requiredToProgress: false },
  { stageId: 'feasibility', label: 'Planning review complete', requiredToProgress: false },
  { stageId: 'feasibility', label: 'Initial servicing review complete', requiredToProgress: false },
  { stageId: 'feasibility', label: 'Initial concept complete', requiredToProgress: false },
  { stageId: 'feasibility', label: 'Comment / easement review complete', requiredToProgress: false },
  { stageId: 'feasibility', label: 'Site identified', requiredToProgress: true },

  // ── Acquisition ───────────────────────────────────────────────────────────
  { stageId: 'acquisition', label: 'Sales and purchase agreement issued', requiredToProgress: false },
  { stageId: 'acquisition', label: 'Due diligence complete', requiredToProgress: true },
  { stageId: 'acquisition', label: 'Purchase confirmed / unconditional', requiredToProgress: true },
  { stageId: 'acquisition', label: 'Title review complete', requiredToProgress: false },
  { stageId: 'acquisition', label: 'LIM / property file obtained', requiredToProgress: false },
  { stageId: 'acquisition', label: 'Geotechnical review commissioned', requiredToProgress: false },
  { stageId: 'acquisition', label: 'Acquisition strategy confirmed', requiredToProgress: false },

  // ── Funding & Legal ───────────────────────────────────────────────────────
  { stageId: 'funding-legal', label: 'Legal structure confirmed', requiredToProgress: true },
  { stageId: 'funding-legal', label: 'Funding strategy confirmed', requiredToProgress: true },
  { stageId: 'funding-legal', label: 'Indicative finance confirmed', requiredToProgress: false },
  { stageId: 'funding-legal', label: 'Investor terms confirmed', requiredToProgress: false },
  { stageId: 'funding-legal', label: 'Lender engagement complete', requiredToProgress: false },
  { stageId: 'funding-legal', label: 'Legal due diligence complete', requiredToProgress: false },
  { stageId: 'funding-legal', label: 'GST / tax / ownership considerations reviewed', requiredToProgress: false },

  // ── Resource Consent ──────────────────────────────────────────────────────
  { stageId: 'resource-consent', label: 'Planning strategy confirmed', requiredToProgress: true },
  { stageId: 'resource-consent', label: 'Concept design complete', requiredToProgress: true },
  { stageId: 'resource-consent', label: 'Planning drawings complete', requiredToProgress: false },
  { stageId: 'resource-consent', label: 'Planning consultant engaged', requiredToProgress: false },
  { stageId: 'resource-consent', label: 'Engineering inputs complete for RC', requiredToProgress: false },
  { stageId: 'resource-consent', label: 'Servicing strategy complete', requiredToProgress: false },
  { stageId: 'resource-consent', label: 'Traffic / planning inputs complete', requiredToProgress: false },
  { stageId: 'resource-consent', label: 'Application compiled', requiredToProgress: true },
  { stageId: 'resource-consent', label: 'RC lodged', requiredToProgress: true },
  { stageId: 'resource-consent', label: 'RFI responses complete', requiredToProgress: false },
  { stageId: 'resource-consent', label: 'RC approved', requiredToProgress: true },
  { stageId: 'resource-consent', label: 'Consent conditions reviewed and actioned', requiredToProgress: false },

  // ── Building Consent ──────────────────────────────────────────────────────
  { stageId: 'building-consent', label: 'BC documentation complete', requiredToProgress: true },
  { stageId: 'building-consent', label: 'Architectural design complete', requiredToProgress: false },
  { stageId: 'building-consent', label: 'Engineering design complete', requiredToProgress: false },
  { stageId: 'building-consent', label: 'Consultant documentation complete', requiredToProgress: false },
  { stageId: 'building-consent', label: 'BC lodged', requiredToProgress: true },
  { stageId: 'building-consent', label: 'RFI responses complete', requiredToProgress: false },
  { stageId: 'building-consent', label: 'BC approved', requiredToProgress: true },
  { stageId: 'building-consent', label: 'Consent conditions reviewed and actioned', requiredToProgress: false },

  // ── Engineering Plan Approvals ────────────────────────────────────────────
  { stageId: 'engineering-plan-approvals', label: 'PA / authority approvals complete', requiredToProgress: true },
  { stageId: 'engineering-plan-approvals', label: 'Authority pre-start requirements complete', requiredToProgress: false },
  { stageId: 'engineering-plan-approvals', label: 'Consultant appointments issued', requiredToProgress: false },
  { stageId: 'engineering-plan-approvals', label: 'Key contracts prepared', requiredToProgress: false },
  { stageId: 'engineering-plan-approvals', label: 'Insurance requirements reviewed', requiredToProgress: false },
  { stageId: 'engineering-plan-approvals', label: 'Insurance confirmed', requiredToProgress: false },
  { stageId: 'engineering-plan-approvals', label: 'Neighbour communication complete', requiredToProgress: false },

  // ── Pricing ───────────────────────────────────────────────────────────────
  { stageId: 'pricing', label: 'QS estimate complete', requiredToProgress: true },
  { stageId: 'pricing', label: 'Cost plan complete', requiredToProgress: true },
  { stageId: 'pricing', label: 'Budget confirmed', requiredToProgress: true },
  { stageId: 'pricing', label: 'Tender analysis complete', requiredToProgress: false },
  { stageId: 'pricing', label: 'Value engineering complete', requiredToProgress: false },
  { stageId: 'pricing', label: 'Final pricing confirmed', requiredToProgress: true },

  // ── Sales & Marketing ─────────────────────────────────────────────────────
  { stageId: 'sales-marketing', label: 'Marketing strategy confirmed', requiredToProgress: false },
  { stageId: 'sales-marketing', label: 'Sales collateral prepared', requiredToProgress: false },
  { stageId: 'sales-marketing', label: 'Pricing schedule complete', requiredToProgress: true },
  { stageId: 'sales-marketing', label: 'Pre-sales targets confirmed', requiredToProgress: false },
  { stageId: 'sales-marketing', label: 'Sales agency appointed', requiredToProgress: false },
  { stageId: 'sales-marketing', label: 'Display suite / show home ready', requiredToProgress: false },
  { stageId: 'sales-marketing', label: 'Launch plan confirmed', requiredToProgress: false },

  // ── Construction ──────────────────────────────────────────────────────────
  { stageId: 'construction', label: 'Construction contract complete', requiredToProgress: true },
  { stageId: 'construction', label: 'Contractor engagement complete', requiredToProgress: false },
  { stageId: 'construction', label: 'Procurement strategy confirmed', requiredToProgress: false },
  { stageId: 'construction', label: 'Programme approved', requiredToProgress: false },
  { stageId: 'construction', label: 'Finance drawdown ready', requiredToProgress: false },
  { stageId: 'construction', label: 'Site-specific safety plan uploaded', requiredToProgress: false },
  { stageId: 'construction', label: 'Traffic management plan uploaded', requiredToProgress: false },
  { stageId: 'construction', label: 'Pre-start meeting complete', requiredToProgress: true },
  { stageId: 'construction', label: 'Geotech complete', requiredToProgress: false },
  { stageId: 'construction', label: 'Survey complete', requiredToProgress: false },
  { stageId: 'construction', label: 'Engineering complete for construction', requiredToProgress: false },
  { stageId: 'construction', label: 'Building consent issued', requiredToProgress: true },
  { stageId: 'construction', label: 'Site possession', requiredToProgress: false },
  { stageId: 'construction', label: 'Site established', requiredToProgress: false },
  { stageId: 'construction', label: 'Construction commenced', requiredToProgress: true },
  { stageId: 'construction', label: 'Major milestones confirmed', requiredToProgress: false },

  // ── Settlement & Handover ─────────────────────────────────────────────────
  { stageId: 'settlement-handover', label: 'CCC documentation complete', requiredToProgress: true },
  { stageId: 'settlement-handover', label: 'Code Compliance Certificate issued', requiredToProgress: true },
  { stageId: 'settlement-handover', label: 'Handover documents complete', requiredToProgress: false },
  { stageId: 'settlement-handover', label: 'Warranties / manuals uploaded', requiredToProgress: false },
  { stageId: 'settlement-handover', label: 'Final producer statements complete', requiredToProgress: true },
  { stageId: 'settlement-handover', label: 'As-builts complete', requiredToProgress: true },
  { stageId: 'settlement-handover', label: 'Practical completion signed off', requiredToProgress: true },
  { stageId: 'settlement-handover', label: 'Settlement requirements complete', requiredToProgress: false },
  { stageId: 'settlement-handover', label: 'Sales handover complete', requiredToProgress: false },
  { stageId: 'settlement-handover', label: 'Final project closeout complete', requiredToProgress: false },
]
