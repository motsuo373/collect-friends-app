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

interface WebMapProps {
  userLocation: UserLocation | null;
  userStatus: {
    isAvailable: boolean;
    activities: string[];
    moveRange: number;
  };
  onStatusPress: () => void;
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

const WebMap = forwardRef<WebMapRef, WebMapProps>(({ userLocation, userStatus, onStatusPress }, ref) => {
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
  const createCustomIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="custom-marker" style="background-color: ${color};">
          👤
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const getStatusText = () => {
    if (!userStatus.isAvailable) return '忙しい';
    
    const activityText = userStatus.activities.length > 0 
      ? userStatus.activities.join('・') 
      : 'なんでも';
    
    return `${activityText}`;
  };

  const markerColor = userStatus.isAvailable ? '#4CAF50' : '#FF9800';

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
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
              icon={createCustomIcon(markerColor)}
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
      </MapContainer>
    </div>
  );
});

WebMap.displayName = 'WebMap';

export default WebMap; 