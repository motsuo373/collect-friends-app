import json
import requests
from typing import List, Dict, Optional
from geopy.distance import geodesic

from app.config import get_settings
from app.models import LocationData, StationSearchResult


class GooglePlacesAPIError(Exception):
    """Google Places API related exceptions"""
    pass


class GooglePlacesService:
    """Google Places API (New) を使用した駅検索サービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.GOOGLE_PLACES_API_KEY
        self.endpoint = "https://places.googleapis.com/v1/places:searchNearby"
        
        if not self.api_key or self.api_key == "your_google_places_key":
            raise GooglePlacesAPIError("Google Places API key not configured")
    
    async def search_nearby_stations(
        self,
        user_location: LocationData,
        radius_m: int,
        max_results: int = 20
    ) -> List[StationSearchResult]:
        """
        Google Places API (New) を使用して近隣駅を検索
        
        Args:
            user_location: ユーザーの位置情報
            radius_m: 検索半径（メートル）
            max_results: 最大結果数
            
        Returns:
            StationSearchResult のリスト
        """
        # APIリクエストペイロード
        payload = {
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": user_location.latitude,
                        "longitude": user_location.longitude
                    },
                    "radius": min(radius_m, 50000)  # 最大50km制限
                }
            },
            "includedTypes": ["train_station", "transit_station", "subway_station"],
            "maxResultCount": min(max_results, 50),  # 最大50件制限
            "languageCode": "ja"
        }
        
        # ヘッダー設定
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,"
                "places.location,places.types,places.businessStatus"
            )
        }
        
        try:
            # API呼び出し
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            return self._parse_places_response(data, user_location)
            
        except requests.exceptions.RequestException as e:
            raise GooglePlacesAPIError(f"Google Places API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise GooglePlacesAPIError(f"Invalid JSON response: {str(e)}")
        except Exception as e:
            raise GooglePlacesAPIError(f"Unexpected error: {str(e)}")
    
    def _parse_places_response(
        self,
        data: Dict,
        user_location: LocationData
    ) -> List[StationSearchResult]:
        """Places APIレスポンスを解析してStationSearchResultリストに変換"""
        stations = []
        places = data.get("places", [])
        
        user_coords = (user_location.latitude, user_location.longitude)
        
        for place in places:
            try:
                # 基本情報の抽出
                place_id = place.get("id", "")
                place_name = place.get("displayName", {}).get("text", "不明な駅")
                formatted_address = place.get("formattedAddress", "")
                location = place.get("location", {})
                place_types = place.get("types", [])
                business_status = place.get("businessStatus", "OPERATIONAL")
                
                # 座標情報
                lat = location.get("latitude")
                lng = location.get("longitude")
                
                if lat is None or lng is None:
                    continue
                
                # 距離計算
                station_coords = (lat, lng)
                distance_km = geodesic(user_coords, station_coords).kilometers
                
                # 駅タイプを判定
                station_types = self._determine_station_types(place_types)
                
                # 営業状況確認
                if business_status == "CLOSED_PERMANENTLY":
                    continue
                
                # StationSearchResultオブジェクト作成
                station = StationSearchResult(
                    station_name=place_name,
                    distance_km=round(distance_km, 2),
                    latitude=lat,
                    longitude=lng,
                    lines=station_types,  # APIから路線情報は取得困難なので、タイプ情報を使用
                    is_major_city_station=self._is_major_city_station(place_name),
                    place_id=place_id,
                    formatted_address=formatted_address,
                    business_status=business_status,
                    place_types=place_types
                )
                
                stations.append(station)
                
            except Exception as e:
                # 個別のplace解析エラーは警告レベルでログ出力し、処理を継続
                print(f"Warning: Failed to parse place data: {e}")
                continue
        
        # 距離順でソート
        stations.sort(key=lambda x: x.distance_km)
        
        return stations
    
    def _determine_station_types(self, place_types: List[str]) -> List[str]:
        """Place typesから駅タイプを判定"""
        station_type_mapping = {
            "train_station": "鉄道駅",
            "subway_station": "地下鉄駅", 
            "transit_station": "交通機関駅",
            "light_rail_station": "軽rail駅",
            "bus_station": "バス駅"
        }
        
        types = []
        for place_type in place_types:
            if place_type in station_type_mapping:
                types.append(station_type_mapping[place_type])
        
        return types if types else ["駅"]
    
    def _is_major_city_station(self, station_name: str) -> bool:
        """駅が大都市駅かどうかを判定"""
        major_cities = self.settings.all_major_cities
        
        # 完全一致チェック
        if station_name in major_cities:
            return True
        
        # 部分一致チェック（「東京駅」「東京」など）
        for major_city in major_cities:
            if major_city in station_name or station_name in major_city:
                return True
        
        return False
    
    async def validate_api_key(self) -> bool:
        """API キーの有効性を確認"""
        try:
            # 簡単なテストリクエスト（東京駅周辺）
            test_location = LocationData(latitude=35.6812, longitude=139.7671)
            stations = await self.search_nearby_stations(test_location, radius_m=1000, max_results=1)
            return True
        except GooglePlacesAPIError:
            return False