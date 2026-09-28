# TerraVektor API Reference

This document lists the existing REST API endpoints provided by the Express backend (`server.ts`).

## 1. System & Health

### `GET /api/health`
Returns the status of internal services and connectivity to upstream Copernicus CDSE.
- **Query Params**: `demo_mode` (optional boolean)
- **Response**:
  ```json
  {
    "status": "healthy" | "degraded",
    "version": "1.0.0",
    "database": "in-memory (migrated)",
    "data_mode": "live_sentinel2" | "demo_data" | "upstream_unavailable",
    "cdse_connected": true,
    "services": {
      "embedding": "active",
      "vector_search": "active",
      "change_detection": "active",
      "image_preprocessing": "active",
      "provenance": "active"
    }
  }
  ```

---

## 2. Sentinel-2 Discovery (Copernicus CDSE)

### `POST /api/sentinel2/search` (or `GET`)
Searches Copernicus CDSE for Sentinel-2 L2A/L1C products matching spatiotemporal filters.
- **Request Body**:
  ```json
  {
    "bbox": [73.70, 18.40, 74.05, 18.70],
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "max_cloud_cover": 20,
    "product_type": "S2MSI2A",
    "limit": 20,
    "force_refresh": false
  }
  ```
- **Response**:
  ```json
  {
    "total_results": 12,
    "results": [
      {
        "id": "e4a2c...",
        "name": "S2A_MSIL2A_20240415...",
        "product_type": "S2MSI2A",
        "acquisition_date": "2024-04-15T05:46:41.024Z",
        "cloud_cover": 4.12,
        "platform": "Sentinel-2A",
        "tile_id": "43QDA",
        "bbox": [73.5, 18.2, 74.2, 18.9],
        "preview_url": "/api/sentinel2/preview/e4a2c...",
        "cdse_browser_url": "https://browser.dataspace.copernicus.eu/..."
      }
    ]
  }
  ```

### `GET /api/sentinel2/preview/:productId`
Streams preview imagery (JPEG/PNG/SVG) for a given Sentinel-2 product ID with disk/memory caching.

---

## 3. Spectral Change Analysis

### `POST /api/change/analyze-sentinel2`
Computes vegetation and surface change using pairwise Sentinel-2 spectral differencing ($\Delta\text{NDVI}$).
- **Request Body**:
  ```json
  {
    "before_product_id": "scene-id-1",
    "after_product_id": "scene-id-2",
    "aoi_bbox": [73.75, 18.45, 73.95, 18.65],
    "threshold": 0.25
  }
  ```

### `POST /api/change/analyze-built-up`
Computes new urban expansion and construction candidates using $\Delta\text{NDBI}$ and $\Delta\text{NDVI}$.
- **Request Body**:
  ```json
  {
    "before_product_id": "scene-id-1",
    "after_product_id": "scene-id-2",
    "aoi_bbox": [73.75, 18.45, 73.95, 18.65],
    "ndbi_threshold": 0.15,
    "ndvi_drop_threshold": 0.10
  }
  ```
- **Response**:
  ```json
  {
    "analysis_id": "builtup-20240415-20241012",
    "metrics": {
      "mean_ndbi_before": -0.08,
      "mean_ndbi_after": 0.14,
      "mean_ndvi_before": 0.42,
      "mean_ndvi_after": 0.21,
      "built_up_growth_percentage": 5.4,
      "total_area_analyzed_km2": 42.1
    },
    "candidates": [
      {
        "id": "cand-1",
        "type": "new_construction_candidate",
        "pixel_count": 340,
        "area_m2": 34000,
        "centroid": [73.85, 18.52],
        "bounding_box": [73.845, 18.515, 73.855, 18.525],
        "mean_delta_ndbi": 0.22,
        "mean_delta_ndvi": -0.28
      }
    ],
    "change_mask_url": "/api/change/built-up-mask/builtup-20240415-20241012"
  }
  ```

### `GET /api/change/mask/:analysisId` & `GET /api/change/built-up-mask/:analysisId`
Returns an SVG change mask for spatial overlay on satellite maps.

---

## 4. Semantic Natural Language Retrieval

### `POST /api/semantic-retrieval`
Parses a natural language query into geographic bounding boxes, dates, and discovers optimal Before/After scene pairs.
- **Request Body**:
  ```json
  {
    "query": "Show urban growth in Pune between January 2024 and October 2024",
    "limit": 10
  }
  ```

---

## 5. Catalog, Reviews & Provenance

- `GET /api/scenes`: Lists ingested scenes.
- `GET /api/scenes/:sceneId`: Scene metadata by ID.
- `POST /api/ingest`: Ingests a new scene record.
- `GET /api/change/candidates`: Returns all detected change candidate records.
- `POST /api/review/:candidateId`: Submits analyst verification (`confirmed`, `rejected`, `needs_review`).
- `GET /api/reviews/:candidateId`: Audit review history for a candidate.
- `GET /api/provenance/:sceneId`: Processing lineage and pipeline audit log.
