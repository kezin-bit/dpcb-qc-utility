# Accubits Invent Lab — Batch QC & Handover Suite (Web Edition)

> **Zero-Server, 100% Client-Side Web Application**  
> **Hostable directly on GitHub Pages or runnable locally in any browser.**

---

## 🌟 Overview

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
- **Safe Database Archival & Reset ("Delete All Data"):** Prevents data loss by automatically creating and downloading a timestamped Markdown backup (`batch_registry_archived_*.md`) before clearing active records.
- **Markdown Database Sync:** Easily export and import `batch_registry.md` across colleagues' workstations.

---

## 🚀 How to Host on GitHub Pages (Parallel Work)

To let your team open this in their web browsers simultaneously:

### Method A: Host this `webpage` folder directly
1. Commit and push the repository to GitHub:
   ```bash
   git add projects/QC/dpcb-assembly/batch-qc-utility/webpage
   git commit -m "Deploy DPCB Batch QC Web Suite"
   git push origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - If the `webpage` folder is placed in `/docs` or the root of a `gh-pages` branch, select that branch and folder, then click **Save**.
3. GitHub Pages will provide a live URL (e.g., `https://<your-org>.github.io/<repo-name>/webpage/`).
4. Any team member can open the link in Chrome, Edge, Safari, or Firefox to generate packages simultaneously.

---

## 💻 Running Locally (Offline / Benchtop Mode)

You can run the web application locally without an internet connection:

### Option 1: Direct Double-Click
Simply double-click `index.html` in Windows Explorer. It will open in your default browser and run immediately (all libraries and logos are stored locally in the `vendor/` folder).

### Option 2: Local HTTP Server (Python)
From this directory, run:
```powershell
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in your web browser.

---

## 🔄 Multi-Station Collaboration & Concurrency

When multiple technicians use the tool concurrently:
1. **Workstation Identifier:** In **Settings**, set each physical PC/laptop to a distinct identifier (e.g., `AIL-LAB-BENCH-01`, `AIL-LAB-BENCH-02`).
2. **Master Log Sync:** Click **Export Registry (.md)** at the end of the shift to download `batch_registry.md`. Team leads can import Markdown logs from other stations to combine records into a unified master database.

---

## 🔐 Role-Based Access Control (RBAC)

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
