import math
import random
from typing import List, Tuple
from geopy.distance import geodesic

from app.models import LocationData, StationSearchResult
from app.config import get_settings


class StationSearchEngine:
    """駅検索エンジン"""
    
    def __init__(self):
        self.settings = get_settings()
        # 実際の実装では、駅データベースを使用
        # ここでは簡略化のため、主要駅の座標をハードコード
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
                        is_major_city_station=station_name in self.settings.all_major_cities
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