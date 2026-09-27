from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Tuple
import logging
import sys
import os

# Add parent directory to path to import from app.services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.change_detection_service import ChangeDetectionService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TerraVektor Raster Processing Service",
    description="Real Sentinel-2 spectral band processing for change detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize change detection service
change_service = ChangeDetectionService()

class ChangeDetectionRequest(BaseModel):
    before_product_name: str
    after_product_name: str
    bbox: Tuple[float, float, float, float]  # [minLon, minLat, maxLon, maxLat]
    change_threshold: float = 0.2

class BuiltUpChangeDetectionRequest(BaseModel):
    before_product_name: str
    after_product_name: str
    bbox: Tuple[float, float, float, float]  # [minLon, minLat, maxLon, maxLat]
    ndbi_increase_threshold: float = 0.1
    ndvi_decrease_threshold: float = -0.1
    min_area_pixels: int = 50

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "raster-processing",
        "version": "1.0.0",
        "capabilities": {
            "ndvi_calculation": True,
            "ndbi_calculation": True,
            "built_up_change_detection": True,
            "cog_access": True,
            "change_detection": True
        }
    }

@app.post("/analyze-change")
async def analyze_change(request: ChangeDetectionRequest):
    """
    Perform real change detection using actual Sentinel-2 B4/B8 spectral bands.
    
    This endpoint:
    1. Accesses public Sentinel-2 L2A COG mirror for B04 (Red) and B08 (NIR) bands
    2. Crops data to the specified AOI bounding box
    3. Calculates real NDVI: (B8 - B4) / (B8 + B4)
    4. Computes NDVI difference between before/after scenes
    5. Generates pixel-level change mask based on threshold
    6. Returns actual statistics from real pixel data
    """
    try:
        result = change_service.detect_changes(
            before_product_name=request.before_product_name,
            after_product_name=request.after_product_name,
            bbox=request.bbox,
            change_threshold=request.change_threshold
        )
        
        if not result.get('success', False):
            raise HTTPException(
                status_code=503,
                detail=result
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Change analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data_mode": "processing_unavailable",
                "reason": str(e),
                "failed_source": "raster_service",
                "required_next_step": "Check error logs and service configuration"
            }
        )

@app.post("/analyze-built-up")
async def analyze_built_up_changes(request: BuiltUpChangeDetectionRequest):
    """
    Perform real built-up change detection using actual Sentinel-2 B04/B08/B11 spectral bands.
    
    This endpoint:
    1. Accesses public Sentinel-2 L2A COG mirror for B04 (Red), B08 (NIR), and B11 (SWIR) bands
    2. Resamples B11 from 20m to 10m to match other bands using bilinear interpolation
    3. Crops data to the specified AOI bounding box
    4. Calculates real NDVI: (B8 - B4) / (B8 + B4)
    5. Calculates real NDBI: (B11 - B8) / (B11 + B8)
    6. Computes NDVI and NDBI differences between before/after scenes
    7. Classifies built-up change candidates (new construction, building expansion)
    8. Applies spatial filtering to remove noise
    9. Returns actual candidate regions with properties from real pixel data
    
    Limitations:
    - B11 has 20m native resolution, resampled to 10m
    - Individual building detection limited by Sentinel-2 spatial resolution
    - Thresholds are heuristic requiring validation
    """
    try:
        result = change_service.detect_built_up_changes(
            before_product_name=request.before_product_name,
            after_product_name=request.after_product_name,
            bbox=request.bbox,
            ndbi_increase_threshold=request.ndbi_increase_threshold,
            ndvi_decrease_threshold=request.ndvi_decrease_threshold,
            min_area_pixels=request.min_area_pixels
        )
        
        if not result.get('success', False):
            raise HTTPException(
                status_code=503,
                detail=result
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Built-up change analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data_mode": "processing_unavailable",
                "reason": str(e),
                "failed_source": "raster_service",
                "required_next_step": "Check error logs and service configuration"
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")