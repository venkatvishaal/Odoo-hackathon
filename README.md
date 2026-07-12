# TransitOps — Smart Transport Operations Platform

TransitOps is a centralized transport operations platform designed to optimize fleet utilization, automate logistics dispatch, enforce compliance gates, track maintenance lifecycles, and monitor operational finances (fuel, tolls, and expenses).

---

## 1. Core Platform Capabilities & Features

### 🚚 Vehicle & Asset Management
*   **Centralized Registry:** Track registration numbers, models, purchase details, and current odometer readings.
*   **Real-Time Status Tracking:** Monitor vehicle availability states (`Available`, `On Trip`, `In Shop`, `Retired`).
*   **Fleet Health Tracking:** Automated status updates based on active maintenance logs.

### 👥 Driver Compliance & Profile Management
*   **Driver Registry:** Store driver information, license categories, and safety ratings.
*   **Automated Expiry Warnings:** Monitor driver license expiration dates to prevent expired dispatches.
*   **Compliance Scorecards:** Maintain driver safety scores to evaluate operational risk.

### 📅 Trip Planning & Automated Dispatch
*   **Intelligent Dispatching:** Select available vehicles and qualified drivers for new dispatches.
*   **Dynamic Resource Gating:** Prevent selection of busy, retired, suspended, or maintenance-bound assets.
*   **Payload Capacity Verification:** Enforce cargo weight limits against vehicle load capabilities.

### 🔧 Maintenance & Repairs
*   **Lifecycle Logging:** Schedule preventive maintenance or track corrective repairs.
*   **Shop Locking:** Mark vehicles as `In Shop` while maintenance logs are open, automatically releasing them back to `Available` upon completion.
*   **Cost Tracking:** Measure individual repair and aggregate maintenance costs.

### 💳 Fuel & Expense Logging
*   **Fuel Management:** Track fuel refills, liters consumed, and associated costs per vehicle/trip.
*   **Expense Audits:** Log road tolls, operational costs, and general transport expenses.

### 📊 Reports & Operational Analytics
*   **KPI Metrics Dashboard:** Compute Fleet Utilization, Driver Statuses, and Active Trips dynamically.
*   **Fleet Analytics:**
    *   **Fleet Utilization (%)** = $\frac{\text{Vehicles on Trip}}{\text{Total Fleet Size} - \text{Retired Vehicles}} \times 100$
    *   **Fuel Efficiency** = $\frac{\text{Distance Traveled (km)}}{\text{Fuel Consumed (Liters)}}$
    *   **Vehicle ROI** = $\frac{\text{Trip Revenue} - (\text{Maintenance Costs} + \text{Fuel Costs})}{\text{Acquisition Cost}}$
*   **CSV Exports:** Generate downloadable CSV reports for financial and operational audits.

---

## 2. Target Roles & Workflows

*   **Fleet Manager:** Oversees fleet health, schedules vehicle maintenance, manages asset lifecycles, and monitors utilization.
*   **Driver:** Views dispatch details, updates trip status, and logs final odometers and fuel refills.
*   **Safety Officer:** Monitors driver compliance, tracks license categories, and reviews driver safety scores.
*   **Financial Analyst:** Audits fuel logs, tolls, maintenance costs, and monitors vehicle ROI.

---

## 3. Operational Business Rules

The system automatically enforces the following business logic rules:

1.  **Unique Vehicle Registration:** Vehicle registration numbers must be globally unique.
2.  **Dispatch Gating:** Vehicles marked `Retired` or `In Shop` are excluded from trip dispatch selection pools.
3.  **Driver Compliance Gating:** Drivers with expired licenses or a `Suspended` status cannot be assigned to trips.
4.  **Double Assignment Prevention:** Drivers or vehicles marked `On Trip` cannot be assigned to another trip.
5.  **Payload Capacity Gating:** Cargo weight must not exceed the selected vehicle's maximum load capacity (`cargo_weight` <= `capacity_kg`).
6.  **Trip Lifecycle Status Transitions:**
    *   `Draft` &rarr; `Dispatched`: Automatically changes vehicle and driver status to `On Trip`.
    *   `Dispatched` &rarr; `Completed`: Automatically restores vehicle and driver status to `Available` and updates the vehicle's odometer.
    *   `Dispatched` &rarr; `Cancelled`: Restores both vehicle and driver to `Available`.
7.  **Maintenance Status Transitions:**
    *   Creating an active maintenance log changes vehicle status to `In Shop`.
    *   Closing the maintenance log restores the vehicle status to `Available` (unless marked `Retired`).

---

## 4. System Tech Stack

*   **Frontend (Client):** Single Page Application built with React, Tailwind CSS, Redux (State Management), React-Leaflet (Live Tracking maps), and Recharts (Data Visualizations).
*   **Backend (API):** Node.js & Express.js server providing REST endpoints, secured with JWT and role-based access control (RBAC) middleware.
*   **Database (Storage):** PostgreSQL database managed with Sequelize ORM.
