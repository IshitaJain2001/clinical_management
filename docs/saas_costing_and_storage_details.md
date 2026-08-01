# MediCore SaaS: Costing, Storage, and Infrastructure Details

This document provides a comprehensive analysis of the storage requirements, data types, infrastructure costs, and SaaS subscription margins for hospitals onboarded on the **MediCore (Curoxa)** platform.

---

## 1. Executive Summary

MediCore is a multi-tenant healthcare SaaS platform. The software separates hospital data logically using `tenantId` (the hospital code) across MongoDB databases and cloud object storage.

*   **Average storage cost per patient per year**: **₹0.74 ($0.009)**.
*   **Marginal cost of adding a user (doctor/staff)**: **₹0.00** (database text only).
*   **Subscription gross margins**: **>98%** (highly profitable).
*   **Recommended Storage Backend**: **Cloudflare R2** (Zero egress fees, $0.015/GB/month).

---

## 2. SaaS Subscription Plans & Limits

These pricing and resource limits are configured in the MediCore administration dashboards:

| Plan Tier | Monthly Price | Annual Price (Billed Yearly) | Doctors Limit | Staff Limit | Storage Limit | Enabled Modules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard Basic** | **₹5,000 / mo** | **₹48,000 / yr** (₹4,000/mo) | 10 | 20 | **50 GB** | Reception, Doctor, DPDP |
| **Professional** | **₹24,000 / mo** | **₹230,400 / yr** (₹19,200/mo) | 50 | 100 | **250 GB** | Basic + Pharmacy, Laboratory |
| **Enterprise Elite** | **₹50,000 / mo** | **₹480,000 / yr** (₹40,000/mo) | Unlimited (Custom) | Unlimited (Custom) | **500 GB to 1 TB+** | All Modules + Inventory, Advanced BI, Custom DB |

---

## 3. What Kind of Data is Stored?

Hospitals onboarded on MediCore store two primary categories of data: **Structured Database Records** (stored in MongoDB) and **Unstructured Documents/Scans** (stored in Object Storage).

```mermaid
graph TD
    A[Hospital Data] --> B[Structured Database: MongoDB]
    A --> C[Unstructured Files: Cloudflare R2 / S3]
    
    B --> B1[Patient Demographics & Consent]
    B --> B2[Clinical Notes & Vitals]
    B --> B3[Prescriptions & Lab Requests]
    B --> B4[HR, Payroll, & Audit Logs]
    
    C --> C1[Scanned Patient Docs & Reports]
    C --> C2[Lab Report PDF & ECG Files]
    C --> C3[Drug Licenses & GST Invoices]
    C --> C4[DICOM Medical Images (X-Rays/CTs)]
```

### A. Structured Database Records (MongoDB Atlas)
These are text-based JSON documents. They are extremely compact.
*   **Patient Profiles**: Aadhaar demographic verification details, contact info, ABHA Health ID.
*   **Visits & SOAP Notes**: Clinical history, symptoms, doctor’s assessments, diagnosis history.
*   **Vitals & Prescriptions**: Pulse, Blood Pressure, SpO2, Temperature, prescribed medicines, dosages.
*   **Financials**: Billing ledger items, procurement logs, purchase orders, GST tax details.
*   **Compliance & Logs**: DPDP consent statuses, audit trail logs of clinical access (HIPAA compliant).

### B. Unstructured Files & Scans (Object Storage)
These are binary files uploaded by staff. They occupy **99.5%** of the total storage footprint.
*   **Clinical Documents**: Scans of external records, discharge summaries, physical consent signatures (PDF/JPEG).
*   **Diagnostics**: Uploaded lab diagnostic reports, ECG traces, scans of radiological studies.
*   **High-Resolution Scans**: DICOM files (X-Rays, Ultrasounds, CT/MRI scans) - *enterprise tier only*.
*   **Compliance Uploads**: Hospital drug licenses, GST certificates, employee ID proofs.

---

## 4. Storage Estimates & Growth Calculations

Let's estimate the exact space (MBs/GBs) needed for a standard hospital with **10,000 patients** and **30,000 clinical visits** over time.

### A. Per-Unit Storage Breakdown
1.  **A Single Patient Database Profile**: ~3 KB (Text).
2.  **A Single Clinical Visit (SOAP note, Vitals, Prescriptions, Audits)**: ~5 KB (Text).
3.  **A Single Scanned Document (Discharge summary, Lab PDF, ECG photo)**: ~1.5 MB (Average).
4.  **A High-Resolution Diagnostic Scan (X-Ray/Ultrasound)**: ~15 MB.

### B. Storage Profile for an Average Patient (History of 5 Visits)
Assuming 5 clinical visits, where the patient has 3 scanned reports/documents uploaded:
$$\text{Database (JSON)} = 3\text{ KB (Profile)} + (5 \times 5\text{ KB (Visits)}) = 28\text{ KB}$$
$$\text{Documents/Scans (PDFs)} = 3 \times 1.5\text{ MB} = 4.5\text{ MB (4,500 KB)}$$
$$\textbf{Total Storage per Patient} \approx \mathbf{4.53\text{ MB}}$$

