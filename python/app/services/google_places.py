import json
import requests
from typing import List, Dict, Optional
from geopy.distance import geodesic

from app.config import get_settings
from app.models import LocationData, StationSearchResult, RestaurantInfo


class GooglePlacesAPIError(Exception):
    """Google Places API related exceptions"""
    pass


class GooglePlacesService:
    """Google Places API (New) を使用した駅検索サービス"""
    
    def __init__(self):
        self.settings = get_settings()
        # GOOGLE_PLACES_API_KEY または GOOGLE_API_KEY を使用
        self.api_key = self.settings.GOOGLE_PLACES_API_KEY or getattr(self.settings, 'GOOGLE_API_KEY', None)
        self.endpoint = "https://places.googleapis.com/v1/places:searchNearby"
        
        # API キーチェックを改善
        if not self.api_key or self.api_key.strip() == "" or self.api_key == "your_google_places_api_key_here":
            print("WARNING: Google Places API key not configured. Service will return empty results.")
            self.api_key = None
    
    def search_nearby_spots(
        self,
        user_location: LocationData,
        radius_m: int,
        included_types: List[str],
        max_results: int = 20
    ) -> List[StationSearchResult]:
        """
        Google Places API (New) を使用して近隣スポットを検索
        
        Args:
            user_location: ユーザーの位置情報
            radius_m: 検索半径（メートル）
            included_types: 検索対象のタイプリスト
            max_results: 最大結果数
            
        Returns:
            StationSearchResult のリスト（スポット情報として利用）
        """
        print(f"🌐 Google Places API search starting...")
        print(f"   Location: ({user_location.latitude}, {user_location.longitude})")
        print(f"   Radius: {radius_m}m")
        print(f"   Types: {included_types}")
        print(f"   Max results: {max_results}")
        
        # APIキーがない場合は空のリストを返す
        if not self.api_key:
            print("❌ Google Places API key not available. Returning empty results.")
            return []
        
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
            "includedTypes": included_types,
            "maxResultCount": min(max_results, 20),  # 最大20件制限
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
        
        print(f"📤 Sending request to: {self.endpoint}")
        print(f"📋 Payload: {json.dumps(payload, indent=2)}")
        
        try:
            # API呼び出し
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            print(f"📥 Response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ API Error Response: {response.text}")
                return []
            
            data = response.json()
            print(f"📊 API Response received: {len(data.get('places', []))} places found")
            
            # レスポンスの詳細をログ出力
            if "places" in data:
                for i, place in enumerate(data["places"][:3]):  # 最初の3件だけ詳細表示
                    name = place.get("displayName", {}).get("text", "Unknown")
                    types = place.get("types", [])
                    print(f"  {i+1}. {name} - Types: {types}")
            
            return self._parse_places_response(data, user_location)
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Google Places API request failed: {str(e)}")
            return []  # エラー時も空のリストを返す
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON response: {str(e)}")
            return []
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
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
    
    def validate_api_key(self) -> bool:
        """API キーの有効性を確認"""
        try:
            # 簡単なテストリクエスト（東京駅周辺）
            test_location = LocationData(latitude=35.6812, longitude=139.7671)
            stations = self.search_nearby_spots(test_location, radius_m=1000, included_types=["train_station"], max_results=1)
            return True
        except GooglePlacesAPIError:
            return False
    
    def get_search_types_for_scene(
        self,
        activity_types: List[str],
        time_of_day: Optional[str] = None,
        scene_type: Optional[str] = None,
        preferred_cuisine_types: Optional[List[str]] = None
    ) -> List[str]:
        """
        シーンに応じた検索タイプを動的に決定
        """
        search_types = set()
        
        # アクティビティタイプに基づく基本的な検索タイプ
        activity_type_mapping = {
            "cafe": ["cafe", "bakery", "coffee_shop"],
            "drink": ["bar", "pub", "night_club", "wine_bar", "cocktail_lounge"],
            "food": ["restaurant", "meal_takeaway", "meal_delivery"],
            "shopping": ["shopping_mall", "store", "supermarket"],
            "movie": ["movie_theater", "entertainment"],
            "walk": ["park", "tourist_attraction", "museum"]
        }
        
        for activity in activity_types:
            if activity in activity_type_mapping:
                search_types.update(activity_type_mapping[activity])
        
        # 時間帯による調整
        if time_of_day:
            if time_of_day in ["breakfast", "brunch"]:
                search_types.update(["cafe", "bakery", "breakfast_restaurant"])
            elif time_of_day == "lunch":
                search_types.update(["restaurant", "meal_takeaway", "cafe"])
            elif time_of_day == "dinner":
                search_types.update(["restaurant", "fine_dining_restaurant"])
            elif time_of_day in ["night", "late_night"]:
                search_types.update(["bar", "night_club", "pub"])
        
        # シーンタイプによる調整
        if scene_type:
            if scene_type in ["date", "first_date", "anniversary"]:
                search_types.update(["restaurant", "cafe", "wine_bar"])
                # チェーン店系を除外
                search_types.discard("fast_food")
                search_types.discard("meal_takeaway")
            elif scene_type == "business":
                search_types.update(["restaurant", "cafe"])
                search_types.discard("bar")
                search_types.discard("night_club")
            elif scene_type == "family":
                search_types.update(["restaurant", "cafe", "family_restaurant"])
                search_types.discard("bar")
                search_types.discard("night_club")
            elif scene_type in ["friends", "group_party"]:
                search_types.update(["restaurant", "bar", "pub", "izakaya"])
        
        # 料理タイプによる調整
        if preferred_cuisine_types:
            cuisine_mapping = {
                "japanese": ["japanese_restaurant", "sushi_restaurant", "ramen_restaurant"],
                "sushi": ["sushi_restaurant"],
                "ramen": ["ramen_restaurant"],
                "italian": ["italian_restaurant", "pizza_restaurant"],
                "french": ["french_restaurant"],
                "chinese": ["chinese_restaurant"],
                "cafe": ["cafe", "coffee_shop"],
                "bar": ["bar", "wine_bar", "cocktail_lounge"]
            }
            
            for cuisine in preferred_cuisine_types:
                if cuisine in cuisine_mapping:
                    search_types.update(cuisine_mapping[cuisine])
        
        # 基本的な"restaurant"は常に含める
        search_types.add("restaurant")
        
        return list(search_types)
    
    def get_casual_search_types_for_scene(
        self,
        activity_types: List[str],
        time_of_day: Optional[str] = None,
        scene_type: Optional[str] = None,
        casual_level: Optional[str] = None,
        prefer_chain_stores: bool = True
    ) -> List[str]:
        """
        カジュアル志向のシーンに応じた検索タイプを動的に決定
        """
        search_types = set()
        
        # カジュアル志向のアクティビティタイプマッピング
        casual_activity_mapping = {
            "cafe": ["cafe", "coffee_shop", "fast_food"],  # ファストカジュアルを追加
            "drink": ["bar", "pub", "izakaya", "night_club"],  # 高級バーを除外
            "food": ["restaurant", "meal_takeaway", "fast_food", "family_restaurant"],
            "shopping": ["shopping_mall", "convenience_store", "supermarket"],
            "movie": ["movie_theater"],
            "walk": ["park", "amusement_park"]
        }
        
        for activity in activity_types:
            if activity in casual_activity_mapping:
                search_types.update(casual_activity_mapping[activity])
        
        # 時間帯による調整（カジュアル重視）
        if time_of_day:
            if time_of_day in ["breakfast", "brunch"]:
                search_types.update(["cafe", "fast_food", "family_restaurant"])
            elif time_of_day == "lunch":
                search_types.update(["restaurant", "fast_food", "cafe", "meal_takeaway"])
            elif time_of_day == "dinner":
                search_types.update(["restaurant", "family_restaurant", "izakaya"])
            elif time_of_day in ["night", "late_night"]:
                search_types.update(["bar", "pub", "izakaya", "karaoke"])
        
        # シーンタイプによる調整（友人向け）
        if scene_type:
            if scene_type in ["friends", "casual_meetup", "group_party"]:
                search_types.update(["restaurant", "bar", "pub", "izakaya", "karaoke"])
                # チェーン店優遇
                if prefer_chain_stores:
                    search_types.update(["fast_food", "family_restaurant"])
            elif scene_type in ["date", "first_date"]:
                # デートでもカジュアル寄り
                search_types.update(["cafe", "restaurant", "family_restaurant"])
                search_types.discard("fast_food")  # ファストフードは除外
            elif scene_type == "family":
                search_types.update(["family_restaurant", "cafe", "fast_food"])
                search_types.discard("bar")
                search_types.discard("pub")
        
        # カジュアル度による調整
        if casual_level:
            if casual_level == "very_casual":
                search_types.update(["fast_food", "family_restaurant", "pub", "cafe"])
                # 高級店系を除外
                search_types.discard("fine_dining")
                search_types.discard("wine_bar")
            elif casual_level == "casual":
                search_types.update(["restaurant", "cafe", "bar", "pub"])
            elif casual_level == "formal":
                # フォーマルでも手頃な店舗を優先
                search_types.update(["restaurant"])
                search_types.discard("fast_food")
                search_types.discard("pub")
        
        # 基本的な"restaurant"は常に含める
        search_types.add("restaurant")
        
        # 高級店系を明示的に除外
        high_end_types = ["fine_dining", "wine_bar", "cocktail_lounge"]
        for high_end in high_end_types:
            search_types.discard(high_end)
        
        return list(search_types)
    
    def search_restaurants_near_location_enhanced(
        self,
        location: LocationData,
        radius_m: int,
        max_results: int = 20,
        activity_types: Optional[List[str]] = None,
        time_of_day: Optional[str] = None,
        scene_type: Optional[str] = None,
        preferred_cuisine_types: Optional[List[str]] = None,
        special_requirements: Optional[List[str]] = None,
        min_rating: Optional[float] = None
    ) -> List[RestaurantInfo]:
        """
        拡張版店舗検索 - シーンに応じた動的検索
        """
        print(f"🍽️ Enhanced restaurant search starting...")
        print(f"   Location: ({location.latitude}, {location.longitude})")
        print(f"   Radius: {radius_m}m")
        print(f"   Activity types: {activity_types}")
        print(f"   Time of day: {time_of_day}")
        print(f"   Scene type: {scene_type}")
        print(f"   Preferred cuisines: {preferred_cuisine_types}")
        print(f"   Special requirements: {special_requirements}")
        print(f"   Min rating: {min_rating}")
        
        # APIキーがない場合は空のリストを返す
        if not self.api_key:
            print("❌ Google Places API key not available. Returning empty results.")
            return []
        
        # 検索半径を調整
        search_radius = max(radius_m, 1000)
        search_radius = min(search_radius, 5000)
        print(f"📏 Adjusted search radius: {search_radius}m")
        
        # シーンに応じた検索タイプを決定
        search_types = self.get_search_types_for_scene(
            activity_types or ["food"],
            time_of_day,
            scene_type,
            preferred_cuisine_types
        )
        
        print(f"🏷️ Dynamic search types: {search_types}")
        
        all_restaurants = []
        
        # 複数の検索タイプで段階的に検索
        for search_type_batch in [search_types[:3], search_types[3:6], search_types[6:]]:
            if not search_type_batch:
                continue
                
            print(f"🔍 Searching with types: {search_type_batch}")
            
            restaurants = self._search_with_types(
                location, search_radius, search_type_batch, min(max_results, 10)
            )
            
            all_restaurants.extend(restaurants)
            
            # 十分な結果が得られた場合は終了
            if len(all_restaurants) >= max_results:
                break
        
        # 重複除去
        unique_restaurants = []
        seen_place_ids = set()
        
        for restaurant in all_restaurants:
            if restaurant.place_id not in seen_place_ids:
                unique_restaurants.append(restaurant)
                seen_place_ids.add(restaurant.place_id)
        
        # フィルタリング
        filtered_restaurants = self._apply_filters(
            unique_restaurants,
            min_rating=min_rating,
            special_requirements=special_requirements
        )
        
        # 結果をランキング
        ranked_restaurants = self._rank_restaurants(
            filtered_restaurants,
            activity_types or ["food"],
            scene_type,
            preferred_cuisine_types
        )
        
        print(f"📊 Final results: {len(ranked_restaurants)} restaurants")
        return ranked_restaurants[:max_results]
    
    def _search_with_types(
        self,
        location: LocationData,
        radius_m: int,
        search_types: List[str],
        max_results: int
    ) -> List[RestaurantInfo]:
        """指定されたタイプで検索実行"""
        
        payload = {
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": location.latitude,
                        "longitude": location.longitude
                    },
                    "radius": radius_m
                }
            },
            "includedTypes": search_types,
            "maxResultCount": min(max_results, 20),
            "languageCode": "ja"
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,"
                "places.location,places.types,places.businessStatus,"
                "places.rating,places.userRatingCount,places.priceLevel,"
                "places.regularOpeningHours"
            )
        }
        
        try:
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_restaurant_response(data, location)
            else:
                print(f"❌ API Error: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Search error: {str(e)}")
            return []
    
    def _apply_filters(
        self,
        restaurants: List[RestaurantInfo],
        min_rating: Optional[float] = None,
        special_requirements: Optional[List[str]] = None
    ) -> List[RestaurantInfo]:
        """フィルタリング適用"""
        filtered = restaurants
        
        # 最低評価でフィルタ
        if min_rating is not None:
            filtered = [r for r in filtered if r.rating and r.rating >= min_rating]
        
        # 特別要求は現在は基本的なフィルタのみ
        # 実際の実装では、各店舗の詳細情報が必要
        
        return filtered
    
    def _rank_restaurants(
        self,
        restaurants: List[RestaurantInfo],
        activity_types: List[str],
        scene_type: Optional[str],
        preferred_cuisine_types: Optional[List[str]]
    ) -> List[RestaurantInfo]:
        """レストランのランキング"""
        
        def calculate_score(restaurant: RestaurantInfo) -> float:
            score = 0.0
            
            # 基本評価（最大5点）
            if restaurant.rating:
                score += restaurant.rating  # 最大5点
            
            # レビュー数による信頼度（最大2点）
            if restaurant.user_ratings_total:
                review_score = min(restaurant.user_ratings_total / 1000, 2)  # 最大2点
                score += review_score
            
            # アクティビティタイプとの一致度（最大1.5点）
            restaurant_type_lower = restaurant.type.lower()
            cuisine_type_lower = (restaurant.cuisine_type or "").lower()
            
            activity_match_score = 0
            for activity in activity_types:
                if activity in restaurant_type_lower or activity in cuisine_type_lower:
                    activity_match_score += 0.5
            score += min(activity_match_score, 1.5)
            
            # 料理タイプとの一致度（最大1点）
            if preferred_cuisine_types:
                cuisine_match_score = 0
                for cuisine in preferred_cuisine_types:
                    if cuisine in cuisine_type_lower or cuisine in restaurant_type_lower:
                        cuisine_match_score += 0.3
                score += min(cuisine_match_score, 1)
            
            # シーンタイプによるボーナス（最大0.5点）
            if scene_type:
                if scene_type in ["date", "anniversary"] and "カフェ" in restaurant_type_lower:
                    score += 0.5
                elif scene_type == "business" and "レストラン" in restaurant_type_lower:
                    score += 0.5
            
            # スコアを10点満点に正規化
            return min(score, 10.0)
        
        # スコア計算してソート
        scored_restaurants = [(r, calculate_score(r)) for r in restaurants]
        scored_restaurants.sort(key=lambda x: x[1], reverse=True)
        
        return [r for r, _ in scored_restaurants]
    
    def _parse_restaurant_response(
        self,
        data: Dict,
        reference_location: LocationData
    ) -> List[RestaurantInfo]:
        """Places APIレスポンスを解析してRestaurantInfoリストに変換"""
        restaurants = []
        places = data.get("places", [])
        
        reference_coords = (reference_location.latitude, reference_location.longitude)
        print(f"🔄 Parsing {len(places)} places...")
        
        for place in places:
            try:
                # 基本情報の抽出
                place_id = place.get("id", "")
                place_name = place.get("displayName", {}).get("text", "不明な店舗")
                formatted_address = place.get("formattedAddress", "")
                location = place.get("location", {})
                place_types = place.get("types", [])
                business_status = place.get("businessStatus", "OPERATIONAL")
                
                # 座標情報
                lat = location.get("latitude")
                lng = location.get("longitude")
                
                if lat is None or lng is None:
                    print(f"⚠️ Skipping {place_name}: missing coordinates")
                    continue
                
                # 営業状況確認（閉店している店舗はスキップ）
                if business_status == "CLOSED_PERMANENTLY":
                    print(f"⚠️ Skipping {place_name}: permanently closed")
                    continue
                
                # 距離計算
                restaurant_coords = (lat, lng)
                distance_km = geodesic(reference_coords, restaurant_coords).kilometers
                
                # 評価情報（シンプルな形で取得）
                rating = place.get("rating")
                user_ratings_total = place.get("userRatingCount")
                price_level = place.get("priceLevel")
                
                # 店舗タイプと料理ジャンルの判定
                restaurant_type = self._determine_restaurant_type(place_types)
                cuisine_type = self._determine_cuisine_type(place_types, place_name)
                
                # RestaurantInfoオブジェクト作成（シンプルなフィールドのみ）
                restaurant = RestaurantInfo(
                    name=place_name,
                    type=restaurant_type,
                    cuisine_type=cuisine_type,
                    address=formatted_address,
                    latitude=lat,
                    longitude=lng,
                    distance_from_station_km=round(distance_km, 2),
                    rating=rating,
                    user_ratings_total=user_ratings_total,
                    price_level=price_level,
                    opening_hours=None,  # 簡素化のため省略
                    place_id=place_id,
                    phone_number=None,  # 簡素化のため省略
                    website=None  # 簡素化のため省略
                )
                
                restaurants.append(restaurant)
                print(f"✅ Parsed: {place_name} ({restaurant_type}) - {distance_km:.2f}km")
                
            except Exception as e:
                print(f"⚠️ Failed to parse restaurant data for {place.get('displayName', {}).get('text', 'Unknown')}: {e}")
                continue
        
        # 距離順でソート
        restaurants.sort(key=lambda x: x.distance_from_station_km)
        
        print(f"✅ Successfully parsed {len(restaurants)} restaurants")
        
        return restaurants
    
    def _determine_restaurant_type(self, place_types: List[str]) -> str:
        """Place typesから店舗タイプを判定"""
        type_mapping = {
            "restaurant": "レストラン",
            "cafe": "カフェ",
            "bar": "バー",
            "bakery": "ベーカリー",
            "meal_takeaway": "テイクアウト店",
            "meal_delivery": "デリバリー店",
            "fast_food_restaurant": "ファストフード",
            "japanese_restaurant": "日本料理店",
            "italian_restaurant": "イタリア料理店",
            "chinese_restaurant": "中華料理店",
            "korean_restaurant": "韓国料理店",
            "american_restaurant": "アメリカ料理店",
            "french_restaurant": "フランス料理店",
            "food": "飲食店"
        }
        
        # 優先順位の高いタイプから検索
        priority_types = [
            "japanese_restaurant", "italian_restaurant", "chinese_restaurant",
            "korean_restaurant", "american_restaurant", "french_restaurant",
            "restaurant", "cafe", "bar", "bakery", "fast_food_restaurant"
        ]
        
        for ptype in priority_types:
            if ptype in place_types:
                return type_mapping.get(ptype, "飲食店")
        
        # その他のタイプをチェック
        for place_type in place_types:
            if place_type in type_mapping:
                return type_mapping[place_type]
        
        return "飲食店"
    
    def _determine_cuisine_type(self, place_types: List[str], place_name: str) -> Optional[str]:
        """料理ジャンルを判定"""
        cuisine_mapping = {
            "japanese_restaurant": "日本料理",
            "italian_restaurant": "イタリア料理",
            "chinese_restaurant": "中華料理",
            "korean_restaurant": "韓国料理",
            "american_restaurant": "アメリカ料理",
            "french_restaurant": "フランス料理",
            "cafe": "カフェ",
            "bar": "バー",
            "bakery": "ベーカリー"
        }
        
        # place_typesから判定
        for place_type in place_types:
            if place_type in cuisine_mapping:
                return cuisine_mapping[place_type]
        
        # 店舗名から判定（簡単なキーワードマッチング）
        name_lower = place_name.lower()
        if any(keyword in name_lower for keyword in ["sushi", "すし", "寿司", "和食"]):
            return "日本料理"
        elif any(keyword in name_lower for keyword in ["pasta", "pizza", "italian"]):
            return "イタリア料理"
        elif any(keyword in name_lower for keyword in ["中華", "中国", "chinese"]):
            return "中華料理"
        elif any(keyword in name_lower for keyword in ["korean", "韓国", "焼肉"]):
            return "韓国料理"
        elif any(keyword in name_lower for keyword in ["cafe", "カフェ", "coffee"]):
            return "カフェ"
        elif any(keyword in name_lower for keyword in ["bar", "バー", "居酒屋"]):
            return "バー・居酒屋"
        
        return None
    
    def search_restaurants_near_location(
        self,
        location: LocationData,
        radius_m: int,
        max_results: int = 20,
        restaurant_types: Optional[List[str]] = None
    ) -> List[RestaurantInfo]:
        """
        指定地点周辺の店舗を検索（後方互換性）
        """
        # 新しい拡張メソッドに委譲
        return self.search_restaurants_near_location_enhanced(
            location=location,
            radius_m=radius_m,
            max_results=max_results,
            activity_types=["food"] if not restaurant_types else restaurant_types,
            time_of_day=None,
            scene_type=None,
            preferred_cuisine_types=None,
            special_requirements=None,
            min_rating=None
        )
    
    def _apply_casual_filters(
        self,
        restaurants: List[RestaurantInfo],
        max_price_per_person: Optional[int] = None,
        casual_level: Optional[str] = None,
        exclude_high_end: bool = True
    ) -> List[RestaurantInfo]:
        """カジュアル志向のフィルタリング適用"""
        filtered = restaurants
        
        # 価格フィルタ（厳格）
        if max_price_per_person:
            # Google Places APIのprice_levelを予算に対応させる
            # 1: 安い, 2: 中程度, 3: 高い, 4: 非常に高い
            if max_price_per_person <= 2000:
                filtered = [r for r in filtered if not r.price_level or r.price_level <= 2]
            elif max_price_per_person <= 3500:
                filtered = [r for r in filtered if not r.price_level or r.price_level <= 3]
            else:
                filtered = [r for r in filtered if not r.price_level or r.price_level <= 4]
        
        # 高級店除外
        if exclude_high_end:
            high_end_keywords = ["高級", "フレンチ", "懐石", "コース", "ホテル", "高級店", "fine dining"]
            filtered = [
                r for r in filtered 
                if not any(keyword in r.name.lower() or keyword in (r.type or "").lower() 
                          for keyword in high_end_keywords)
            ]
        
        # カジュアル度による調整
        if casual_level == "very_casual":
            # チェーン店や庶民的な店舗を優遇
            chain_keywords = ["スタバ", "ドトール", "マック", "ファミマ", "セブン", "吉野家", "すき家", "サイゼ"]
            casual_filtered = [
                r for r in filtered 
                if any(keyword in r.name for keyword in chain_keywords) or
                   r.type in ["ファストフード", "ファミリーレストラン", "カフェ"]
            ]
            # チェーン店が見つからない場合は元のリストを使用
            if casual_filtered:
                filtered = casual_filtered
        
        return filtered
    
    def _calculate_casual_score(self, restaurant: RestaurantInfo) -> float:
        """カジュアル度スコアを計算"""
        score = 5.0  # ベーススコア
        
        # チェーン店ボーナス
        chain_keywords = ["スタバ", "ドトール", "マック", "ケンタッキー", "サブウェイ", "吉野家", "すき家", "松屋", 
                         "サイゼ", "ガスト", "ココス", "バーミヤン", "大戸屋", "やよい軒"]
        if any(keyword in restaurant.name for keyword in chain_keywords):
            score += 3.0
        
        # 店舗タイプによるスコア
        casual_types = ["ファミリーレストラン", "ファストフード", "カフェ", "居酒屋", "パブ"]
        if any(casual_type in restaurant.type for casual_type in casual_types):
            score += 2.0
        
        # 価格レベルによるスコア
        if restaurant.price_level:
            if restaurant.price_level <= 2:
                score += 2.0  # 安い店舗を優遇
            elif restaurant.price_level == 3:
                score += 0.5  # 中程度
            else:
                score -= 1.0  # 高い店舗は減点
        
        # 評価数による信頼度（カジュアル店では多めのレビューを評価）
        if restaurant.user_ratings_total:
            if restaurant.user_ratings_total >= 500:
                score += 1.0
            elif restaurant.user_ratings_total >= 100:
                score += 0.5
        
        return min(score, 10.0)

    def search_casual_restaurants_near_location(
        self,
        location: LocationData,
        radius_m: int = 800,  # カジュアル向けに縮小
        max_results: int = 8,  # カジュアル向けに削減
        activity_types: Optional[List[str]] = None,
        time_of_day: Optional[str] = None,
        scene_type: Optional[str] = "friends",  # デフォルト友人
        casual_level: Optional[str] = "casual",
        max_price_per_person: Optional[int] = 3000,
        prefer_chain_stores: bool = True,
        exclude_high_end: bool = True,
        min_rating: Optional[float] = 3.5
    ) -> List[RestaurantInfo]:
        """
        カジュアル志向の友人向け店舗検索
        """
        print(f"🍻 Casual restaurant search starting...")
        print(f"   Location: ({location.latitude}, {location.longitude})")
        print(f"   Radius: {radius_m}m")
        print(f"   Casual level: {casual_level}")
        print(f"   Max price per person: ¥{max_price_per_person}")
        print(f"   Prefer chain stores: {prefer_chain_stores}")
        print(f"   Scene: {scene_type}")
        
        # APIキーがない場合は空のリストを返す
        if not self.api_key:
            print("❌ Google Places API key not available. Returning empty results.")
            return []
        
        # カジュアル志向の検索タイプを決定
        search_types = self.get_casual_search_types_for_scene(
            activity_types or ["food", "drink"],
            time_of_day,
            scene_type,
            casual_level,
            prefer_chain_stores
        )
        
        print(f"🏷️ Casual search types: {search_types}")
        
        all_restaurants = []
        
        # カジュアル優先の検索順序で実行
        priority_types = ["restaurant", "fast_food", "family_restaurant", "pub", "izakaya"]
        other_types = [t for t in search_types if t not in priority_types]
        ordered_types = priority_types + other_types
        
        # 段階的検索（少ない結果で効率的に）
        for i in range(0, len(ordered_types), 2):  # 2つずつ処理
            batch_types = ordered_types[i:i+2]
            if not batch_types:
                continue
                
            print(f"🔍 Casual search batch: {batch_types}")
            
            restaurants = self._search_with_types(
                location, radius_m, batch_types, min(max_results, 6)
            )
            
            # カジュアルフィルタリング即座適用
            filtered_restaurants = self._apply_casual_filters(
                restaurants,
                max_price_per_person,
                casual_level,
                exclude_high_end
            )
            
            all_restaurants.extend(filtered_restaurants)
            
            # 十分な結果が得られた場合は終了（効率化）
            if len(all_restaurants) >= max_results * 1.5:
                break
        
        # 重複除去
        unique_restaurants = []
        seen_place_ids = set()
        
        for restaurant in all_restaurants:
            if restaurant.place_id not in seen_place_ids:
                unique_restaurants.append(restaurant)
                seen_place_ids.add(restaurant.place_id)
        
        # 評価フィルタリング（カジュアル店用に緩和）
        if min_rating:
            unique_restaurants = [r for r in unique_restaurants if r.rating and r.rating >= min_rating]
        
        # カジュアルスコア計算とランキング
        for restaurant in unique_restaurants:
            restaurant.casual_score = self._calculate_casual_score(restaurant)
            
            # 基本スコア計算（簡略版）
            base_score = 0.0
            if restaurant.rating:
                base_score += restaurant.rating  # 最大5点
            
            if restaurant.user_ratings_total:
                review_score = min(restaurant.user_ratings_total / 1000, 2)
                base_score += review_score
            
            # カジュアルスコアと基本スコアの合成
            restaurant.composite_score = (base_score * 0.4 + restaurant.casual_score * 0.6)
        
        # スコア順でソート
        unique_restaurants.sort(key=lambda x: x.composite_score, reverse=True)
        
        print(f"🎯 Casual search completed: {len(unique_restaurants)} restaurants")
        return unique_restaurants[:max_results]