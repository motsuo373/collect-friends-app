import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { renderToString } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icons } from '@/utils/iconHelper';

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
    // CSS for Google Maps style
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        height: 100%;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        z-index: 1;
        background-color: #e5e3df;
      }
      
      /* Hide zoom controls */
      .leaflet-control-zoom {
        display: none !important;
      }
      
      /* Style attribution to match Google Maps */
      .leaflet-control-attribution {
        background: rgba(255, 255, 255, 0.7);
        margin: 0;
        font-size: 10px;
        line-height: 14px;
        color: rgba(0, 0, 0, 0.7);
      }
      
      /* Style popup to match Google Maps */
      .leaflet-popup-content-wrapper {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        border: none;
      }
      
      .leaflet-popup-tip {
        background: white;
        border: none;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }
      
      .custom-marker {
        background: white;
        border-radius: 50%;
        border: 3px solid;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      
      .user-marker {
        width: 44px;
        height: 44px;
        border-color: #FF8700;
      }
      
      .friend-marker {
        width: 36px;
        height: 36px;
        border-color: #FFB366;
      }
      
      .custom-marker svg {
        width: 20px;
        height: 20px;
      }
      
      .user-marker svg {
        width: 24px;
        height: 24px;
        color: #FF8700;
      }
      
      .friend-marker svg {
        color: #FFB366;
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

  // iconHelperから適切なアイコンを使用したカスタムマーカーアイコンの作成
  const createCustomIcon = (isUser = false, isAvailable = true) => {
    const className = isUser ? 'user-marker' : 'friend-marker';
    const size = isUser ? 44 : 36;
    const iconSize = isUser ? 24 : 16;
    
    // ユーザーのマーカーはメインオレンジ、友達は薄いオレンジ
    const iconColor = isUser 
      ? '#FF8700' 
      : isAvailable ? '#FFB366' : '#FFCC99'; // 暇な友達は少し濃い薄オレンジ、忙しい友達はもっと薄いオレンジ
    
    // iconHelperから適切なアイコンコンポーネントを選択
    const IconComponent = isUser ? Icons.MapPin : Icons.User;
    
    // アイコンコンポーネントをHTML文字列に変換
    const iconSvg = renderToString(React.createElement(IconComponent, {
      size: iconSize,
      color: iconColor,
      strokeWidth: 2
    }));
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="custom-marker ${className}">
          ${iconSvg}
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

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
        zoomControl={false} // ズームコントロールを無効化
        attributionControl={true}
      >
        {/* Google Maps風のタイルレイヤー */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          className="google-style-tiles"
          subdomains="abcd"
          maxZoom={20}
        />
        
        {/* マップ中心移動コントローラー */}
        <MapController center={mapCenter} />
        
        {userLocation && (
          <>
            {/* ユーザーのマーカー */}
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createCustomIcon(true)}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '150px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>あなたの現在地</h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>{getStatusText()}</p>
                  <button
                    onClick={onStatusPress}
                    style={{
                      background: '#FF8700',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      boxShadow: '0 2px 4px rgba(255, 135, 0, 0.3)',
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
                  fillColor: 'rgba(66, 133, 244, 0.1)',
                  color: 'rgba(66, 133, 244, 0.3)',
                  weight: 2,
                }}
              />
            )}
          </>
        )}

        {/* 友達のマーカー */}
        {nearbyUsers.map((user) => {
          return (
            <Marker
              key={user.uid}
              position={[user.location.latitude, user.location.longitude]}
              icon={createCustomIcon(false, user.status.isAvailable)}
              eventHandlers={{
                click: () => onUserPress?.(user),
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '180px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>{user.name}</h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#5f6368' }}>
                    {getUserStatusText(user)}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#80868b' }}>
                    距離: {getDistanceText(user.distance)}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#80868b' }}>
                    位置精度: {user.location.accuracy === 'exact' ? '詳細' : 
                              user.location.accuracy === 'approximate' ? '大雑把' : 'エリア'}
                  </p>
                  {onUserPress && (
                    <button
                      onClick={() => onUserPress(user)}
                      style={{
                        background: '#FFB366',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(255, 179, 102, 0.3)',
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