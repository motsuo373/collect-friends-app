import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leafletのデフォルトアイコンの修正（React環境での問題解決）
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface NearbyUser {
  uid: string;
  name: string;
  distance: number;
  status: {
    isAvailable: boolean;
    activities: string[];
    moveRange: number;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: 'exact' | 'approximate' | 'area';
  };
  shareLevel: 'detailed' | 'approximate' | 'hidden';
}

interface WebMapProps {
  userLocation: UserLocation | null;
  userStatus: {
    isAvailable: boolean;
    activities: string[];
    moveRange: number;
  };
  nearbyUsers?: NearbyUser[];
  onStatusPress: () => void;
  onUserPress?: (user: NearbyUser) => void;
}

export interface WebMapRef {
  moveToLocation: (location: UserLocation) => void;
}

// マップの中心を移動するためのコンポーネント
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  
  return null;
}

const WebMap = forwardRef<WebMapRef, WebMapProps>(({ 
  userLocation, 
  userStatus, 
  nearbyUsers = [],
  onStatusPress, 
  onUserPress 
}, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const [mapCenter, setMapCenter] = React.useState<[number, number] | null>(null);

  useImperativeHandle(ref, () => ({
    moveToLocation: (location: UserLocation) => {
      setMapCenter([location.latitude, location.longitude]);
    }
  }));

  useEffect(() => {
    // CSS for the map container
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        height: 100%;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        z-index: 1;
      }
      .custom-marker {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        font-size: 20px;
        color: white;
        cursor: pointer;
      }
      .nearby-user-marker {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-size: 16px;
        color: white;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.latitude, userLocation.longitude]
    : [35.6762, 139.6503]; // 東京駅

  // カスタムマーカーアイコンの作成
  const createCustomIcon = (color: string, isUser = false) => {
    const className = isUser ? 'custom-marker' : 'nearby-user-marker';
    const size = isUser ? 40 : 36;
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="${className}" style="background-color: ${color};">
          ${isUser ? '👤' : '👥'}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getStatusText = () => {
    if (!userStatus.isAvailable) return '忙しい';
    
    const activityText = userStatus.activities.length > 0 
      ? userStatus.activities.join('・') 
      : 'なんでも';
    
    return `${activityText}`;
  };

  const getUserStatusText = (user: NearbyUser) => {
    if (!user.status.isAvailable) return '忙しい';
    
    const activityText = user.status.activities.length > 0 
      ? user.status.activities.join('・') 
      : 'なんでも';
    
    return `${activityText}`;
  };

  const getDistanceText = (distance: number) => {
    if (distance < 1000) return `${distance}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const markerColor = userStatus.isAvailable ? '#4CAF50' : '#FF9800';

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* マップ中心移動コントローラー */}
        <MapController center={mapCenter} />
        
        {userLocation && (
          <>
            {/* ユーザーのマーカー */}
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createCustomIcon(markerColor, true)}
              eventHandlers={{
                click: onStatusPress,
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>あなたの現在地</h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{getStatusText()}</p>
                  <button
                    onClick={onStatusPress}
                    style={{
                      background: '#007AFF',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ステータス変更
                  </button>
                </div>
              </Popup>
            </Marker>

            {/* 移動範囲の円 */}
            {userStatus.isAvailable && (
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={userStatus.moveRange}
                pathOptions={{
                  fillColor: 'rgba(0, 122, 255, 0.1)',
                  color: 'rgba(0, 122, 255, 0.3)',
                  weight: 2,
                }}
              />
            )}
          </>
        )}

        {/* 近くのユーザーのマーカー */}
        {nearbyUsers.map((user) => {
          const userMarkerColor = user.status.isAvailable ? '#4CAF50' : '#FF9800';
          
          return (
            <Marker
              key={user.uid}
              position={[user.location.latitude, user.location.longitude]}
              icon={createCustomIcon(userMarkerColor, false)}
              eventHandlers={{
                click: () => onUserPress?.(user),
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '180px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{user.name}</h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                    {getUserStatusText(user)}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                    距離: {getDistanceText(user.distance)}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                    位置精度: {user.location.accuracy === 'exact' ? '詳細' : 
                              user.location.accuracy === 'approximate' ? '大雑把' : 'エリア'}
                  </p>
                  {onUserPress && (
                    <button
                      onClick={() => onUserPress(user)}
                      style={{
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      話しかける
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
});

WebMap.displayName = 'WebMap';

export default WebMap; 