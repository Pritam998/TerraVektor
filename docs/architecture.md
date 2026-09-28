# TerraVektor Architecture Overview

TerraVektor is an end-to-end satellite intelligence and multi-temporal surface change analysis platform designed for Sentinel-2 optical imagery.

## 1. System Components

```
+-----------------------------------------------------------------------------------+
|                              Frontend (React + Vite)                              |
|   src/app/App.tsx  --  src/pages/  --  src/features/ (investigation, discovery)   |
+-----------------------------------------------------------------------------------+
                                         | HTTP / REST (Vite Proxy / Direct)
                                         v
+-----------------------------------------------------------------------------------+
|                          Primary Backend (Express / Node.js)                      |
|                                     server.ts                                     |
|  - Copernicus CDSE OData client & Keycloak authentication                         |
|  - Dynamic raster fetcher & spectral index engine (NDVI/NDBI)                     |
|  - Semantic natural language scene pairing & AOI geographic resolver              |
|  - Analyst review & provenance tracking                                           |
|  - Vite middleware (dev) / Static asset server (prod)                             |
+-----------------------------------------------------------------------------------+
         |                                                 |
         | (HTTP - when active)                            | (HTTPS OData)
         v                                                 v
+------------------------------------+   +------------------------------------------+
|  Python Raster Microservice        |   | Copernicus Data Space Ecosystem (CDSE)   |
|  (Port 8001 / Microservice worker) |   | - OData v1 Catalogue (/odata/v1/Products)|
|  - Native rasterio/NumPy ops       |   | - Keycloak Identity Provider (CDSE Auth) |
+------------------------------------+   +------------------------------------------+
```

## 2. Frontend Structure (`src/`)

The client is structured around feature boundaries and shared services:

- `src/app/`: Application shell (`App.tsx`) managing global routing, system health, and demonstration mode toggles.
- `src/features/`: Domain-specific features encapsulating components, specialized logic, and contracts:
  - `features/investigation/`: Multi-temporal candidate verification (`InvestigationWorkspacePanel.tsx`, `SatelliteInvestigationMap.tsx`).
  - `features/discovery/`: Sentinel-2 live catalogue querying and interactive AOI bbox selection (`LeafletMapView.tsx`).
- `src/components/`: Reusable, app-wide shared components (`Sidebar.tsx`, `MapView.tsx`).
- `src/pages/`: Top-level navigational views (`Sentinel2Search.tsx`, `SemanticSearch.tsx`, `ChangeAnalysis.tsx`, `Dashboard.tsx`, `ReviewQueue.tsx`, `DataManagement.tsx`, `SimilarLocations.tsx`, `ImageSearch.tsx`, `SystemStatus.tsx`).
- `src/services/`: API gateway layer (`api.ts`).
- `src/types/`: Domain-wide TypeScript interfaces (`index.ts`).

## 3. Backend Structure (`server.ts`)

The primary backend is a high-performance Express/Node.js application serving both API endpoints and the frontend:

- **Sentinel-2 Discovery**: Queries the European Space Agency Copernicus Data Space Ecosystem (CDSE) OData v1 API with polygon intersection and cloud-cover filters.
- **Spectral Calculation Engine**: Real Sentinel-2 spectral calculations using red (B04), near-infrared (B08), and short-wave infrared (B11) bands. Computes NDVI (Normalized Difference Vegetation Index) and NDBI (Normalized Difference Built-up Index).
- **Semantic Retrieval**: Natural language parser mapping geographic names (e.g., Pune, Mumbai, Bengaluru) and temporal requests to automated Before/After satellite scene pairs.
- **Analyst Review Workflow**: In-memory candidate persistence, validation status, and audit provenance logging.
- **Single-Port Serving**: Mounts Vite middleware during development and serves compiled `dist/` static assets in production on port 3000.

## 4. Python Raster Service Isolation

- **Role**: Designed exclusively for heavy numerical array computations (Rasterio, GDAL, GeoPandas, NumPy).
- **Communication**: Express queries `${RASTER_SERVICE_URL}` (default `http://localhost:8001`).
- **Resilience**: If the Python service is offline, Express automatically runs its internal spectral engine, guaranteeing uninterrupted operation.

## 5. Data Flow

1. **Discovery**: User specifies an Area of Interest (AOI) -> Express queries Copernicus CDSE OData -> Normalized Sentinel-2 L2A footprints returned.
2. **Pairing**: Analyst selects Before and After scenes (or Semantic Search resolves them via query).
3. **Change Detection**: Express retrieves spectral band data -> Computes $\Delta\text{NDBI}$ and $\Delta\text{NDVI}$ -> Thresholds candidate regions.
4. **Investigation**: Analyst uses the Investigation Workspace to inspect swipe overlays, view change candidate bounding boxes, and confirm or reject findings.
