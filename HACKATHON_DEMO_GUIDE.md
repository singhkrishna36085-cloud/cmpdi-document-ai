# CMPDI / CIL Document AI — Hackathon Demo Guide

## Overview
This document provides a 7-step end-to-end demonstration flow for the CMPDI / Coal India Limited Document AI Platform, powered strictly by the authoritative Q1 2026 mine dataset.

---

## 7-Step Hackathon Demonstration Flow

### Step 1: Secure Authentication & Role-Based Access Control (RBAC)
- **Action**: Log in as `HOD` user (`hod@cmpdi.co.in` / `Hod@12345`) vs `Normal` user (`user@cmpdi.co.in` / `User@12345`).
- **Demonstrate**: 
  - JWT Bearer token generation.
  - HOD users see confidential mine documents and security badges.
  - Normal users are isolated from confidential documents with 403 Forbidden enforcement on restricted endpoints.

### Step 2: Intelligent Document Ingestion & Multimodal OCR Processing
- **Action**: Navigate to `/documents` or `/documents/upload`.
- **Demonstrate**: 
  - Upload Excel (`.xlsx`), CSV (`.csv`), PDF, or Image files.
  - Automated file type detection, structured tabular parsing, PaddleOCR extraction, and PostgreSQL chunking.
  - Generates 66 dense vector embeddings into FAISS (`all-MiniLM-L6-v2`).

### Step 3: Data Quality, Rules Engine & Discrepancy Quarantine
- **Action**: Navigate to `/validation`.
- **Demonstrate**: 
  - System audits 10 operational compliance rules (Stripping ratio math consistency, positive tonnage, seam thickness range, negative overburden flags).
  - Flags non-blocking warnings while preserving PostgreSQL transactional integrity.

### Step 4: Executive Dashboard & Multi-Mine Operations Analytics
- **Action**: Navigate to `/` (Dashboard).
- **Demonstrate**: 
  - Dynamic PostgreSQL aggregation across Q1 2026 dataset:
    - **Total Raw Coal Produced**: 15,167,000 Tonnes
    - **Total Overburden Removed**: 39,880,000 m³
    - **Average Stated Stripping Ratio**: 2.60
    - **Aggregate Stripping Ratio**: 2.63
    - **Average Seam Thickness**: 6.94 m
  - Subsidiary breakdowns (SECL, NCL, WCL, C compiler metrics).

### Step 5: Evidence-Grounded AI Assistant & Source Citation Traceability
- **Action**: Navigate to `/assistant`.
- **Demonstrate**: 
  - Click operational prompt chips:
    - *"Which project produced the highest coal in Q1 2026?"* (Gevra Expansion: 3,915,000 t)
    - *"Compare production and stripping ratio between Gevra Expansion and Nigahi."*
    - *"What safety incidents or hazards occurred at Ukni?"* (Haul truck near-miss, driver retraining)
    - *"List all projects with average coal seam thickness above 8 metres."*
  - Expand **Evidence Citations & Traceability** to view exact document IDs, sheet names, page numbers, and cosine similarity relevance match scores.

### Step 6: Cross-Document Intelligence, Variance & Threshold Filtering
- **Action**: Navigate to `/cross-document`.
- **Demonstrate**: 
  - **Pairwise Comparison**: Select *Gevra Expansion* vs *Nigahi Project* to inspect side-by-side metric deltas and directional variance indicators.
  - **Threshold Intelligence**: Use Demo Presets (`High Output >2M t`, `Thick Seam >8m`, `High SR >2.70`) to dynamically filter structured database records.
  - **Safety & Risk Matrix**: View source-grounded safety and risk notes across all 7 projects.
  - **Conflict Detector**: Run multi-document discrepancy audit.

### Step 7: Automated Report Generation & Institutional Audit Logging
- **Action**: Navigate to `/reports` and `/audit`.
- **Demonstrate**: 
  - Generate comprehensive PDF/Markdown summary reports for Q1 2026 mine performance.
  - Inspect audit log trail recording user ID, endpoint, action timestamp, and RBAC authorization state.

---

## Authoritative Q1 2026 Dataset Reference Table

| Subsidiary | Project / Mine | Raw Coal (t) | Overburden (m³) | Stated SR | Aggregate SR | Seam (m) | Safety / Risk Highlights |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SECL** | Gevra Expansion | 3,915,000 | 9,870,000 | 2.52 | 2.52 | 12.50 | Haul road dust suppression |
| **NCL** | Nigahi Project | 2,840,000 | 7,920,000 | 2.79 | 2.79 | 8.20 | Ash trend review & explosives renewal |
| **WCL** | Ukni Deep OC | 1,120,000 | 3,450,000 | 3.08 | 3.08 | 4.80 | Haul truck near-miss & retraining |
| **CCL** | Piparwar OC | 2,150,000 | 5,100,000 | 2.37 | 2.37 | 6.40 | Slope instability in north wall |
| **BCCL** | Block II OC | 1,480,000 | 4,300,000 | 2.91 | 2.91 | 5.10 | Pit dewatering pump overhaul |
| **MCL** | Lakhanpur OC | 2,215,000 | 5,340,000 | 2.41 | 2.41 | 7.10 | Heavy rain haulage slowdown |
| **ECL** | Sonepur Bazari | 1,447,000 | 3,900,000 | 2.70 | 2.70 | 4.50 | Land acquisition delays |
| **TOTAL** | **7 Projects** | **15,167,000** | **39,880,000** | **2.60 (Avg)** | **2.63** | **6.94 (Avg)** | **100% Grounded & Traceable** |
