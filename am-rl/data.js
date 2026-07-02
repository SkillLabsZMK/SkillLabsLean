/* ============================================================================
 * AM-RL Framework — Backend Data (v3.0, full rebuild)
 * ----------------------------------------------------------------------------
 * Single source of truth for the assessment tool (index.html).
 * Loaded as a plain <script> so the tool also works from file:// (no CORS).
 *
 * Structure (unchanged from v2 JSON, plus "glossary"):
 *   _meta        — framework metadata
 *   dimensions[] — id, name, short (radar label), sector (H/M/P chars),
 *                  color, experts[], domain (competence domain, matchmaking)
 *   level_names  — { dimId: [L1..L9] }
 *   questions    — { dimId: [L1..L9] }  (gating question per level)
 *   benchmarks   — { H|M|P: { dimId: number } }  (PLACEHOLDERS)
 *   glossary[]   — { abbr, full, context }  (tooltip feature)
 *
 * Question phrasing convention:
 *   L1–L3 (Exploration):    soft — "Are you aware…", "Have you begun…"
 *   L4–L6 (Implementation): action — "Have you implemented…", "Is your…"
 *   L7–L9 (Maturity):       strong — "Do you maintain…", "Have you achieved…"
 *   Never "all"/"complete" in L1–L3 — use "the main", "the key", "your relevant".
 * ========================================================================== */

