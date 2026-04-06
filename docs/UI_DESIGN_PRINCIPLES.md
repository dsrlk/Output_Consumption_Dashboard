# UI Design & Color Palette Principles

This document defines the core aesthetic rules and technical CSS conventions used across the Expack Consumption Reporting Dashboard. It ensures visual consistency and upholds our premium aesthetic standards.

## 1. Brand Identity & Color Palette

### Base Brand Colors
- **Expack Vibrant Red**: Used as the primary brand color (`var(--primary)`: `#e62020`). Denotes focus, primary actions, and "Consumption" metrics.
- **Deep Crimson**: Used for active/hover states (`var(--primary-hover)`: `#b91c1c`).
- **Brand Black**: High-contrast, core textual and "Output" indicator color (`var(--text-main)`: `#09090b`).

### Functional Color Mappings
- **Data Output (Production)**: Always mapped to **Black** (`var(--text-main)`).
- **Data Consumption (Resources used)**: Always mapped to **Red** (`var(--primary)` or `var(--danger)`).
- **Success/Positive Trends**: Emerald Green (`var(--success)`: `#10b981`) indicates favorable variances (e.g., lower consumption, higher output).
- **Warning/Alerts**: Amber (`var(--warning)`: `#f59e0b`).
- **Danger/Negative Trends**: Vibrant Red (`var(--danger)`: `#e62020`) indicates unfavorable variances (e.g., over-consumption, lower output).

### Surfaces & Backgrounds
- **App Background**: Soft neutral gray (`var(--bg-color)`: `#f4f4f5`) providing contrast against bright card surfaces.
- **Card Backgrounds**: Pure White (`#ffffff`) to slightly off-white gradients (`#fcfcfd`) to establish depth.
- **Borders**: Extremely subtle, using low opacities (`rgba(9, 9, 11, 0.05)`) to maintain softness and avoid the clinical "grid-box" look.

## 2. Typography

- **Headings & Titles**: `Outfit` font for professional, modern, sans-serif dominance. Used in page titles, dashboard cards, and major numeric values.
- **Body & App Typefaces**: `Inter` and system-ui, utilizing high contrast metrics for maximum readability.
- **Weights**: Distinct visual hierarchy through typography. Extrabold weights (`800`) for top-level headers and card metrics; medium/semi-bold (`500`-`600`) for standard interactive elements to feel substantial and modern.

## 3. The "Soft UI" Aesthetic

### Structural Principles
- **Container Styling**: Generous border-radii throughout the application. The standard `var(--radius)` is `20px` for cards, creating a friendly, modern feel.
- **Shadows**: Usage of soft, diffused drop shadows rather than harsh borders or flat surfaces to establish spatial hierarchy.
  - *Small/Idle State*: `var(--shadow-sm)` (`0 4px 12px rgba(9, 9, 11, 0.03)`)
  - *Hover State*: Elevated, expanding shadow `var(--shadow-lg)` and slight Y-axis translation (`transform: translateY(-4px)`).

### Interactive Elements
- **Navigation (TopBar)**: Glassmorphic center navigation pill with distinct hover and active states (incorporating icon-and-text label expansion on `.active`).
- **Custom Select Dropdowns**: Standard OS-rendered dropdowns are prohibited. Custom elements (`CustomSelect`) must be used for dropdowns, ensuring matched border radius, custom hover rings, and brand animation consistency.
- **Buttons / Actions**: Utilize subtle hover backgrounds to reveal interactive intent seamlessly, preventing overwhelming visual noise.

## 4. Visual Component Strategy

- **Cards**: All content must sit within delineated structures with clear padded boundaries (`1.5rem` to `2rem`).
- **Information Hierarchy**: Top-level text on KPIs uses `uppercase` low-prominence metrics (`var(--text-muted)`) situated above massive numeric values, facilitating rapid insights ("glanceable" content).
- **Charts / Visualizations**: Must conform to minimal axis lines. Overlapping bar charts or dual-axis line charts should respect the Output (Black) vs. Consumption (Red) mapping rigidly.

---
**Note to Developers:** Do not use utility-class frameworks (like Tailwind) or hardcoded inline styles unless globally required. All structural layouts must be enforced via standard mapped CSS variable tokens established in `frontend/src/index.css`.
