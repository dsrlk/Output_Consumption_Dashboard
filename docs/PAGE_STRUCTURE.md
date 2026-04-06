# Page Structure & Architecture

The application is structured via a unified layout defined in `frontend/src/App.jsx`. The root context provider (`FilterProvider`) scopes dashboard-wide dropdown queries (Department, Date Range) across all sub-pages.

## Global Layout (`TopBar`)
- **Left Panel**: Company Logo and "Expack Analytics" Title.
- **Center Panel (Navigation)**:
  - Dashboard (`/`)
  - Analytics (`/analytics`)
  - Data Hub (`/data-hub`)
- **Right Panel**: Notifications and User Avatar.

---

## 1. Home / Dashboard (`/`)
Located at `frontend/src/pages/Dashboard.jsx`.
- **Purpose**: General Factory-Wide Overview and Key Operational KPIs.
- **Components**:
  - **Filter Ribbon**: Inline filters (Department, Machine, Shift, Timeline). Custom dropdown components (`CustomSelect`).
  - **KPI Matrix**: Dynamically generated cards mapping output and consumption data. Cards feature "Budget Burn" semi-circle gauges.
  - **Smart Insights Panel**: Sits alongside or below KPIs, programmatically generating text-based insights based on metric deviations against defined benchmark standards.

## 2. Analytics (`/analytics`)
Located at `frontend/src/pages/Analytics.jsx`.
- **Purpose**: Cross-departmental visualization and detailed efficiency metrics.
- **Components**:
  - **Dual-Axis Chart**: Compares `Output` directly to `Consumption` across all structural departments.
  - **Efficiency Leaderboard**: Ranks top-performing departments using unit-level calculations.
  - **Department Scorecard**: Data table utilizing badges to explicitly call out significant deviations from operational benchmarks.

## 3. Data Hub (`/data-hub`)
Located at `frontend/src/pages/DataHub.jsx`.
- **Purpose**: Formulate, ingest, and define systemic norms and benchmarks.
- **Components**:
  - **Standards Configuration Table**: Allows adjusting thresholds, baseline standards (e.g., expected Borax consumed per ton of Output), which cascades mathematically back into the Insights panel and Dashboard KPIs.
