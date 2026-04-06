# System Formulas and API Roots

This document details the core computational metrics used to infer system performance, as well as the map of core backend endpoints (roots).

---

## Core Formulas & Computations

### 1. Consumption Deviation
Deviations measure how far real consumption strays from defined optimal standards.
$$ \text{Deviation \%} = \left( \frac{\text{Actual Consumption}}{\text{Benchmark Standard}} - 1 \right) \times 100 $$
- **Alert Logic**:
  - `<= 0%` (or negative): Green (At or Under budget)
  - `0.1% to 10%`: Amber / Warning
  - `> 10%`: Red / Critical Over-Consumption

### 2. Efficiency Ratios
Used primarily in the Analytics Leaderboard:
$$ \text{Efficiency Index} = \frac{\text{Total Relevant Output (Tons)}}{\text{Total Assigned Utility (Consumption units)}} $$

### 3. Missing Data Policy
Any operational metric or associated utility returning `null` from the SQLite database is strictly handled as `"N/A"` in the UI. Averages and aggregations omit `N/A` rows from the denominator to avoid heavily skewed deviations.

---

## Backend Application Roots

The backend strictly conforms to a RESTful standard managed by FastAPI routers (`app/main.py`).

| Application Route | Purpose |
|-------------------|---------|
| `GET /` | API Healthcheck ("Consumption Report API is running"). |

### General API Operations (`/api/`)
Handled by `app/api/endpoints.py`
- `GET /api/filter-options`: Fetches dynamic population data for the frontend Date/Department filters.
- `GET /api/kpi-data`: Aggregates the standard core metrics for the selected time horizon/filter set.

### Dashboard & Analytics API (`/api/dashboard/`)
Handled by `app/api/analytics.py`
- `GET /api/dashboard/cross_section_summary`: Unifies multi-department data (Output vs Consumption) to serve the Analytics comparative chart.
- `GET /api/dashboard/insights`: Feeds the "Smart Insights" textual generator, analyzing limits internally and sending compiled UI alert statuses.
- `GET /api/dashboard/standards`: Dispatches the configurable Data Hub benchmarks linking synthetic variables to raw schema metrics.
