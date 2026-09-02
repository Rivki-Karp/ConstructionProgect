# Architecture & Specification Document: Building Rehabilitation Management System
**Version:** 1.0 (Ready for Implementation) | **Status:** Approved for Development

## 1. Executive Summary
This document outlines the architecture, data models, and user experience specifications for the Building Rehabilitation Management System. Designed for three primary user tiers (Government Ministry, Municipalities, and Appraisers), the system orchestrates damage reporting, infrastructure checks, eligibility validation, mass production of relocation/return-home packages, and automated, resilient family notifications.

**Crucial UI/UX Note:** While this architectural document is written in English for engineering standards, the final web application **must be entirely in Hebrew**. It will feature a state-of-the-art, highly innovative, and pixel-perfect Right-To-Left (RTL) interface that provides a breathtaking and seamless User Experience (UX).

---

## 2. Architectural Guidelines (System Design)
The system is built upon a **Modular Monolith** architecture utilizing **Domain-Driven Design (DDD)** principles to ensure high scalability and absolute separation of concerns.

1. **Domain Isolation (Strict Boundaries):** Modules are strictly segregated. A domain cannot directly access the internal code, services, or database of another domain.
2. **API-Driven Internal Communication:** All inter-domain communication occurs strictly through predefined Public API interfaces (e.g., `api.js` per domain).
3. **Policy-Based Authorization:** Access control and business rules are completely decoupled from business logic and centralized in a dedicated Policy layer.
4. **Idempotency & Resiliency:** Critical flows, particularly notifications, are designed to withstand network failures without duplicating actions.

---

## 3. System Modules (Domains)
Functionality remains exactly as specified, mapped to isolated domains:

### 3.1 Buildings Domain
* **Responsibility:** Manages the core Building entity, damage reports, and rehabilitation status (damage images, engineer reports, the 24+ apartment social approval condition, budget requests).
* **Public API:**
  * `getBuildingById(id)`
  * `updateBuildingStatus(id, status)`
  * `getBuildingForSettlementCalculation(id)` (Provides strictly necessary data for readiness calculations).

### 3.2 Assessments Domain (Appraisers)
* **Responsibility:** Manages damage assessments (Minor, Moderate, Severe), appraiser notes, and inspection dates.
* **Access Control:** Restricted strictly to `APPRAISER` roles (write) and `MINISTRY` roles (read).

### 3.3 Municipal Approvals Domain
* **Responsibility:** Validates municipal infrastructure (water, electricity, access roads, hazard removal) and grants final municipal approval.
* **Access Control:** Restricted to `MUNICIPALITY` roles, strictly filtered by their assigned `settlementId`.

### 3.4 Settlement Processes Domain
* **Responsibility:** Orchestrates mass processing and generation of return-home packages, tracking start/end times and statuses (`PROCESSING` vs. `COMPLETED`).

---

## 4. Core Entities & Data Model

1. **User**
   * `id`, `username`, `password`, `fullName`
   * `role` (ENUM: `MINISTRY`, `MUNICIPALITY`, `APPRAISER`)
   * `settlementId` (Nullable - mandatory only for Municipality users).
2. **Building (Damage Report)**
   * `id`, `address`, `settlementName`, `reporterName`, `familyEmail`
   * **Conditions:** `hasDamageImages`, `hasEngineerReport`, `hasEligibilityCheck`, `apartmentsCount`, `hasSocialApproval`, `hasBudgetRequest`
   * **Status Flow:** `WAITING_FOR_VALIDATION` -> `NEW` -> `IN_REVIEW` -> `COMPLETED`.
3. **NotificationLog**
   * `messageId`, `buildingId`, `idempotencyKey`
   * `status` (SENT, FAILED, ALREADY_SENT)
   * `attemptNumber`, `errorMessage`, `timestamp`

---

## 5. UI/UX & Frontend Workflows (Hebrew Interface)
The frontend will deliver an uncompromising, modern, and intuitive User Experience. It will utilize modern UI libraries (e.g., Tailwind CSS, Material Design, or customized modern components) with perfect RTL alignment and advanced data visualization.

### 5.1 National Dashboard (לוח בקרה ארצי)
* **UX/UI:** A visually striking, real-time dashboard featuring KPI cards, progress bars, and advanced Hebrew filtering capabilities (by settlement name and status).
* **"Ready for Settlement Opening" Logic:** Calculated dynamically and displayed via clear visual indicators (green checkmarks/red badges) based on the combined criteria: Damage images + Engineer report + Eligibility + Budget + Relocation package + Minor/Moderate damage only + Municipal approval.

### 5.2 Building Details & Audit Trail (פרטי מבנה והיסטוריית פעולות)
* **UX/UI:** A clean, card-based layout separating engineering data, budget status, and municipal approvals. Includes high-visibility Call-To-Action (CTA) buttons for generating individual packages.
* **Audit Trail (Activity Log):** A beautifully designed chronological timeline UI. It updates in real-time, displaying only successfully executed actions to prevent user confusion.

### 5.3 Notification Center (מרכז הודעות)
* **UX/UI:** A modern, paginated, and sortable data table displaying comprehensive logs. Uses color-coded status badges (e.g., Green for `SENT`, Red for `FAILED`, Warning/Yellow for `ALREADY_SENT`) and clear typography for timestamps and error messages.

---

## 6. Security & Resiliency Mechanisms

### 6.1 Centralized Authorization Policy
All incoming requests pass through a robust `authorizationPolicy.js` layer:
* **Role-Based Access Control (RBAC):** E.g., Municipalities cannot approve budgets.
* **Tenant-Based Access (Multi-tenancy):** Municipality users can **only** view and mutate buildings matching their specific `settlementId`. Unauthorized attempts automatically return a `403 Forbidden` response.

### 6.2 Idempotency & Automated Retries
* **Idempotency Key:** The `sendNotification` service always receives an `idempotencyKey` (derived from `buildingId` and action type).
* **Retry Mechanism:** In the event of `RESPONSE_LOST` or `TIMEOUT`, the system autonomously attempts up to **3 retries**.
* **Audit & Logging:** Each attempt is meticulously logged with its specific `notificationAttemptNumber`. If a request is accidentally duplicated after a successful send, the system intercepts it via the key and safely returns `ALREADY_SENT`, preventing duplicate emails to families.

---

## 7. Recommended Implementation Plan
1. **Phase 1: Backend Architecture & Auth:** Setup Node.js/Express framework, establish the database schema, and implement the central `authorizationPolicy.js`.
2. **Phase 2: Core Domain APIs:** Develop the `Buildings`, `Assessments`, and `Municipal Approvals` domains, ensuring strict isolation and API-only internal routing.
3. **Phase 3: Resiliency & Background Tasks:** Implement the Mock Notification server equipped with the robust Retry and Idempotency logic.
4. **Phase 4: Cutting-Edge UI/UX (Hebrew):** Build the frontend using a modern framework. Implement the RTL design system, the National Dashboard, comprehensive filtering, and the real-time Audit Trail to provide a flawless user experience.