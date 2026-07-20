import { useCallback, useRef, useState } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Locate } from 'lucide-react';
import { STATUS_COLORS_HEX } from '../lib/constants.js';

const LIBRARIES = []; // 'visualization' removed as heatmap is deprecated

// STATUS_COLORS removed — imported as STATUS_COLORS_HEX from lib/constants.js

// Civic Authority light map — stone/paper palette per DESIGN_IDEA_1
// Matches the page background so the map feels printed on the same paper
// Civic Authority Clean-Realistic light map style
// Uses realistic colors (natural blue water, fresh green parks, highway orange) 
// but is cleaned of POI and transit clutter. Distinct from the warm page background (#F1EEE9).
const MAP_STYLES = [
  { elementType: 'geometry',             stylers: [{ color: '#F5F5F5' }] }, // Clean light gray base
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#F5F5F5' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#616161' }] }, // Highly readable neutral labels
  { featureType: 'landscape',            elementType: 'geometry',            stylers: [{ color: '#EEEEEE' }] }, // Slightly darker land
  { featureType: 'water',                elementType: 'geometry',            stylers: [{ color: '#A2C4E0' }] }, // Realistic fresh blue water
  { featureType: 'water',                elementType: 'labels.text.fill',    stylers: [{ color: '#3A5B75' }] },
  { featureType: 'road',                 elementType: 'geometry',            stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road',                 elementType: 'geometry.stroke',     stylers: [{ color: '#E0E0E0' }] },
  { featureType: 'road.arterial',        elementType: 'geometry',            stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway',         elementType: 'geometry',            stylers: [{ color: '#FCD8A5' }] }, // Believable highway orange
  { featureType: 'road.highway',         elementType: 'geometry.stroke',     stylers: [{ color: '#ECC48F' }] },
  { featureType: 'poi',                  stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park',             elementType: 'geometry',            stylers: [{ color: '#CBE5C8' }] }, // Natural fresh park green
  { featureType: 'transit',              stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',       elementType: 'geometry.stroke',     stylers: [{ color: '#BDBDBD' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#212121' }] },
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

export function Map({ issues = [], onIssueClick, onCenterChange }) {
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
      <div
        className="flex items-center justify-center h-full rounded-xl text-sm p-6"
        style={{ backgroundColor: 'var(--color-stone-paper)', color: 'var(--color-signal-red)' }}
      >
        ⚠️ Map failed to load. Check your Google Maps API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center h-full rounded-xl"
        style={{ backgroundColor: 'var(--color-stone-paper)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-plum)', borderTopColor: 'transparent' }}
          />
          <span style={{ color: 'var(--color-fog)', fontSize: '14px' }}>Loading map…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
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
          gestureHandling: 'cooperative',
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
                fillOpacity: 1,
                strokeColor: '#FFFFFF',  // Stone White ring — status color never ambiguous with selection
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
            <div
              style={{
                backgroundColor: 'var(--color-stone-white)',
                color: 'var(--color-ink)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-report-card)',
                padding: '14px 16px',
                minWidth: '200px',
                maxWidth: '260px',
                fontFamily: 'var(--font-body)',
              }}
            >
              {/* Issue header */}
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl">{CATEGORY_EMOJI[selectedIssue.category] ?? '📍'}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', lineHeight: '1.3', color: 'var(--color-ink)' }}>
                    {selectedIssue.title}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px', textTransform: 'capitalize' }}>
                    {selectedIssue.category?.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Status + upvotes row */}
              <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                <span
                  className="badge-status"
                  style={{
                    backgroundColor: STATUS_COLORS_HEX[selectedIssue.status] ?? 'var(--color-fog)',
                    color: selectedIssue.status === 'in_progress' ? 'var(--color-ink)' : '#ffffff',
                    fontSize: '10px',
                    padding: '2px 6px',
                  }}
                >
                  {selectedIssue.status?.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-fog)' }}>👍 {selectedIssue.upvotes ?? 0}</span>
              </div>

              {/* Case ID chip */}
              <div className="case-id-chip" style={{ marginBottom: onIssueClick ? '10px' : '0' }}>
                CP-{selectedIssue.id?.slice(0, 6).toUpperCase()}
              </div>

              {onIssueClick && (
                <button
                  onClick={() => { onIssueClick(selectedIssue); setSelectedIssue(null); }}
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 12px', marginTop: '4px' }}
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
        className="absolute bottom-4 right-4 flex items-center gap-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-plum)] focus-visible:ring-offset-2"
        style={{
          backgroundColor: 'var(--color-stone-white)',
          color: 'var(--color-plum)',
          border: '1px solid var(--color-stone-line)',
          borderRadius: 'var(--radius-control)',
          boxShadow: 'var(--shadow-card)',
          padding: '10px 16px', // 44px touch target height equivalent
          fontSize: '13px',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-plum)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-stone-line)'; }}
      >
        <Locate size={14} />
        My Location
      </button>
    </div>
  );
}
