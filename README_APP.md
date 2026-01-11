# Habit Tracker - Premium Desktop App

## Overview
This is a modern, dark-themed habit tracking text application built with Electron, React, and SQLite (via `sql.js`).
It features stock-market style analytics, heatmaps, and local data persistence.

## Project Structure
- `src/renderer`: React UI (Dashboard, Charts, Components).
- `electron`: Main process (SQLite database logic, Window management).
- `dist`: Production build output.

## How to Run Locally
1. Open this folder in VS Code.
2. Open a terminal.
3. Run:
   ```bash
   npm install
   npm run dev
   ```
   This will launch the app in a local Electron window.

## How to Build .EXE
To create the standalone Windows installer:
1. Run:
   ```bash
   npm run build
   ```
2. The `.exe` file will be generated in the `release` folder (or `dist` depending on config).

## Features Implemented
- **Dashboards**: Heatmap, Stock-like Success Graph, Streak Bar.
- **Data**: `habits.sqlite` stored in `%APPDATA%/HabitTracker`.
- **UI**: Glassmorphism, Animations (Framer Motion), Recharts.
- **Tech**: TypeScript, Vite, React.

## Notes
- The database is initialized automatically.
- To reset data, delete the `habits.sqlite` file in your AppData folder.
