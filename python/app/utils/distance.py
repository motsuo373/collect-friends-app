from geopy.distance import geodesic


def geodesic_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """
    2点間の測地線距離をメートル単位で計算
    
    Args:
        lat1: 地点1の緯度
        lon1: 地点1の経度
        lat2: 地点2の緯度
        lon2: 地点2の経度
    
    Returns:
        int: 距離（メートル）
    """
    point1 = (lat1, lon1)
    point2 = (lat2, lon2)
    
    # geodesicで計算（WGS-84測地系）
    distance = geodesic(point1, point2).meters
    
    # 整数値に丸めて返す
    return int(round(distance))


def calculate_travel_time_min(distance_m: int, transport_mode: str = "train") -> int:
    """
    距離から移動時間を推定
    
    Args:
        distance_m: 距離（メートル）
        transport_mode: 移動手段（"train", "walking", "car"）
    
    Returns:
        int: 推定移動時間（分）
    """
    # 簡易的な計算（実際はGoogle Maps APIなどで正確な時間を取得することを推奨）
    if transport_mode == "train":
        # 電車: 平均時速30km + 乗り換え時間
        speed_kmh = 30
        base_time = (distance_m / 1000) / speed_kmh * 60
        transfer_time = 5  # 乗り換え時間を5分と仮定
        return int(round(base_time + transfer_time))
    
    elif transport_mode == "walking":
        # 徒歩: 時速4km
        speed_kmh = 4
        return int(round((distance_m / 1000) / speed_kmh * 60))
    
    elif transport_mode == "car":
        # 車: 平均時速20km（都市部）
        speed_kmh = 20
        return int(round((distance_m / 1000) / speed_kmh * 60))
    
    else:
        # デフォルトは電車
        return calculate_travel_time_min(distance_m, "train")


def normalize_coordinates(lat: float, lon: float) -> tuple[float, float]:
    """
    緯度経度を小数点以下6桁に正規化
    
    Args:
        lat: 緯度
        lon: 経度
    
    Returns:
        tuple[float, float]: 正規化された緯度、経度
    
    Raises:
        ValueError: 緯度・経度が有効範囲外の場合
    """
    # 範囲チェック
    if not -90 <= lat <= 90:
        raise ValueError(f"緯度は-90から90の範囲である必要があります: {lat}")
    
    if not -180 <= lon <= 180:
        raise ValueError(f"経度は-180から180の範囲である必要があります: {lon}")
    
    # 小数点以下6桁に丸める
    normalized_lat = round(lat, 6)
    normalized_lon = round(lon, 6)
    
    return normalized_lat, normalized_lon