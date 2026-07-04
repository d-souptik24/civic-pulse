import { useCallback, useRef, useState } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Locate } from 'lucide-react';
import { STATUS_COLORS_HEX } from '../lib/constants.js';

const LIBRARIES = []; // 'visualization' removed as heatmap is deprecated

// STATUS_COLORS removed — imported as STATUS_COLORS_HEX from lib/constants.js

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
];

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // Delhi
const DEFAULT_ZOOM = 13;

const CATEGORY_EMOJI = {
  pothole:      '🕳️',
  streetlight:  '💡',
  water:        '💧',
  garbage:      '🗑️',
  road_damage:  '🚧',
  sewage:       '🚨',
  encroachment: '🏗️',
  other:        '📍',
};

export default function Map({ issues = [], onIssueClick, onCenterChange }) {
  const [selectedIssue, setSelectedIssue]   = useState(null);
  const [userLocation,  setUserLocation]    = useState(null);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onCenterChanged = useCallback(() => {
    if (!mapRef.current) return;
    const c = mapRef.current.getCenter();
    if (c && onCenterChange) {
      onCenterChange({ lat: c.lat(), lng: c.lng() });
    }
  }, [onCenterChange]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(17);
      },
      (err) => console.warn('Geolocation denied:', err.message)
    );
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 rounded-2xl text-red-400 text-sm p-6">
        ⚠️ Map failed to load. Check your Google Maps API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading map…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        onCenterChanged={onCenterChanged}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: 9 },
          clickableIcons: false,
        }}
        onClick={() => setSelectedIssue(null)}
      >
        {/* Issue markers */}
        {issues.map((issue) => {
          if (!issue.location?.lat || !issue.location?.lng) return null;
          const color = STATUS_COLORS_HEX[issue.status] ?? STATUS_COLORS_HEX.open;
          return (
            <MarkerF
              key={issue.id}
              position={{ lat: issue.location.lat, lng: issue.location.lng }}
              title={issue.title}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 0.9,
                strokeColor: '#0f172a',
                strokeWeight: 2,
                scale: (issue.upvotes ?? 0) >= 5 ? 12 : 9,
              }}
              onClick={() => setSelectedIssue(issue)}
            />
          );
        })}



        {/* User "You are here" blue dot */}
        {userLocation && (
          <MarkerF
            position={userLocation}
            title="You are here"
            zIndex={1000}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 10,
            }}
          />
        )}

        {/* Info window on marker click */}
        {selectedIssue && (
          <InfoWindowF
            position={{ lat: selectedIssue.location.lat, lng: selectedIssue.location.lng }}
            onCloseClick={() => setSelectedIssue(null)}
          >
            <div className="bg-slate-800 text-slate-100 rounded-xl p-3 min-w-[200px] max-w-[260px]">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl">{CATEGORY_EMOJI[selectedIssue.category] ?? '📍'}</span>
                <div>
                  <p className="font-semibold text-sm leading-tight">{selectedIssue.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {selectedIssue.category?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: `${STATUS_COLORS_HEX[selectedIssue.status] ?? '#94a3b8'}22`,
                    color: STATUS_COLORS_HEX[selectedIssue.status] ?? '#94a3b8',
                  }}
                >
                  {selectedIssue.status?.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400">👍 {selectedIssue.upvotes ?? 0}</span>
              </div>
              {onIssueClick && (
                <button
                  onClick={() => { onIssueClick(selectedIssue); setSelectedIssue(null); }}
                  className="mt-2 w-full text-xs bg-[#00D4AA]/15 text-[#00D4AA] hover:bg-[#00D4AA]/25 py-1 rounded-lg transition-colors"
                >
                  View details →
                </button>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* My Location button */}
      <button
        id="btn-use-my-location"
        onClick={handleUseMyLocation}
        className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 glass-card text-sm font-medium text-[#00D4AA] hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <Locate size={14} />
        My Location
      </button>
    </div>
  );
}
