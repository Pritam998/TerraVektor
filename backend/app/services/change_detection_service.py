import os
import logging
import numpy as np
import rasterio
from rasterio.windows import transform
from rasterio.features import geometry_window
from rasterio.enums import Resampling
from shapely.geometry import box, mapping
from typing import Dict, Any, Tuple, Optional, List
import time
from scipy import ndimage
from scipy.ndimage import label

logger = logging.getLogger(__name__)

# Built-up change detection configuration
# These are initial heuristic thresholds requiring validation
BUILT_UP_NDBI_INCREASE_THRESHOLD = 0.1  # Positive NDBI change indicates built-up increase
VEGETATION_NDVI_DECREASE_THRESHOLD = -0.1  # Negative NDVI change indicates vegetation loss
MIN_CHANGE_AREA_PIXELS = 50  # Minimum pixels for a valid change region (at 10m resolution = 5000m²)

class ChangeDetectionService:
    """Service for real Sentinel-2 multi-temporal change detection using actual B4/B8/B11 spectral bands."""
    
    def __init__(self):
        self.cog_base_url = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs"
        self.processing_cache: Dict[str, Dict[str, Any]] = {}
    
    def parse_product_name(self, product_name: str) -> Dict[str, Any]:
        """Parse Sentinel-2 product name to extract tile, date, platform."""
        # Example: S2A_MSIL2A_20240503T052651_N0510_R105_T43QCA_20240503T075853.SAFE
        parts = product_name.replace('.SAFE', '').split('_')
        
        return {
            'platform': parts[0],
            'product_type': parts[1],
            'sensing_time': parts[2],
            'processing_baseline': parts[3],
            'orbit': parts[4],
            'tile_id': parts[5],
            'product_id': parts[6] if len(parts) > 6 else ''
        }
    
    def get_cog_url(self, product_name: str, band: str) -> str:
        """Generate COG URL for a specific band."""
        # COG URL pattern: sentinel-s2-l2a-cogs/{UTM}/{lat_band}/{square}/{year}/{month}/{platform}_{tile}_{date}_0_L2A/{band}.tif
        parsed = self.parse_product_name(product_name)
        
        # Extract components
        tile = parsed['tile_id']  # e.g., 43QCA
        utm = tile[:2]  # e.g., 43
        lat_band = tile[2:3]  # e.g., Q
        square = tile[3:5]  # e.g., CA
        
        # Parse date from sensing_time: 20240503T052651
        date_str = parsed['sensing_time'][:8]  # 20240503
        year = date_str[:4]  # 2024
        month = str(int(date_str[4:6]))  # 5
        
        platform = parsed['platform']  # S2A
        clean_date = date_str  # 20240503
        
        url = f"{self.cog_base_url}/{utm}/{lat_band}/{square}/{year}/{month}/{platform}_{tile}_{clean_date}_0_L2A/{band}.tif"
        return url
    
    def download_cog_subset(self, url: str, bbox: Tuple[float, float, float, float], target_crs: str = "EPSG:4326", target_shape: Optional[Tuple[int, int]] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Download and crop COG to AOI bounding box.
        
        Args:
            url: COG URL
            bbox: Bounding box [minLon, minLat, maxLon, maxLat]
            target_crs: Target coordinate reference system
            target_shape: Optional target shape (height, width) for resampling (needed for B11 20m -> 10m)
        """
        min_lon, min_lat, max_lon, max_lat = bbox
        
        # Create polygon from bbox
        polygon = box(min_lon, min_lat, max_lon, max_lat)
        
        # Use GDAL's /vsicurl/ for direct HTTP access
        vsi_url = f"/vsicurl/{url}"
        
        try:
            with rasterio.Env(AWS_NO_SIGN_REQUEST="YES", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
                with rasterio.open(vsi_url) as src:
                    # Get window for AOI
                    window = geometry_window(src, [mapping(polygon)])
                    window_transform = transform(window, src.transform)
                    
                    # Read data
                    data = src.read(1, window=window, out_dtype=np.float32)
                    
                    # Resample if target shape is specified (e.g., B11 20m -> 10m)
                    if target_shape is not None and data.shape != target_shape:
                        from rasterio.warp import reproject, calculate_default_transform, Resampling as RioResampling
                        # Create destination array
                        resampled_data = np.empty(target_shape, dtype=np.float32)
                        
                        # Calculate transform for resampling
                        dst_transform = rasterio.Affine(
                            window_transform[0] * (data.shape[1] / target_shape[1]),
                            window_transform[1],
                            window_transform[2],
                            window_transform[3],
                            window_transform[4] * (data.shape[0] / target_shape[0]),
                            window_transform[5]
                        )
                        
                        # Reproject/resample
                        reproject(
                            source=data,
                            destination=resampled_data,
                            src_transform=window_transform,
                            dst_transform=dst_transform,
                            src_crs=src.crs,
                            dst_crs=src.crs,
                            resampling=RioResampling.bilinear
                        )
                        data = resampled_data
                        window_transform = dst_transform
                    
                    # Transform window to coordinates
                    transform_bounds = rasterio.windows.transform_bounds(window_transform, src.crs, target_crs)
                    
                    return data, {
                        'crs': src.crs,
                        'transform': window_transform,
                        'width': target_shape[1] if target_shape else src.width,
                        'height': target_shape[0] if target_shape else src.height,
                        'window_bounds': transform_bounds,
                        'nodata': src.nodata,
                        'resampled': target_shape is not None
                    }
        except Exception as e:
            logger.error(f"Failed to read COG from {url}: {e}")
            raise
    
    def calculate_ndvi(self, red_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
        """Calculate NDVI from Red (B4) and NIR (B8) bands.
        
        NDVI = (NIR - Red) / (NIR + Red)
        """
        
        # Calculate NDVI
        ndvi = (nir_band - red_band) / (nir_band + red_band)
        
        # Handle divide by zero and invalid values
        ndvi = np.where(
            (nir_band + red_band) == 0,
            np.nan,
            ndvi
        )
        
        # NDVI should be in range [-1, 1]
        ndvi = np.clip(ndvi, -1, 1)
        
        return ndvi
    
    def calculate_ndbi(self, swir_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
        """Calculate NDBI from SWIR (B11) and NIR (B8) bands.
        
        NDBI = (SWIR - NIR) / (SWIR + NIR)
        
        Note: B11 is 20m resolution, should be resampled to match NIR (10m) before calculation.
        """
        
        # Calculate NDBI
        ndbi = (swir_band - nir_band) / (swir_band + nir_band)
        
        # Handle divide by zero and invalid values
        ndbi = np.where(
            (swir_band + nir_band) == 0,
            np.nan,
            ndbi
        )
        
        # NDBI should be in range [-1, 1]
        ndbi = np.clip(ndbi, -1, 1)
        
        return ndbi
    
    def detect_changes(
        self,
        before_product_name: str,
        after_product_name: str,
        bbox: Tuple[float, float, float, float],
        change_threshold: float = 0.2
    ) -> Dict[str, Any]:
        """Perform real change detection using actual B4/B8 spectral bands."""
        
        start_time = time.time()
        
        try:
            # Get COG URLs for B04 and B8 bands
            before_b04_url = self.get_cog_url(before_product_name, "B04")
            before_b08_url = self.get_cog_url(before_product_name, "B08")
            after_b04_url = self.get_cog_url(after_product_name, "B04")
            after_b08_url = self.get_cog_url(after_product_name, "B08")
            
            logger.info(f"Processing change detection for {before_product_name} vs {after_product_name}")
            logger.info(f"Before B04: {before_b04_url}")
            logger.info(f"After B04: {after_b04_url}")
            
            # Download and crop bands to AOI
            before_red, before_meta = self.download_cog_subset(before_b04_url, bbox)
            before_nir, _ = self.download_cog_subset(before_b08_url, bbox)
            after_red, after_meta = self.download_cog_subset(after_b04_url, bbox)
            after_nir, _ = self.download_cog_subset(after_b08_url, bbox)
            
            # Calculate NDVI for both scenes
            before_ndvi = self.calculate_ndvi(before_red, before_nir)
            after_ndvi = self.calculate_ndvi(after_red, after_nir)
            
            # Calculate NDVI difference
            ndvi_diff = after_ndvi - before_ndvi
            
            # Generate change mask based on threshold
            change_mask = np.where(
                np.abs(ndvi_diff) > change_threshold,
                1,
                0
            )
            
            # Calculate statistics
            total_pixels = np.sum(~np.isnan(before_ndvi) & ~np.isnan(after_ndvi))
            changed_pixels = np.sum(change_mask == 1)
            unchanged_pixels = total_pixels - changed_pixels
            
            change_percentage = (changed_pixels / total_pixels) if total_pixels > 0 else 0.0
            
            before_mean_ndvi = np.nanmean(before_ndvi)
            after_mean_ndvi = np.nanmean(after_ndvi)
            mean_ndvi_diff = np.nanmean(ndvi_diff)
            
            processing_time_ms = (time.time() - start_time) * 1000
            
            result = {
                'success': True,
                'data_mode': 'real_sentinel2',
                'source': 'public_cog_mirror',
                'before_product_name': before_product_name,
                'after_product_name': after_product_name,
                'bands': ['B04', 'B08'],
                'aoi_bbox': bbox,
                'crs': before_meta['crs'],
                'resolution': 10.0,  # Sentinel-2 L2A is 10m
                'change_threshold': change_threshold,
                'statistics': {
                    'total_valid_pixels': int(total_pixels),
                    'changed_pixels': int(changed_pixels),
                    'unchanged_pixels': int(unchanged_pixels),
                    'change_percentage': float(change_percentage),
                    'before_mean_ndvi': float(before_mean_ndvi),
                    'after_mean_ndvi': float(after_mean_ndvi),
                    'mean_ndvi_difference': float(mean_ndvi_diff)
                },
                'processing_time_ms': float(processing_time_ms),
                'processing_timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ')
            }
            
            logger.info(f"Change detection completed: {change_percentage:.2%} change in {processing_time_ms:.0f}ms")
            return result
            
        except Exception as e:
            logger.error(f"Change detection failed: {e}")
            return {
                'success': False,
                'data_mode': 'processing_unavailable',
                'reason': str(e),
                'failed_source': 'public_cog_mirror',
                'required_next_step': 'Check COG URL format and network connectivity'
            }
    
    def classify_built_up_change(
        self,
        delta_ndvi: np.ndarray,
        delta_ndbi: np.ndarray,
        before_ndbi: np.ndarray
    ) -> Dict[str, Any]:
        """Classify built-up change candidates from spectral indices.
        
        This implements deterministic rules for:
        - New Construction Candidate: vegetation -> built-up conversion
        - Building Expansion Candidate: existing built-up -> expanded built-up
        
        Limitations:
        - Sentinel-2 B11 has 20m native resolution (resampled to 10m)
        - Individual small buildings cannot be reliably identified
        - Thresholds are heuristic requiring validation
        - Cloud contamination and seasonal effects can create false positives
        """
        
        # Initialize classification mask (0 = no change, 1 = new construction, 2 = building expansion)
        classification_mask = np.zeros_like(delta_ndvi, dtype=np.int8)
        
        # New Construction Candidate: vegetation loss + built-up gain
        # Before: vegetation (high NDVI, low NDBI)
        # After: built-up (low NDVI, high NDBI)
        new_construction_mask = (
            (delta_ndvi < VEGETATION_NDVI_DECREASE_THRESHOLD) &  # Vegetation loss
            (delta_ndbi > BUILT_UP_NDBI_INCREASE_THRESHOLD) &  # Built-up gain
            (~np.isnan(delta_ndvi)) & (~np.isnan(delta_ndbi))
        )
        
        # Building Expansion Candidate: existing built-up + additional built-up
        # Before: already built-up (high NDBI)
        # After: even higher built-up signal
        building_expansion_mask = (
            (before_ndbi > 0.0) &  # Already built-up before
            (delta_ndbi > BUILT_UP_NDBI_INCREASE_THRESHOLD) &  # Additional built-up gain
            (~np.isnan(before_ndbi)) & (~np.isnan(delta_ndbi))
        )
        
        # Apply classifications
        classification_mask[new_construction_mask] = 1  # New Construction Candidate
        classification_mask[building_expansion_mask] = 2  # Building Expansion Candidate
        
        # Spatial filtering - remove small isolated regions
        filtered_mask = self.filter_small_regions(classification_mask, min_pixels=MIN_CHANGE_AREA_PIXELS)
        
        # Extract connected components and their properties
        candidate_regions = self.extract_candidate_regions(
            filtered_mask, 
            delta_ndvi, 
            delta_ndbi,
            min_pixels=MIN_CHANGE_AREA_PIXELS
        )
        
        return {
            'classification_mask': filtered_mask,
            'candidate_regions': candidate_regions,
            'total_candidates': len(candidate_regions),
            'new_construction_count': sum(1 for r in candidate_regions if r['type'] == 'new_construction_candidate'),
            'building_expansion_count': sum(1 for r in candidate_regions if r['type'] == 'building_expansion_candidate')
        }
    
    def filter_small_regions(self, mask: np.ndarray, min_pixels: int = MIN_CHANGE_AREA_PIXELS) -> np.ndarray:
        """Remove small isolated regions from classification mask using connected components."""
        if min_pixels <= 1:
            return mask
        
        filtered_mask = mask.copy()
        
        # Process each class separately
        for class_value in [1, 2]:  # 1 = new construction, 2 = building expansion
            class_mask = (mask == class_value).astype(np.int8)
            
            if np.sum(class_mask) == 0:
                continue
            
            # Label connected components
            labeled_array, num_features = label(class_mask)
            
            # Remove small regions
            for i in range(1, num_features + 1):
                region_pixels = np.sum(labeled_array == i)
                if region_pixels < min_pixels:
                    filtered_mask[labeled_array == i] = 0  # Remove small region
        
        return filtered_mask
    
    def extract_candidate_regions(
        self, 
        classification_mask: np.ndarray,
        delta_ndvi: np.ndarray,
        delta_ndbi: np.ndarray,
        min_pixels: int = MIN_CHANGE_AREA_PIXELS
    ) -> List[Dict[str, Any]]:
        """Extract properties of connected candidate regions."""
        candidates = []
        
        # Process each class
        for class_value, class_name in [(1, 'new_construction_candidate'), (2, 'building_expansion_candidate')]:
            class_mask = (classification_mask == class_value).astype(np.int8)
            
            if np.sum(class_mask) == 0:
                continue
            
            # Label connected components
            labeled_array, num_features = label(class_mask)
            
            # Extract properties for each region
            for i in range(1, num_features + 1):
                region_mask = (labeled_array == i)
                region_pixels = np.sum(region_mask)
                
                if region_pixels < min_pixels:
                    continue
                
                # Calculate region statistics
                region_delta_ndvi = delta_ndvi[region_mask]
                region_delta_ndbi = delta_ndbi[region_mask]
                
                # Calculate centroid
                rows, cols = np.where(region_mask)
                centroid_row = np.mean(rows)
                centroid_col = np.mean(cols)
                
                # Calculate bounding box
                min_row, max_row = np.min(rows), np.max(rows)
                min_col, max_col = np.min(cols), np.max(cols)
                
                candidates.append({
                    'id': f"{class_name}_{i}",
                    'type': class_name,
                    'pixel_count': int(region_pixels),
                    'area_m2': float(region_pixels * 100),  # Assuming 10m resolution (10m x 10m = 100m² per pixel)
                    'centroid': [float(centroid_col), float(centroid_row)],  # [col, row] for raster coordinates
                    'bounding_box': [int(min_col), int(min_row), int(max_col), int(max_row)],
                    'mean_delta_ndvi': float(np.nanmean(region_delta_ndvi)),
                    'mean_delta_ndbi': float(np.nanmean(region_delta_ndbi)),
                    'min_delta_ndvi': float(np.nanmin(region_delta_ndvi)),
                    'max_delta_ndbi': float(np.nanmax(region_delta_ndbi))
                })
        
        return candidates
    
    def detect_built_up_changes(
        self,
        before_product_name: str,
        after_product_name: str,
        bbox: Tuple[float, float, float, float],
        ndbi_increase_threshold: float = BUILT_UP_NDBI_INCREASE_THRESHOLD,
        ndvi_decrease_threshold: float = VEGETATION_NDVI_DECREASE_THRESHOLD,
        min_area_pixels: int = MIN_CHANGE_AREA_PIXELS
    ) -> Dict[str, Any]:
        """Perform real built-up change detection using B04/B08/B11 spectral bands.
        
        This method:
        1. Downloads real Sentinel-2 B04 (Red), B08 (NIR), and B11 (SWIR) bands
        2. Resamples B11 from 20m to 10m to match other bands
        3. Calculates NDVI and NDBI for both scenes
        4. Computes delta NDVI and delta NDBI
        5. Classifies built-up change candidates
        6. Applies spatial filtering
        7. Returns candidate regions with properties
        
        Limitations:
        - B11 has 20m native resolution, resampled using bilinear interpolation
        - Individual building detection limited by Sentinel-2 spatial resolution
        - Thresholds are heuristic requiring validation against ground truth
        """
        
        start_time = time.time()
        
        try:
            # Get COG URLs for B04, B08, and B11 bands
            before_b04_url = self.get_cog_url(before_product_name, "B04")
            before_b08_url = self.get_cog_url(before_product_name, "B08")
            before_b11_url = self.get_cog_url(before_product_name, "B11")
            after_b04_url = self.get_cog_url(after_product_name, "B04")
            after_b08_url = self.get_cog_url(after_product_name, "B08")
            after_b11_url = self.get_cog_url(after_product_name, "B11")
            
            logger.info(f"Processing built-up change detection for {before_product_name} vs {after_product_name}")
            logger.info(f"Before B04: {before_b04_url}")
            logger.info(f"Before B11: {before_b11_url}")
            logger.info(f"After B11: {after_b11_url}")
            
            # Download and crop 10m bands (B04, B08) to AOI
            before_red, before_meta = self.download_cog_subset(before_b04_url, bbox)
            before_nir, _ = self.download_cog_subset(before_b08_url, bbox)
            after_red, after_meta = self.download_cog_subset(after_b04_url, bbox)
            after_nir, _ = self.download_cog_subset(after_b08_url, bbox)
            
            # Get target shape from 10m bands for B11 resampling
            target_shape = before_red.shape
            
            # Download and crop 20m B11 band, resample to 10m
            before_swir, _ = self.download_cog_subset(before_b11_url, bbox, target_shape=target_shape)
            after_swir, _ = self.download_cog_subset(after_b11_url, bbox, target_shape=target_shape)
            
            # Calculate NDVI for both scenes
            before_ndvi = self.calculate_ndvi(before_red, before_nir)
            after_ndvi = self.calculate_ndvi(after_red, after_nir)
            
            # Calculate NDBI for both scenes
            before_ndbi = self.calculate_ndbi(before_swir, before_nir)
            after_ndbi = self.calculate_ndbi(after_swir, after_nir)
            
            # Calculate deltas
            delta_ndvi = after_ndvi - before_ndvi
            delta_ndbi = after_ndbi - before_ndbi
            
            # Classify built-up changes
            classification_result = self.classify_built_up_change(delta_ndvi, delta_ndbi, before_ndbi)
            
            # Calculate overall statistics
            total_valid_pixels = np.sum(~np.isnan(before_ndvi) & ~np.isnan(after_ndvi) & ~np.isnan(before_ndbi) & ~np.isnan(after_ndbi))
            changed_pixels = np.sum(classification_result['classification_mask'] > 0)
            
            # Calculate mean values
            mean_ndvi_before = float(np.nanmean(before_ndvi))
            mean_ndvi_after = float(np.nanmean(after_ndvi))
            mean_ndvi_change = float(np.nanmean(delta_ndvi))
            mean_ndbi_before = float(np.nanmean(before_ndbi))
            mean_ndbi_after = float(np.nanmean(after_ndbi))
            mean_ndbi_change = float(np.nanmean(delta_ndbi))
            
            processing_time_ms = (time.time() - start_time) * 1000
            
            result = {
                'success': True,
                'data_mode': 'real_sentinel2',
                'source': 'public_cog_mirror',
                'classification': 'built_up_change',
                'before_product_name': before_product_name,
                'after_product_name': after_product_name,
                'bands': ['B04', 'B08', 'B11'],
                'aoi_bbox': bbox,
                'crs': str(before_meta['crs']),
                'resolution': 10.0,  # Final analysis resolution (B11 resampled from 20m)
                'thresholds': {
                    'ndbi_increase_threshold': ndbi_increase_threshold,
                    'ndvi_decrease_threshold': ndvi_decrease_threshold,
                    'min_area_pixels': min_area_pixels
                },
                'metrics': {
                    'mean_ndvi_before': mean_ndvi_before,
                    'mean_ndvi_after': mean_ndvi_after,
                    'mean_ndvi_change': mean_ndvi_change,
                    'mean_ndbi_before': mean_ndbi_before,
                    'mean_ndbi_after': mean_ndbi_after,
                    'mean_ndbi_change': mean_ndbi_change,
                    'total_valid_pixels': int(total_valid_pixels),
                    'changed_pixels': int(changed_pixels),
                    'change_percentage': float(changed_pixels / total_valid_pixels) if total_valid_pixels > 0 else 0.0
                },
                'candidates': classification_result['candidate_regions'],
                'candidate_summary': {
                    'total_candidates': classification_result['total_candidates'],
                    'new_construction_count': classification_result['new_construction_count'],
                    'building_expansion_count': classification_result['building_expansion_count']
                },
                'processing_time_ms': float(processing_time_ms),
                'processing_timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'limitations': [
                    'Sentinel-2 B11 has 20m native resolution, resampled to 10m using bilinear interpolation.',
                    'Individual small buildings cannot be reliably identified from Sentinel-2 alone at 10-20m resolution.',
                    'The feature detects built-up change candidates rather than guaranteeing individual construction.',
                    'Thresholds are heuristic unless validated against labeled ground truth data.',
                    'Cloud contamination and seasonal effects can create false positives.',
                    'Multi-temporal validation will improve reliability.'
                ]
            }
            
            logger.info(f"Built-up change detection completed: {classification_result['total_candidates']} candidates in {processing_time_ms:.0f}ms")
            return result
            
        except Exception as e:
            logger.error(f"Built-up change detection failed: {e}")
            return {
                'success': False,
                'data_mode': 'processing_unavailable',
                'reason': str(e),
                'failed_source': 'public_cog_mirror',
                'required_next_step': 'Check COG URL format, B11 band availability, and network connectivity'
            }