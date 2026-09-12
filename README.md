# Accubits Invent Lab — Batch QC & Handover Suite (Web Edition)

> **Zero-Server, 100% Client-Side Web Application**

---

## Overview

The **Web Edition** of the DPCB Batch QC & Handover Suite brings the full functionality of the desktop utility to the web browser. Colleagues can access the tool concurrently across multiple lab benches without needing Python, PyQt6, or ReportLab installed.

### Key Capabilities:
- **100% Offline & Client-Side:** Generates official 2-page PDF inspection checklists, guidelines PDFs, and serialized CSV manifests directly inside the browser using bundled `jsPDF` and `JSZip`.
- **Exact QMS Checklist Specification:**
  - Standardized Stage 1–6 verification protocols.
  - 3-Tier Sign-Off hierarchy: Inspector / Technician → Lead Product Engineer (**Kezin B Wilson**) → MS Team Receiver.
  - Page 2 matrix with blank manual pen entry columns (`minCellHeight: 6.5mm`) for cleanroom benchtop ticking.
  - Zero mention of surface finish.
- **One-Click Batch ZIP Package:** Bundles `checklist.pdf`, `guidelines.pdf`, and `batch_summary.csv` into `<Batch_ID>_Package.zip`.
- **Live Browser Database:** Persists batch history and serial counters in browser `localStorage`.
- **Safe Database Archival & Reset:** Prevents data loss by automatically creating and downloading a timestamped Markdown backup (`batch_registry_archived_*.md`) before clearing active records.
- **Markdown Database Sync:** Easily export and import `batch_registry.md` across workstations.

---

## Role-Based Access Control (RBAC)

The station implements strict role-based access control to maintain inspection integrity and traceability:

- **Lead Product Engineer / Administrator**:
  - Full access to station configuration, serial counter management, and safe database archival.
  - Ability to export master Markdown registries (`batch_registry.md`) and summary CSV manifests.
- **QC Inspector / Technician**:
  - Streamlined benchtop view focused purely on batch execution and package generation.
  - Administrative tools and database modification options are hidden to ensure a tamper-resistant environment.

### Operational Features:
- **Tamper-Resistant Traceability**: Manual inspector dropdown selection is eliminated; the inspector identity is strictly tied to the verified active operator session.
- **Audit Consistency**: All generated PDF checklists and exported CSV logs automatically record the authenticated operator's name and role.
- **Session Persistence**: Sessions remain securely stored in local browser state until the operator signs out.

---

*Accubits Invent Lab  |  Quality Control Division*  
*Confidential — Accubits Invent Lab*
