from typing import List, Tuple, Optional, Dict, Any
from geopy.distance import geodesic

from app.models import LocationData, StationSearchResult
from app.config import get_settings
from app.services.google_places import GooglePlacesService, GooglePlacesAPIError


class StationSearchEngine:
    """駅検索エンジン"""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Google Places API サービスの初期化
        try:
            self.places_service = GooglePlacesService()
            self.use_google_places = True
        except Exception as e:
            print(f"Google Places API initialization failed: {e}")
            self.places_service = None
            self.use_google_places = False
        
        # フォールバック用のハードコードされた駅データベース
        self.station_database = {
            # 関東
            "新宿": {"lat": 35.6896, "lng": 139.7006, "lines": ["JR山手線", "JR中央線", "小田急線", "京王線", "東京メトロ丸ノ内線"]},
            "渋谷": {"lat": 35.6580, "lng": 139.7016, "lines": ["JR山手線", "東急東横線", "京王井の頭線", "東京メトロ銀座線"]},
            "池袋": {"lat": 35.7295, "lng": 139.7109, "lines": ["JR山手線", "JR埼京線", "東武東上線", "西武池袋線"]},
            "品川": {"lat": 35.6284, "lng": 139.7387, "lines": ["JR山手線", "JR東海道線", "京急本線"]},
            "東京": {"lat": 35.6812, "lng": 139.7671, "lines": ["JR山手線", "JR中央線", "JR東海道新幹線", "東京メトロ丸ノ内線"]},
            "上野": {"lat": 35.7141, "lng": 139.7774, "lines": ["JR山手線", "JR京浜東北線", "東京メトロ銀座線", "京成本線"]},
            "浅草": {"lat": 35.7119, "lng": 139.7983, "lines": ["東京メトロ銀座線", "東武スカイツリーライン", "都営浅草線"]},
            "横浜": {"lat": 35.4658, "lng": 139.6222, "lines": ["JR東海道線", "JR横須賀線", "京急本線", "東急東横線"]},
            "川崎": {"lat": 35.5308, "lng": 139.6973, "lines": ["JR東海道線", "JR京浜東北線", "JR南武線"]},
            "大宮": {"lat": 35.9064, "lng": 139.6237, "lines": ["JR京浜東北線", "JR埼京線", "東武野田線"]},
            
            # 関西
            "大阪": {"lat": 34.7024, "lng": 135.4959, "lines": ["JR大阪環状線", "JR東海道線", "大阪メトロ御堂筋線"]},
            "梅田": {"lat": 34.7002, "lng": 135.4980, "lines": ["阪急電鉄", "阪神電鉄", "大阪メトロ御堂筋線"]},
            "難波": {"lat": 34.6657, "lng": 135.5022, "lines": ["南海電鉄", "近鉄難波線", "大阪メトロ御堂筋線"]},
            "天王寺": {"lat": 34.6466, "lng": 135.5136, "lines": ["JR大阪環状線", "JR阪和線", "大阪メトロ御堂筋線"]},
            "京都": {"lat": 34.9859, "lng": 135.7585, "lines": ["JR東海道新幹線", "JR東海道線", "近鉄京都線"]},
            "神戸": {"lat": 34.6791, "lng": 135.1780, "lines": ["JR東海道線", "阪神電鉄", "阪急電鉄"]},
            "三宮": {"lat": 34.6948, "lng": 135.1980, "lines": ["JR東海道線", "阪神電鉄", "阪急電鉄", "神戸市営地下鉄"]},
            
            # 中部
            "名古屋": {"lat": 35.1706, "lng": 136.8816, "lines": ["JR東海道新幹線", "JR東海道線", "名鉄名古屋本線"]},
            "栄": {"lat": 35.1699, "lng": 136.9082, "lines": ["名古屋市営地下鉄東山線", "名古屋市営地下鉄名城線"]},
            
            # その他の駅（ユーザー周辺を想定）
            "恵比寿": {"lat": 35.6467, "lng": 139.7100, "lines": ["JR山手線", "東京メトロ日比谷線"]},
            "中目黒": {"lat": 35.6440, "lng": 139.6983, "lines": ["東急東横線", "東京メトロ日比谷線"]},
            "代官山": {"lat": 35.6484, "lng": 139.7035, "lines": ["東急東横線"]},
            "自由が丘": {"lat": 35.6069, "lng": 139.6681, "lines": ["東急東横線", "東急大井町線"]},
            "三軒茶屋": {"lat": 35.6436, "lng": 139.6681, "lines": ["東急田園都市線", "東急世田谷線"]},
        }
    
    async def search_nearby_stations(
        self,
        user_location: LocationData,
        radius_km: float,
        max_stations: int
    ) -> List[StationSearchResult]:
        """ユーザーの位置から近い駅を検索"""
        
        # Google Places APIが利用可能な場合は、それを使用
        if self.use_google_places and self.places_service:
            try:
                print(f"🔄 Attempting Google Places API search for location: {user_location.latitude}, {user_location.longitude}")
                
                # kmをメートルに変換
                radius_m = int(radius_km * 1000)
                print(f"🔄 Search radius: {radius_m}m, max_stations: {max_stations}")
                
                # Google Places APIで検索
                stations = await self.places_service.search_nearby_stations(
                    user_location=user_location,
                    radius_m=radius_m,
                    max_results=max_stations
                )
                
                print(f"✅ Google Places API returned {len(stations)} stations")
                if stations:
                    print(f"🏢 First station: {stations[0].station_name}")
                return stations
                
            except GooglePlacesAPIError as e:
                print(f"🚨 Google Places API error, falling back to local database: {e}")
                print(f"🔍 Error details: {type(e).__name__} - {str(e)}")
                # エラーの場合はフォールバック処理を実行
        
        # フォールバック：ハードコードされた駅データベースを使用
        print("Using fallback station database")
        return await self._search_nearby_stations_fallback(user_location, radius_km, max_stations)
    
    async def _search_nearby_stations_fallback(
        self,
        user_location: LocationData,
        radius_km: float,
        max_stations: int
    ) -> List[StationSearchResult]:
        """フォールバック用の近隣駅検索（ハードコードデータベース使用）"""
        nearby_stations = []
        user_coords = (user_location.latitude, user_location.longitude)
        
        for station_name, station_info in self.station_database.items():
            station_coords = (station_info["lat"], station_info["lng"])
            distance = geodesic(user_coords, station_coords).kilometers
            
            if distance <= radius_km:
                nearby_stations.append(
                    StationSearchResult(
                        station_name=station_name,
                        distance_km=round(distance, 2),
                        latitude=station_info["lat"],
                        longitude=station_info["lng"],
                        lines=station_info["lines"],
                        is_major_city_station=station_name in self.settings.all_major_cities,
                        formatted_address=f"{station_name}駅周辺",
                        place_id="fallback_" + station_name,
                        business_status="OPERATIONAL",
                        place_types=["train_station"]
                    )
                )
        
        # 距離でソート
        nearby_stations.sort(key=lambda x: x.distance_km)
        
        # 最大数で制限
        return nearby_stations[:max_stations]
    
    def get_major_city_stations(
        self, 
        user_location: LocationData,
        exclude_stations: List[str] = None
    ) -> List[StationSearchResult]:
        """大都市の駅を取得（既に見つかった駅を除外）"""
        if exclude_stations is None:
            exclude_stations = []
        
        major_stations = []
        user_coords = (user_location.latitude, user_location.longitude)
        
        # ユーザーの位置から最も近い地域を特定
        region_distances = {}
        for region, cities in self.settings.MAJOR_CITIES.items():
            # 各地域の代表駅で距離を計算
            if region == "関東":
                rep_coords = (35.6812, 139.7671)  # 東京駅
            elif region == "関西":
                rep_coords = (34.7024, 135.4959)  # 大阪駅
            elif region == "中部":
                rep_coords = (35.1706, 136.8816)  # 名古屋駅
            else:  # 九州
                rep_coords = (33.5904, 130.4017)  # 博多駅
            
            distance = geodesic(user_coords, rep_coords).kilometers
            region_distances[region] = distance
        
        # 最も近い地域から駅を選択
        sorted_regions = sorted(region_distances.items(), key=lambda x: x[1])
        selected_stations = []
        
        for region, _ in sorted_regions[:2]:  # 最も近い2地域から選択
            cities = self.settings.MAJOR_CITIES[region]
            for city in cities:
                if city not in exclude_stations and city in self.station_database:
                    station_info = self.station_database[city]
                    station_coords = (station_info["lat"], station_info["lng"])
                    distance = geodesic(user_coords, station_coords).kilometers
                    
                    selected_stations.append(
                        StationSearchResult(
                            station_name=city,
                            distance_km=round(distance, 2),
                            latitude=station_info["lat"],
                            longitude=station_info["lng"],
                            lines=station_info["lines"],
                            is_major_city_station=True
                        )
                    )
        
        # 距離でソートして近い順に4駅選択
        selected_stations.sort(key=lambda x: x.distance_km)
        return selected_stations[:4]
    
    async def get_stations_for_research(
        self,
        user_location: LocationData,
        radius_km: float,
        max_stations: int
    ) -> List[StationSearchResult]:
        """研究対象の駅リストを取得（近隣駅＋大都市駅）"""
        # 近隣駅を検索
        nearby_stations = await self.search_nearby_stations(
            user_location, 
            radius_km, 
            max_stations - 4  # 大都市駅用に4駅分を確保
        )
        
        # 既に見つかった駅名のリスト
        found_station_names = [s.station_name for s in nearby_stations]
        
        # 大都市駅を追加
        major_stations = self.get_major_city_stations(
            user_location,
            exclude_stations=found_station_names
        )
        
        # 結合して返す
        all_stations = nearby_stations + major_stations
        
        return all_stations
    
    def get_service_status(self) -> Dict[str, Any]:
        """サービスの状態を取得"""
        status = {
            "google_places_api": {
                "enabled": self.use_google_places,
                "service_available": self.places_service is not None
            },
            "fallback_database": {
                "station_count": len(self.station_database),
                "major_cities": len(self.settings.all_major_cities)
            }
        }
        
        if self.places_service:
            try:
                # API キー検証は非同期なので、ここでは簡単なチェックのみ
                status["google_places_api"]["api_key_configured"] = bool(self.settings.GOOGLE_PLACES_API_KEY and
                                                                        self.settings.GOOGLE_PLACES_API_KEY != "your_google_places_key")
            except Exception as e:
                status["google_places_api"]["api_key_configured"] = False
                status["google_places_api"]["error"] = str(e)
        
        return status
    
    async def test_station_search(self, test_location: Optional[LocationData] = None) -> Dict[str, Any]:
        """駅検索機能のテスト"""
        if test_location is None:
            # 東京駅をデフォルトテスト位置として使用
            test_location = LocationData(latitude=35.6812, longitude=139.7671)
        
        results = {
            "test_location": {
                "latitude": test_location.latitude,
                "longitude": test_location.longitude
            }
        }
        
        try:
            # 近隣駅検索テスト
            stations = await self.search_nearby_stations(
                user_location=test_location,
                radius_km=2.0,
                max_stations=5
            )
            
            results["nearby_search"] = {
                "success": True,
                "station_count": len(stations),
                "stations": [
                    {
                        "name": s.station_name,
                        "distance_km": s.distance_km,
                        "api_source": "google_places" if s.place_id and not s.place_id.startswith("fallback_") else "fallback"
                    }
                    for s in stations[:3]  # 最初の3駅のみ表示
                ]
            }
            
        except Exception as e:
            results["nearby_search"] = {
                "success": False,
                "error": str(e)
            }
        
        return results