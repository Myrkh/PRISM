# SafeLoop Pro - Application Blueprint

## 1. Overview

**Purpose:** SafeLoop Pro is a web-based tool for engineers to perform Safety Integrity Level (SIL) verification calculations based on industry standards like IEC 61508 and IEC 61511. It provides a user-friendly interface to model Safety Instrumented Functions (SIFs), configure subsystem parameters, and instantly visualize the resulting Probability of Failure on Demand (PFD) and other key metrics.

**Core Capabilities:**
- **SIF Modeling:** Define a SIF by combining multiple subsystems (e.g., Sensor, Logic Solver, Final Element).
- **Parameter Configuration:** Adjust detailed parameters for each subsystem, including failure rates (λ), proof test intervals (TI), architecture (MooN), and common cause failure (β-factor).
- **Real-time Calculation:** Instantly see the calculated PFDavg, SIL, Risk Reduction Factor (RRF), Safe Failure Fraction (SFF), and Diagnostic Coverage (DC).
- **Visual Feedback:** A dynamic and intuitive dashboard provides charts and gauges to visualize SIL performance and PFD degradation over time.
- **Compliance Checks:** The tool automatically verifies if the design meets the minimum requirements for SFF, Hardware Fault Tolerance (HFT), and DC based on the target SIL.

---

## 2. Application Design & Style

This section documents the design and features implemented in the application, evolving with each change request.

### **V1: Initial Implementation**

- **Layout:** A single-page, dense dashboard layout.
- **Styling:** Dark-themed, with inline CSS styles. A mix of `Barlow`, `Rajdhani`, and `JetBrains Mono` fonts.
- **Components:**
    - Header with application title and overall SIL rating.
    - KPI cards for the total SIF and each subsystem.
    - A "Sawtooth" line chart from the `recharts` library showing PFD degradation.
    - Collapsible cards for each subsystem containing numerous `input[type=number]` fields for parameter configuration.
    - A compliance table with pass/fail indicators.
- **Interactivity:** Input fields are directly tied to the state, causing real-time updates of all calculations and visualizations on every change.

---

## 3. Current Change Request: UI/UX Overhaul

**Goal:** Transform the current functional but cluttered interface into a professional, intuitive, clean, and highly configurable "one-click" experience.

### **Plan & Steps:**

1.  **Install Dependencies:**
    - Add `shadcn/ui` related packages to enable modern, accessible, and themeable components (`class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`).

2.  **Refactor Project Structure:**
    - Reorganize the `src/` directory to be more component-oriented.
    - Create a `src/components/ui` directory for `shadcn/ui` components.
    - Break down the monolithic `SafeLoopDashboard.tsx` into smaller, focused components:
        - `DashboardLayout.tsx`: A new root component managing the overall layout (Header, Sidebar, Main Content).
        - `Header.tsx`: A redesigned header.
        - `KpiCard.tsx`: A reusable card for displaying key metrics.
        - `Configurator.tsx`: A new sidebar component to house all user-configurable controls.
        - `SubsystemConfig.tsx`: A component within the `Configurator` for editing a single subsystem.
        - `SilChart.tsx`: A simplified and more intuitive chart to visualize SIL levels.

3.  **Implement New Design:**
    - **Replace Inline Styles:** Remove all `style={{...}}` attributes and replace them with Tailwind CSS utility classes for a consistent and maintainable design system.
    - **Build the Layout:** Implement `DashboardLayout.tsx` with a fixed header, a configuration sidebar on the left, and a main content area on the right.
    - **Redesign Components with `shadcn/ui`:**
        - **`Configurator.tsx`:**
            - Use `Tabs` to switch between editing different subsystems (Sensor, Logic, Final Element).
            - Replace numeric inputs with `Slider` components for a more interactive feel.
            - Use `Select` for choosing the architecture (`1oo1`, `1oo2`, etc.).
            - Use `Card` components to group related settings.
        - **`KpiCard.tsx`:**
            - Redesign the main display cards to be cleaner and more readable.
        - **`Header.tsx`:**
            - Simplify the header for a more modern look.
    - **Update `App.tsx`:** Replace the old dashboard component with the new `DashboardLayout`.
    - **Cleanup:** Remove unused CSS files (`App.css`, `index.css`) as Tailwind will now handle all styling.

4.  **Final Polish:**
    - Run `eslint . --fix` to ensure code quality and consistency.
    - Verify that all interactivity and calculations from the original version are preserved and functioning correctly.
