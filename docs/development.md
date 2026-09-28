# TerraVektor Development Guide

## 1. Prerequisites

- **Node.js**: v20 or v22 (Node.js 22 LTS recommended)
- **Package Manager**: `npm`
- **Port**: 3000 (primary application port)

## 2. Environment Setup

Copy `.env.example` to `.env` if local environment overrides are needed:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT`: Server port (default: `3000`)
- `DEMO_MODE`: Set to `'true'` to force synthetic simulation data without internet connectivity.
- `CDSE_USERNAME` / `CDSE_PASSWORD`: Optional credentials for higher rate limits on Copernicus CDSE.
- `RASTER_SERVICE_URL`: URL to external Python raster processing microservice (default: `http://localhost:8001`).

## 3. Dependency Management & Scripts

Scripts defined in `package.json`:

```bash
# Install dependencies
npm install

# Start development server (serves Express API and Vite frontend on port 3000)
npm run dev

# Run TypeScript type check (lint)
npm run lint

# Build production bundle (tsc && vite build)
npm run build

# Start production server
npm start
```

## 4. Architecture Conventions

- **Frontend Feature Colocation**:
  - Investigation map and candidate inspection panel belong in `src/features/investigation/components/`.
  - Sentinel-2 catalogue maps belong in `src/features/discovery/components/`.
  - Global navigation and shared widgets belong in `src/components/`.
- **Backend Entrypoint**:
  - `server.ts` is the single root entrypoint coordinating API routes and Vite middleware.
- **Python Raster Microservice Setup (Optional / Isolated)**:
  - If heavy GDAL/rasterio calculations are needed, start the Python worker on port 8001.
  - When offline, TerraVektor seamlessly falls back to its built-in JavaScript/TypeScript spectral calculation engine.