### C. Total Storage Capacity Projections

Based on different scales of onboarded hospitals:

| Metric / Scope | Small Clinic (1,000 patients) | Mid-Sized Hospital (10,000 patients) | Large Hospital (50,000 patients) |
| :--- | :--- | :--- | :--- |
| **Structured DB Records** | 28 MB | 280 MB | 1.4 GB |
| **Unstructured Document Scans** | 4.5 GB | 45.0 GB | 225.0 GB |
| **High-Res Diagnostics (CT/X-Rays)** | 1.5 GB | 15.0 GB | 75.0 GB |
| **Total Estimated Storage** | **6.0 GB** | **60.2 GB** | **301.4 GB** |
| **Recommended Subscription Plan** | **Basic Plan** (50GB limit) | **Professional Plan** (250GB limit) | **Enterprise Plan** (500GB+ limit) |

> [!NOTE]
> Under this average model, the **Basic Plan (50 GB)** easily accommodates a clinic for 3-5 years, while the **Professional Plan (250 GB)** provides plenty of runway for standard mid-sized hospitals.

---

## 5. Hosting Infrastructure Cost Breakdown

What does it cost **you** to host this data on the cloud?

### A. File Storage Cost (Cloudflare R2 vs AWS S3)
*Cloudflare R2 is highly recommended because it has zero egress (bandwidth download) charges, which are usually the hidden cost of AWS S3.*

*   **Cloudflare R2 Storage Cost**: **$0.015 / GB / month** (approx. **₹1.25 / GB / month**).
*   **AWS S3 Standard Storage Cost**: **$0.023 / GB / month** (approx. **₹1.90 / GB / month**) + **$0.09 / GB** egress transfer fees.

### B. Database Hosting Cost (MongoDB Atlas)
*   **Shared Tier (M2/M5)**: $9 - $25 / month (for development/testing up to 5GB).
*   **Dedicated Cluster (M10 - 10GB scale)**: **$60 / month** (approx. **₹5,000 / month**). Shared across all Basic and Professional tenant databases.

---

## 6. What does it cost to store one person's data?

Here are the direct marginal costs of hosting a patient or staff member:

### A. Cost Per Patient (Per Month & Per Year)
Assuming the average patient uses **4.5 MB** of file storage:
$$\text{Monthly File Cost} = 0.0045\text{ GB} \times \$0.015 = \$0.0000675 \text{ (~₹0.0056)}$$
$$\text{Annual Storage Cost} = 12 \times \text{Monthly File Cost} = \mathbf{₹0.067 \text{ per patient / year}} \text{ (6.7 Paise!)}$$

Even if a patient is highly active and uploads **50 MB** of files (e.g., chronic care or multiple scans):
$$\text{Annual Storage Cost} = 0.05\text{ GB} \times \$0.015 \times 12 = \$0.009 \text{ (~₹0.74 per patient / year)}$$

### B. Cost Per Doctor or Staff Member
*   **Account data**: ~10 KB of database text.
*   **Incremental Hosting Cost**: **₹0.00** (virtually zero).

> [!TIP]
> Since storing one active patient's documents for a whole year costs **less than ₹1 (one rupee)**, and staff accounts cost nothing, the resource limits (Doctors, Staff, Storage) placed on subscription plans are primarily designed for commercial tiering rather than actual infrastructure costs.

---

## 7. Cost vs Revenue Profit Margins

Let's look at the financial model of onboarding a single mid-sized hospital on the **Professional Plan**:

*   **Your Revenue**: **₹24,000 / month** (or ₹19,200/mo on annual billing).
*   **Your Host Infrastructure Cost** (for this hospital's storage footprint of ~60 GB):
    *   *Object Storage (60 GB on Cloudflare R2)*: $0.90 / month (**₹75 / month**).
    *   *Database Share (Pro-rated share of MongoDB cluster)*: **₹150 / month**.
    *   *Server Resources (Pro-rated share of VM/API servers)*: **₹200 / month**.
    *   **Total Infrastructure Cost**: **₹425 / month**.
*   **Gross Profit Margin**: **97.8% - 98.2%**!

> [!IMPORTANT]
> The SaaS business model for MediCore is highly scalable. The largest cost factor is customer support and onboarding/training personnel, not hosting or server costs. 

---

## 8. Summary Checklist for Onboarding

When onboarding a new hospital, use this formula to estimate their immediate database capacity requirements:

1.  **Number of Active Doctors & staff** (Determines if they fit the plan seat limitations).
2.  **Existing Paper Records** (If they plan to digitize legacy records, estimate **1.5 MB per document scan**).
3.  **Radiology/DICOM Usage** (If they upload raw CT/MRI scans directly to patient vaults, they **must** use the **Enterprise Plan** to cover higher storage volumes).
