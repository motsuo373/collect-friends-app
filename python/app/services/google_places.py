import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urlencode

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class GooglePlacesService:
    """Google Places API サービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.google_api_key
        self.base_url = "https://maps.googleapis.com/maps/api/place"
        
    async def search_places(
        self,
        query: str,
        location: tuple[float, float],
        radius: int = 2000,
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        指定されたクエリで場所を検索
        
        Args:
            query: 検索クエリ
            location: 中心座標 (lat, lng)
            radius: 検索半径（メートル）
            max_results: 最大結果数
            
        Returns:
            場所情報のリスト
        """
        try:
            logger.info(f"Searching places with query: {query}, location: {location}")
            
            # Text Search API を使用
            url = f"{self.base_url}/textsearch/json"
            
            params = {
                "query": query,
                "location": f"{location[0]},{location[1]}",
                "radius": radius,
                "key": self.api_key,
                "language": "ja"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"Google Places API error: {response.status}")
                        return []
                    
                    data = await response.json()
                    
                    if data.get("status") != "OK":
                        logger.warning(f"Google Places API status: {data.get('status')}")
                        return []
                    
                    results = data.get("results", [])
                    
                    # 距離でソートし、最大結果数に制限
                    filtered_results = self._filter_and_sort_results(
                        results, location, max_results
                    )
                    
                    logger.info(f"Found {len(filtered_results)} places")
                    return filtered_results
                    
        except Exception as e:
            logger.error(f"Error in Google Places search: {e}")
            return []
    
    def _filter_and_sort_results(
        self, 
        results: List[Dict[str, Any]], 
        center_location: tuple[float, float],
        max_results: int
    ) -> List[Dict[str, Any]]:
        """
        結果をフィルタリングし、距離でソート
        """
        try:
            from geopy.distance import geodesic
            
            filtered = []
            for place in results:
                # 基本情報チェック
                if not place.get("name") or not place.get("geometry"):
                    continue
                
                geometry = place.get("geometry", {})
                location = geometry.get("location", {})
                lat = location.get("lat")
                lng = location.get("lng")
                
                if lat is None or lng is None:
                    continue
                
                # 距離計算
                place_location = (lat, lng)
                distance = geodesic(center_location, place_location).kilometers
                place["distance_km"] = distance
                
                # 営業状況チェック（可能な場合）
                opening_hours = place.get("opening_hours", {})
                place["is_open"] = opening_hours.get("open_now", True)  # デフォルトはopen
                
                filtered.append(place)
            
            # 距離でソート
            filtered.sort(key=lambda x: x.get("distance_km", 999))
            
            return filtered[:max_results]
            
        except Exception as e:
            logger.error(f"Error filtering results: {e}")
            return results[:max_results]
    
    async def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """
        特定の場所の詳細情報を取得
        """
        try:
            url = f"{self.base_url}/details/json"
            
            params = {
                "place_id": place_id,
                "fields": (
                    "name,formatted_address,geometry,rating,price_level,"
                    "opening_hours,photos,reviews,website,formatted_phone_number"
                ),
                "key": self.api_key,
                "language": "ja"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"Place details API error: {response.status}")
                        return None
                    
                    data = await response.json()
                    
                    if data.get("status") != "OK":
                        logger.warning(f"Place details API status: {data.get('status')}")
                        return None
                    
                    return data.get("result")
                    
        except Exception as e:
            logger.error(f"Error getting place details: {e}")
            return None