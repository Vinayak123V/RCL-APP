# BMS Monitor — JBD BLE Battery Management System

A full-stack desktop app for real-time BMS monitoring via Bluetooth Low Energy.

## Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Recharts + Zustand
- **Desktop**: Electron (IPC bridge)
- **BLE**: @abandonware/noble
- **Backend**: Express + Socket.IO + PostgreSQL

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Run in mock mode (no real BLE device needed)

Open 3 terminals:

```bash
# Terminal 1 — Frontend dev server
npm run dev:frontend

# Terminal 2 — Electron (mock BLE enabled, cross-env handles Windows)
npm run dev:electron

# Terminal 3 — Backend (optional)
npm run dev:backend
```

### 3. Run with a real BLE device

```bash
# Terminal 1
npm run dev:frontend

# Terminal 2 (no mock flag)
npm run dev:electron
```

## Backend / Database Setup (optional)

Requires PostgreSQL running locally.

```bash
# Create database
createdb bms

# Set env vars (or use defaults: localhost/5432/bms/postgres/postgres)
export DB_HOST=localhost
export DB_NAME=bms
export DB_USER=postgres
export DB_PASS=postgres

npm run dev:backend
```

The backend auto-creates the `battery_history` table on startup.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/battery/latest` | Latest battery snapshot |
| GET | `/battery/history?limit=100` | Historical records |
| POST | `/battery/record` | Store a reading |

WebSocket event: `battery:data` — pushed on every new reading.

## BLE Protocol

Implements JBD BMS binary protocol:
- `0x03` — Basic info (voltage, current, SOC, temps, MOS status)
- `0x04` — Cell voltages
- `0xE1/0xE2` — Charge/discharge MOS control

Set `BLE_MOCK=true` to use generated mock data without a physical device.

## Project Structure

```
/shared      — TypeScript types shared across all packages
/ble         — BLE service + JBD protocol parser + mock generator
/electron    — Electron main process + IPC handlers + preload
/frontend    — React dashboard (Vite + Tailwind)
/backend     — Express REST API + Socket.IO + PostgreSQL
```
