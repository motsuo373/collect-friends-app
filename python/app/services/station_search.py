import csv
import os
from typing import List, Dict, Tuple
from app.utils.distance import geodesic_distance_m
from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class StationSearchService:
    """駅検索サービス"""
    
    def __init__(self):
        self.major_stations = self._load_major_stations()
    
    def _load_major_stations(self) -> List[Dict[str, float]]:
        """大都市駅リストを読み込む"""
        stations = []
        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "resources",
            "major_stations.csv"
        )
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    stations.append({
                        "name": row["station_name"],
                        "latitude": float(row["latitude"]),
                        "longitude": float(row["longitude"])
                    })
            logger.info(f"Loaded {len(stations)} major stations")
        except Exception as e:
            logger.error(f"Failed to load major stations: {str(e)}")
            stations = []
        
        return stations
    
    async def search_nearby_stations(
        self,
        latitude: float,
        longitude: float,
        radius_km: int,
        max_stations: int
    ) -> List[Dict]:
        """
        近傍駅を検索
        
        Args:
            latitude: 緯度
            longitude: 経度
            radius_km: 検索半径（km）
            max_stations: 最大駅数
        
        Returns:
            駅情報のリスト
        """
        # TODO: Google Places APIを使用した実装
        # 現在は仮実装として空リストを返す
        logger.info(
            f"Searching stations within {radius_km}km of ({latitude}, {longitude})"
        )
        
        # 仮の駅データ（実装時はGoogle Places APIから取得）
        mock_stations = [
            {
                "name": "渋谷駅",
                "latitude": 35.658034,
                "longitude": 139.701636,
                "place_id": "ChIJAx7UL8qLGGARPd4L1uHe3rc"
            },
            {
                "name": "新宿駅",
                "latitude": 35.689607,
                "longitude": 139.700571,
                "place_id": "ChIJLW9dTHyLGGARB6x6OJlx7XU"
            }
        ]
        
        # 距離計算と絞り込み
        stations_with_distance = []
        for station in mock_stations:
            distance_m = geodesic_distance_m(
                latitude, longitude,
                station["latitude"], station["longitude"]
            )
            
            if distance_m <= radius_km * 1000:
                stations_with_distance.append({
                    **station,
                    "distance_m": distance_m
                })
        
        # 距離でソートして上位N件を返す
        stations_with_distance.sort(key=lambda x: x["distance_m"])
        return stations_with_distance[:max_stations]
    
    def find_nearest_major_station(
        self,
        latitude: float,
        longitude: float
    ) -> Dict:
        """
        最も近い大都市駅を検索
        
        Args:
            latitude: 緯度
            longitude: 経度
        
        Returns:
            最寄りの大都市駅情報
        """
        if not self.major_stations:
            return None
        
        nearest_station = None
        min_distance = float('inf')
        
        for station in self.major_stations:
            distance = geodesic_distance_m(
                latitude, longitude,
                station["latitude"], station["longitude"]
            )
            
            if distance < min_distance:
                min_distance = distance
                nearest_station = {
                    **station,
                    "distance_m": distance
                }
        
        logger.info(
            f"Nearest major station: {nearest_station['name']} "
            f"({nearest_station['distance_m']}m)"
        )
        
        return nearest_station
    
    def merge_and_deduplicate_stations(
        self,
        nearby_stations: List[Dict],
        major_station: Dict
    ) -> List[Dict]:
        """
        駅リストをマージして重複を排除
        
        Args:
            nearby_stations: 近傍駅リスト
            major_station: 大都市駅
        
        Returns:
            マージされた駅リスト
        """
        # 駅名で重複をチェック（正規化して比較）
        station_names = set()
        merged_stations = []
        
        # 近傍駅を追加
        for station in nearby_stations:
            normalized_name = self._normalize_station_name(station["name"])
            if normalized_name not in station_names:
                station_names.add(normalized_name)
                merged_stations.append(station)
        
        # 大都市駅を追加（重複していない場合）
        if major_station:
            normalized_name = self._normalize_station_name(major_station["name"])
            if normalized_name not in station_names:
                merged_stations.append(major_station)
        
        # 距離でソート
        merged_stations.sort(key=lambda x: x["distance_m"])
        
        logger.info(f"Merged stations: {len(merged_stations)} unique stations")
        
        return merged_stations
    
    def _normalize_station_name(self, name: str) -> str:
        """駅名を正規化（全角/半角、大小文字の統一）"""
        import unicodedata
        
        # NFKCで正規化（全角・半角を統一）
        normalized = unicodedata.normalize('NFKC', name)
        
        # 小文字に変換
        normalized = normalized.lower()
        
        # 「駅」を除去
        if normalized.endswith("駅"):
            normalized = normalized[:-1]
        
        return normalized