window.AM_RL_DATA = {

  _meta: {
    framework: "AM-RL Framework",
    version: "3.0",
    updated: "2026-07-02",
    note: "Full rebuild from the v2.0 handover specification. D4 (Labor Safety) uses the expanded VDI 3405 Bl. 6.1–6.3 content. Benchmarks are placeholders until real anonymised network data is available.",
    scale: { min: 1, max: 9, bands: { "1-3": "Exploration", "4-6": "Implementation", "7-9": "Maturity" } }
  },

  dimensions: [
    { id: "general_am",     name: "General AM TRL",          short: "AM TRL",    sector: "HMP", color: "#1B365D", domain: "C1", experts: ["AM Process Expert", "Materials Specialist"] },
    { id: "sustainability", name: "Sustainability RL",       short: "Sustain.",  sector: "HMP", color: "#2E7D5B", domain: "C2", experts: ["Sustainability Advisor"] },
    { id: "regulatory",     name: "Regulatory RL",           short: "Regulat.",  sector: "HMP", color: "#8E3B46", domain: "C3", experts: ["MDR/FDA Regulatory Expert", "Regulatory Affairs Specialist"] },
    { id: "labor_safety",   name: "Labor Safety RL",         short: "Safety",    sector: "HMP", color: "#C0392B", domain: "C4", experts: ["OHS / Safety Expert", "ATEX Specialist"] },
    { id: "clinical",       name: "Clinical Integration RL", short: "Clinical",  sector: "H",   color: "#1F7A8C", domain: "C5", experts: ["Clinical AM Advisor", "Surgical Planning Expert"] },
    { id: "qm",             name: "QM Readiness RL",         short: "QM",        sector: "HMP", color: "#5B4A8A", domain: "C3", experts: ["QMS / ISO 13485 Expert", "Quality Assurance Specialist"] },
    { id: "equipment",      name: "Equipment RL",            short: "Equip.",    sector: "HMP", color: "#7A6C2F", domain: "C1", experts: ["AM Process Expert", "Equipment Specialist"] },
    { id: "staff",          name: "Staff RL",                short: "Staff",     sector: "HMP", color: "#B26A2B", domain: "C6", experts: ["AM Training & Education Expert"] },
    { id: "it",             name: "IT Integration RL",       short: "IT",        sector: "HMP", color: "#2F6DA0", domain: "C7", experts: ["AM IT / Digital Expert", "Cybersecurity Specialist"] },
    { id: "poc",            name: "PoC AM RL",               short: "PoC",       sector: "H",   color: "#3E8E6E", domain: "C5", experts: ["PoC AM Expert", "Clinical AM Advisor"] },
    { id: "biotech",        name: "Biotech RL",              short: "Biotech",   sector: "MP",  color: "#67597A", domain: "C8", experts: ["Biotech / Biomaterials Expert"] },
    { id: "ai",             name: "AI/Automation RL",        short: "AI/Auto",   sector: "HMP", color: "#455A64", domain: "C7", experts: ["AI/ML Expert", "Automation Engineer"] },
    { id: "gmp",            name: "GMP Readiness RL",        short: "GMP",       sector: "P",   color: "#7D3C98", domain: "C3", experts: ["GMP / Pharma Expert", "Qualified Person (QP)"] },
    { id: "service",        name: "Service & Market RL",     short: "Service",   sector: "HMP", color: "#B08A2E", domain: "C9", experts: ["Market Access Expert", "Health Economics Specialist"] },
    { id: "funding",        name: "Funding RL",              short: "Funding",   sector: "HMP", color: "#E8792F", domain: "C9", experts: ["EU Funding & Grant Expert"] }
  ],

  level_names: {
    general_am: [
      "Technology Awareness", "Use-Case Exploration", "Feasibility Assessment",
      "First Prototyping", "Repeatable Workflow", "Pre-Series Validation",
      "Routine Production", "Optimised Operations", "Strategic Integration"
    ],
    sustainability: [
      "Impact Awareness", "Footprint Baseline", "Sustainability Levers",
      "First Measures", "Resource Monitoring", "Targets & KPIs",
      "Regular Reporting", "Certified Management", "Circular Operations"
    ],
    regulatory: [
      "Regulatory Awareness", "Applicability Mapping", "Product Classification",
      "Regulatory Strategy", "Technical Documentation", "Conformity Assessment",
      "Approved & Surveilled", "Multi-Market Approvals", "Proactive Regulatory Excellence"
    ],
    labor_safety: [
      "Hazard Awareness", "Risk Assessment Started", "Regulatory & Standards Mapping",
      "Technical Controls", "Organisational Controls", "PPE & Safe Behaviour",
      "Monitoring & Health Surveillance", "Certified OHS Integration", "Proactive Safety Culture"
    ],
    clinical: [
      "Clinical Awareness", "Clinician Engagement", "Pathway & Evidence Mapping",
      "First Clinical Cases", "Planning Integration", "Outcome Data Collection",
      "Routine Clinical Service", "Demonstrated Clinical Benefit", "Embedded Clinical Governance"
    ],
    qm: [
      "QMS Awareness", "Procedure Drafting", "Gap Analysis",
      "Core QM Procedures", "Process Validation", "Operational QMS",
      "Certified QMS", "Risk & CAPA Maturity", "Continuously Improving QMS"
    ],
    equipment: [
      "Equipment Awareness", "Requirements Definition", "Facility Planning",
      "Installation & Commissioning", "Qualification & Maintenance", "Full Process Chain",
      "Qualified Fleet Operations", "Capacity & Performance Management", "Lifecycle Strategy"
    ],
    staff: [
      "Skills Awareness", "Training Needs Analysis", "Competence Matrix",
      "Key Staff Trained", "Structured Competence Records", "Dedicated AM Roles",
      "Continuous Education", "Internal Training Capability", "Recognised Expertise"
    ],
    it: [
      "Digital Chain Awareness", "Data Flow Mapping", "Integration Requirements",
      "Core Software Chain", "Systems Integration", "Validated Data Integrity",
      "Traceable Digital Thread", "Automated Data Handling", "End-to-End Digital Platform"
    ],
    poc: [
      "PoC Concept Awareness", "Scope Definition", "Exemption Requirements",
      "Documented Justification", "PoC Quality Elements", "Governance Established",
      "Routine PoC Production", "Externally Audited", "Certified PoC Centre"
    ],
    biotech: [
      "Biofabrication Awareness", "Biomaterial Screening", "Biocompatibility Requirements",
      "Biocompatibility Testing", "Validated Bioprocessing", "Preclinical Evidence",
      "Clinical-Grade Capability", "Regulatory Milestones", "Clinical-Scale Operations"
    ],
    ai: [
      "Opportunity Awareness", "Task Identification", "Data & Compliance Mapping",
      "First AI-Assisted Tools", "In-Process Monitoring", "Validated AI Software",
      "Supervised AI Production", "Closed-Loop Optimisation", "Governed Continuous Learning"
    ],
    gmp: [
      "GMP Awareness", "Gap Analysis", "Validation Requirements",
      "GMP-Compliant Documentation", "Equipment & Process Qualification", "Inspection Readiness",
      "GMP Production & QP Release", "Multi-Product GMP Operations", "Continuous GMP Verification"
    ],
    service: [
      "Value Proposition Awareness", "Demand Analysis", "Business Model & Reimbursement",
      "Pilot Service", "SLAs & Cost Accounting", "Sustainable Revenue",
      "Growing Portfolio", "Market Expansion", "Scalable Business Line"
    ],
    funding: [
      "Funding Landscape Awareness", "Call Identification", "Programme Requirements",
      "Outline & Consortium Building", "Proposal Submitted", "Funded Project Running",
      "Application & Grant Pipeline", "Repeated Funding Success", "Long-Term Funding Strategy"
    ]
  },

  questions: {
    general_am: [
      "Are you aware of the main AM technologies (e.g. PBF, SLA/DLP, FFF, binder jetting) relevant to your field?",
      "Have you begun identifying potential AM use cases in your organisation?",
      "Do you know which AM processes and materials fit your key use cases?",
      "Have you produced first physical prototypes on AM equipment, in-house or via partners?",
      "Have you implemented a repeatable workflow from design/data to printed part?",
      "Is your AM process validated for small-series production of representative parts?",
      "Do you maintain routine AM production with documented process control?",
      "Have you achieved stable quality metrics and continuous improvement across your AM production?",
      "Is AM operating as a fully integrated, strategically managed production capability in your organisation?"
    ],
    sustainability: [
      "Are you aware of the main sustainability aspects of AM (energy use, material waste, recyclability)?",
      "Have you begun assessing the environmental footprint of your planned AM activities?",
      "Do you know the key sustainability levers for your AM operations (material reuse, build optimisation, logistics)?",
      "Have you implemented first sustainability measures, such as powder/resin recycling or optimised build packing?",
      "Is systematic tracking of energy, material and waste streams implemented for your AM operations?",
      "Have you implemented sustainability targets and KPIs for your AM activities?",
      "Do you maintain regular sustainability reporting that covers your AM operations?",
      "Have you achieved a recognised environmental certification (e.g. ISO 14001) covering your AM operations?",
      "Is your AM operation running on circular-economy principles with verified impact reduction?"
    ],
    regulatory: [
      "Are you aware of the main regulatory frameworks (MDR, FDA) relevant to AM in your sector?",
      "Have you begun mapping which regulations and standards apply to your AM use cases?",
      "Do you know the regulatory classification of your intended AM products or devices?",
      "Have you implemented a regulatory strategy including a documentation and evidence plan?",
      "Is your technical documentation being compiled according to the applicable requirements (e.g. MDR Annex II/III)?",
      "Have you implemented the conformity assessment route (e.g. notified body engaged, submission prepared)?",
      "Do you maintain approved/CE-marked AM products with active post-market surveillance?",
      "Have you achieved approvals in multiple markets (e.g. EU plus US or other regions)?",
      "Is your regulatory management operating proactively, including contribution to standards and early dialogue with authorities?"
    ],
    labor_safety: [
      "Are you aware of the AM-specific hazards (metal/polymer powders, resins, VOC/particle emissions, laser radiation, hot surfaces) of the processes relevant to you — Metal PBF, Polymer PBF, resin-based (SLA/DLP/MJ), FFF, bioprinting, binder jetting?",
      "Have you begun a documented risk assessment (Gefährdungsbeurteilung per ArbSchG/GefStoffV) for your relevant AM processes, including post-processing?",
      "Do you know the regulations and standards applicable to your processes (GefStoffV, OStrV, BetrSichV, TRGS series, DGUV rules, VDI 3405 Bl. 6.1–6.3)?",
      "Have you implemented substitution and technical controls following the STOP hierarchy — e.g. enclosed machines, local exhaust ventilation, inert powder handling, ATEX-rated equipment where required?",
      "Are organisational controls implemented — restricted access, hygiene and cleaning plan, written operating instructions (Betriebsanweisungen), and documented staff instruction (Unterweisung)?",
      "Is task-specific PPE specified, provided and its correct use verified for powder handling, resin processing and post-processing (e.g. FFP3, nitrile gloves, eye protection, laser safety)?",
      "Do you maintain exposure monitoring (dust/VOC measurements), ATEX zoning where required, and occupational health surveillance (arbeitsmedizinische Vorsorge) for exposed staff?",
      "Have you achieved integration of AM safety into a certified OHS management system (e.g. ISO 45001), including internal audits and incident/near-miss learning?",
      "Is your safety management operating proactively across the full AM chain — including medical overlays such as bioprinting and patient-material handling — with continuous review and improvement?"
    ],
    clinical: [
      "Are you aware of the main clinical applications of AM (anatomical models, surgical guides, implants, prosthetics)?",
      "Have you begun engaging clinicians to identify concrete clinical needs for AM?",
      "Do you know the clinical pathways where AM adds value and the supporting evidence base?",
      "Have you implemented first clinical cases (e.g. anatomical models or guides) under a defined protocol?",
      "Is AM integrated into the treatment-planning pathway for selected indications?",
      "Have you implemented systematic clinical evaluation and outcome data collection for your AM applications?",
      "Do you maintain a routine clinical AM service used across departments or indications?",
      "Have you achieved measurable, documented improvements in clinical outcomes or workflows attributable to AM?",
      "Is AM fully embedded in your clinical pathways with multi-disciplinary governance and defined clinical ownership?"
    ],
    qm: [
      "Are you aware of the quality management requirements (e.g. ISO 13485) relevant to AM in your sector?",
      "Have you begun documenting the key procedures of your AM workflow?",
      "Do you know the gaps between your current quality system and the requirements applicable to AM?",
      "Have you implemented core QM procedures (document control, records, change control) for your AM workflow?",
      "Is process validation (IQ/OQ/PQ) implemented for your relevant AM processes?",
      "Is a full quality management system covering AM operational, including internal audits?",
      "Do you maintain certification (e.g. ISO 13485) with AM within the certified scope?",
      "Have you achieved mature risk management (ISO 14971) and an effective CAPA system for AM?",
      "Is your QMS operating in continuous improvement mode, including qualified suppliers across the AM chain?"
    ],
    equipment: [
      "Are you aware of the equipment classes (printers, post-processing, testing) needed for your intended applications?",
      "Have you begun defining user requirements (URS) for your key equipment?",
      "Do you know the facility requirements — space, power, gases, ventilation, zoning — for your planned equipment?",
      "Have you implemented installation and commissioning of your first AM equipment?",
      "Is equipment qualification (IQ/OQ) implemented, with a maintenance and calibration plan in place?",
      "Is your full process chain established, including post-processing, cleaning and quality inspection equipment?",
      "Do you maintain a qualified equipment fleet with preventive maintenance and calibration schedules?",
      "Have you achieved capacity management with redundancy and performance monitoring (e.g. OEE) across your fleet?",
      "Is your equipment strategy operating with full lifecycle management, including planned technology refresh?"
    ],
    staff: [
      "Are you aware of the skill profiles needed to run your intended AM activities?",
      "Have you begun identifying the training needs of your relevant team members?",
      "Do you know the roles and competences required, documented in a competence matrix?",
      "Have your key staff been trained on your relevant AM processes and software?",
      "Is structured onboarding with documented competence records implemented for AM roles?",
      "Have you implemented dedicated AM roles with certified or externally validated training?",
      "Do you maintain a continuous education programme with periodic competence assessments?",
      "Have you achieved internal training capability, including knowledge management and succession planning?",
      "Is staff development operating strategically, with recognised expertise (teaching, publications, standards work)?"
    ],
    it: [
      "Are you aware of the digital process chain for AM (imaging/design → segmentation/CAD → preparation → print → documentation)?",
      "Have you begun mapping your data flows and the software required along the chain?",
      "Do you know your integration, cybersecurity and data-protection requirements (e.g. GDPR, patient data handling)?",
      "Have you implemented the core software chain with defined data formats and interfaces?",
      "Is integration with your primary systems (e.g. PACS/HIS or PLM/ERP) implemented?",
      "Have you implemented validated data integrity — access control, audit trails and backups — along the AM chain?",
      "Do you maintain an integrated digital thread with full traceability from order/patient to finished part?",
      "Have you achieved automation of data handoffs with monitoring and error handling across the chain?",
      "Is your IT operating as a validated end-to-end digital platform, including analytics and reporting?"
    ],
    poc: [
      "Are you aware of the point-of-care manufacturing concept and its regulatory implications (e.g. MDR Article 5(5))?",
      "Have you begun defining the scope of devices you intend to produce in-house?",
      "Do you know the requirements of the health-institution exemption relevant to your planned devices?",
      "Have you implemented documented justification and GSPR conformity evidence for your first in-house devices?",
      "Are the quality-system elements required for PoC production implemented and documented?",
      "Have you implemented governance for in-house production, e.g. a review board with clinical, quality and regulatory roles?",
      "Do you maintain routine PoC production with full documentation, traceability and surveillance of produced devices?",
      "Have you achieved a successful external audit or benchmark of your PoC operations?",
      "Is your PoC unit operating as a recognised in-house manufacturing centre, serving multiple clinics or sites?"
    ],
    biotech: [
      "Are you aware of the relevance of bioprinting and biomaterials for your product portfolio?",
      "Have you begun evaluating candidate biomaterials for your applications?",
      "Do you know the biocompatibility and sterilisation requirements (e.g. ISO 10993) for your intended products?",
      "Have you implemented biocompatibility testing for your candidate materials?",
      "Is validated processing of your biomaterials implemented, including sterility assurance where needed?",
      "Have you implemented preclinical studies generating evidence for your bio-based AM products?",
      "Do you maintain clinical-grade development or production capability for bio-based AM products?",
      "Have you achieved key regulatory milestones for your biologic/device combination products?",
      "Is your biotech AM activity operating at clinical or commercial scale?"
    ],
    ai: [
      "Are you aware of the main AI and automation opportunities in the AM workflow (segmentation, design, nesting, QA)?",
      "Have you begun identifying the tasks in your workflow that are suitable for AI support or automation?",
      "Do you know the data requirements and regulatory constraints (e.g. EU AI Act, medical device software rules) for your intended AI use?",
      "Have you implemented first AI-assisted tools in your AM workflow?",
      "Is automated in-process monitoring (e.g. melt-pool or layer imaging) implemented on your relevant machines?",
      "Have you implemented validation of your AI tools according to a software lifecycle process (e.g. IEC 62304)?",
      "Do you maintain AI-supported production with defined human oversight and ongoing performance monitoring?",
      "Have you achieved closed-loop process optimisation based on monitored production data?",
      "Is AI/automation operating across your AM chain under a governance framework for continuous, controlled learning?"
    ],
    gmp: [
      "Are you aware of the GMP implications of AM for pharmaceutical applications (e.g. printed dosage forms, devices)?",
      "Have you begun a gap analysis between GMP requirements and your intended AM process?",
      "Do you know the qualification and validation requirements applicable to your AM setup (EU GMP annexes, GAMP 5)?",
      "Have you implemented GMP-compliant documentation for an AM pilot process?",
      "Is qualification of your AM equipment and process (DQ/IQ/OQ/PQ) implemented?",
      "Have you implemented inspection readiness, with the AM process included in your manufacturing licence scope or application?",
      "Do you maintain GMP production with AM, including batch certification by a Qualified Person (QP)?",
      "Have you achieved GMP AM operations across multiple products or sites?",
      "Is your GMP AM operation running with continuous process verification and a strong inspection track record?"
    ],
    service: [
      "Are you aware of the value proposition your AM capability could offer internally or to the market?",
      "Have you begun analysing demand, stakeholders and competitors for your intended AM offering?",
      "Do you know your business model and the relevant reimbursement or funding pathways?",
      "Have you implemented a pilot service with defined offerings and pricing?",
      "Are service level agreements and cost accounting implemented for your AM services?",
      "Have you implemented a service that demonstrably covers its costs or generates sustainable revenue?",
      "Do you maintain a growing service portfolio with structured customer or user management?",
      "Have you achieved expansion into new segments, indications or regions?",
      "Is your AM service operating as a scalable, strategically positioned business line?"
    ],
    funding: [
      "Are you aware of the main funding sources (EU, national, regional) relevant to your AM activities?",
      "Have you begun identifying specific calls that match your roadmap (e.g. Eurostars, Horizon Europe, EIC)?",
      "Do you know the requirements of your target programmes — eligibility, TRL expectations, consortium composition?",
      "Have you implemented a project outline and partner search for a specific call?",
      "Have you submitted a full proposal to your target programme?",
      "Is a funded project running with compliant project and financial management?",
      "Do you maintain a pipeline of applications alongside your running grants?",
      "Have you achieved repeated funding success across programmes, including coordinator or work-package-lead roles?",
      "Is your funding strategy operating long-term, combining grants with co-funding and private investment?"
    ]
  },

  /* PLACEHOLDER benchmark values — replace with real anonymised network data. */
  benchmarks: {
    H: {
      general_am: 4.2, sustainability: 2.8, regulatory: 3.5, labor_safety: 4.0,
      clinical: 4.5, qm: 3.8, equipment: 4.3, staff: 3.6, it: 3.2, poc: 3.4,
      ai: 2.4, service: 2.9, funding: 2.6
    },
    M: {
      general_am: 5.1, sustainability: 3.2, regulatory: 5.4, labor_safety: 4.6,
      qm: 5.6, equipment: 5.0, staff: 4.4, it: 4.1, biotech: 3.0,
      ai: 3.1, service: 4.2, funding: 3.3
    },
    P: {
      general_am: 3.6, sustainability: 3.4, regulatory: 4.8, labor_safety: 4.4,
      qm: 5.0, equipment: 3.9, staff: 3.7, it: 3.8, biotech: 3.5,
      ai: 2.9, gmp: 4.6, service: 3.1, funding: 3.0
    }
  },

  glossary: [
    { abbr: "AM",        full: "Additive Manufacturing", context: "Layer-by-layer fabrication technologies, commonly called 3D printing" },
    { abbr: "TRL",       full: "Technology Readiness Level", context: "1–9 maturity scale for technologies, used by EU and NASA" },
    { abbr: "RL",        full: "Readiness Level", context: "Generic 1–9 maturity scale used for each framework dimension" },
    { abbr: "MDR",       full: "Medical Device Regulation (EU 2017/745)", context: "EU regulation governing medical devices" },
    { abbr: "FDA",       full: "Food and Drug Administration", context: "US regulatory authority for medical products" },
    { abbr: "CE",        full: "Conformité Européenne", context: "EU conformity marking required to place devices on the market" },
    { abbr: "GSPR",      full: "General Safety and Performance Requirements", context: "MDR Annex I requirements every device must meet" },
    { abbr: "PMS",       full: "Post-Market Surveillance", context: "Systematic monitoring of devices after market release" },
    { abbr: "ATEX",      full: "ATmosphères EXplosibles", context: "EU directives for explosive atmospheres, relevant for metal powder handling" },
    { abbr: "ArbSchG",   full: "Arbeitsschutzgesetz", context: "German Occupational Health and Safety Act" },
    { abbr: "GefStoffV", full: "Gefahrstoffverordnung", context: "German Hazardous Substances Ordinance" },
    { abbr: "OStrV",     full: "Arbeitsschutzverordnung zu künstlicher optischer Strahlung", context: "German ordinance on artificial optical radiation, incl. lasers" },
    { abbr: "BetrSichV", full: "Betriebssicherheitsverordnung", context: "German Industrial Safety Ordinance for work equipment" },
    { abbr: "TRGS",      full: "Technische Regeln für Gefahrstoffe", context: "German technical rules for hazardous substances (e.g. TRGS 400, 510, 720)" },
    { abbr: "DGUV",      full: "Deutsche Gesetzliche Unfallversicherung", context: "German statutory accident insurance; publishes safety rules" },
    { abbr: "VDI",       full: "Verein Deutscher Ingenieure", context: "Association of German Engineers; VDI 3405 covers AM incl. user safety (Bl. 6.1–6.3)" },
    { abbr: "STOP",      full: "Substitution, Technical, Organisational, Personal", context: "Hierarchy of occupational safety controls" },
    { abbr: "PPE",       full: "Personal Protective Equipment", context: "Last layer of the STOP hierarchy (gloves, respirators, eye protection)" },
    { abbr: "LEV",       full: "Local Exhaust Ventilation", context: "Extraction at the emission source, e.g. at powder stations" },
    { abbr: "FFP3",      full: "Filtering Facepiece Particles, Class 3", context: "Highest-class particle-filtering respirator per EN 149" },
    { abbr: "VOC",       full: "Volatile Organic Compounds", context: "Emissions from resins and polymer processing" },
    { abbr: "OHS",       full: "Occupational Health and Safety", context: "Workplace safety discipline; managed via systems like ISO 45001" },
    { abbr: "PBF",       full: "Powder Bed Fusion", context: "AM process family melting powder layers with laser or electron beam" },
    { abbr: "SLM",       full: "Selective Laser Melting", context: "Laser-based metal powder bed fusion" },
    { abbr: "EBM",       full: "Electron Beam Melting", context: "Electron-beam-based metal powder bed fusion" },
    { abbr: "SLS",       full: "Selective Laser Sintering", context: "Laser-based polymer powder bed fusion" },
    { abbr: "MJF",       full: "Multi Jet Fusion", context: "Polymer powder bed process using fusing agents and IR energy" },
    { abbr: "SLA",       full: "Stereolithography", context: "Resin-based AM cured by laser" },
    { abbr: "DLP",       full: "Digital Light Processing", context: "Resin-based AM cured by projected light" },
    { abbr: "MJ",        full: "Material Jetting", context: "AM process jetting and curing photopolymer droplets" },
    { abbr: "FFF",       full: "Fused Filament Fabrication", context: "Extrusion-based AM, also known as FDM" },
    { abbr: "FDM",       full: "Fused Deposition Modeling", context: "Trade name for extrusion-based AM (FFF)" },
    { abbr: "QMS",       full: "Quality Management System", context: "Documented system of processes ensuring product quality" },
    { abbr: "ISO 13485", full: "Medical devices — Quality management systems", context: "QMS standard for medical device manufacturers" },
    { abbr: "ISO 14971", full: "Medical devices — Application of risk management", context: "Risk management standard for medical devices" },
    { abbr: "ISO 10993", full: "Biological evaluation of medical devices", context: "Standard series for biocompatibility evaluation" },
    { abbr: "ISO 45001", full: "Occupational health and safety management systems", context: "Certifiable OHS management standard" },
    { abbr: "ISO 14001", full: "Environmental management systems", context: "Certifiable environmental management standard" },
    { abbr: "CAPA",      full: "Corrective and Preventive Action", context: "QMS process for fixing and preventing nonconformities" },
    { abbr: "DQ",        full: "Design Qualification", context: "Documented verification that a design meets requirements" },
    { abbr: "IQ",        full: "Installation Qualification", context: "Documented verification of correct installation" },
    { abbr: "OQ",        full: "Operational Qualification", context: "Documented verification of operation within specified limits" },
    { abbr: "PQ",        full: "Performance Qualification", context: "Documented verification of consistent performance in routine use" },
    { abbr: "URS",       full: "User Requirements Specification", context: "Document defining what equipment or software must do" },
    { abbr: "OEE",       full: "Overall Equipment Effectiveness", context: "Availability × performance × quality metric for equipment" },
    { abbr: "PACS",      full: "Picture Archiving and Communication System", context: "Hospital system for storing and sharing medical images" },
    { abbr: "HIS",       full: "Hospital Information System", context: "Central IT system managing hospital data and workflows" },
    { abbr: "DICOM",     full: "Digital Imaging and Communications in Medicine", context: "Standard format/protocol for medical imaging data" },
    { abbr: "CAD",       full: "Computer-Aided Design", context: "Software-based design of parts and devices" },
    { abbr: "STL",       full: "Stereolithography file format", context: "Common triangle-mesh file format for AM" },
    { abbr: "PLM",       full: "Product Lifecycle Management", context: "System managing product data across its lifecycle" },
    { abbr: "ERP",       full: "Enterprise Resource Planning", context: "System managing business processes and resources" },
    { abbr: "GDPR",      full: "General Data Protection Regulation (EU 2016/679)", context: "EU data protection law, relevant for patient data" },
    { abbr: "GMP",       full: "Good Manufacturing Practice", context: "Quality rules for pharmaceutical manufacturing" },
    { abbr: "GAMP",      full: "Good Automated Manufacturing Practice", context: "Guidance for validating computerised systems (GAMP 5)" },
    { abbr: "QP",        full: "Qualified Person", context: "Person legally responsible for pharmaceutical batch certification in the EU" },
    { abbr: "GLP",       full: "Good Laboratory Practice", context: "Quality system for non-clinical safety studies" },
    { abbr: "IEC 62304", full: "Medical device software — Software life cycle processes", context: "Standard for medical software development and maintenance" },
    { abbr: "AI",        full: "Artificial Intelligence", context: "Machine-based systems performing tasks that normally require human intelligence" },
    { abbr: "ML",        full: "Machine Learning", context: "AI methods that learn patterns from data" },
    { abbr: "PoC",       full: "Point of Care", context: "In-house manufacturing within a health institution (MDR Art. 5(5))" },
    { abbr: "HTA",       full: "Health Technology Assessment", context: "Systematic evaluation of health technologies for value and reimbursement" },
    { abbr: "DRG",       full: "Diagnosis Related Groups", context: "Case-based hospital reimbursement system" },
    { abbr: "SME",       full: "Small and Medium-sized Enterprise", context: "EU company category; key eligibility criterion in funding calls" },
    { abbr: "EIC",       full: "European Innovation Council", context: "EU funding body for breakthrough innovation (Accelerator, Pathfinder)" },
    { abbr: "KPI",       full: "Key Performance Indicator", context: "Quantified metric used to track performance against targets" },
    { abbr: "IR",        full: "Infrared", context: "Radiation used e.g. for fusing energy in MJF" },
    { abbr: "EN 149",    full: "European standard for filtering half masks", context: "Defines FFP1–FFP3 respirator classes" },
    { abbr: "HEPA",      full: "High-Efficiency Particulate Air (filter)", context: "Filter class used in AM extraction and vacuum systems" }
  ]
};
