import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api';
import { MapPin, Info } from 'lucide-react';

const LIBRARIES = [];
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // Delhi fallback

// Civic Authority Clean-Realistic light map style
const MAP_STYLES = [
  { elementType: 'geometry',             stylers: [{ color: '#F5F5F5' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#F5F5F5' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#616161' }] },
  { featureType: 'landscape',            elementType: 'geometry',            stylers: [{ color: '#EEEEEE' }] },
  { featureType: 'water',                elementType: 'geometry',            stylers: [{ color: '#A2C4E0' }] },
  { featureType: 'water',                elementType: 'labels.text.fill',    stylers: [{ color: '#3A5B75' }] },
  { featureType: 'road',                 elementType: 'geometry',            stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road',                 elementType: 'geometry.stroke',     stylers: [{ color: '#E0E0E0' }] },
  { featureType: 'road.arterial',        elementType: 'geometry',            stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway',         elementType: 'geometry',            stylers: [{ color: '#FCD8A5' }] },
  { featureType: 'road.highway',         elementType: 'geometry.stroke',     stylers: [{ color: '#ECC48F' }] },
  { featureType: 'poi',                  stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park',             elementType: 'geometry',            stylers: [{ color: '#CBE5C8' }] },
  { featureType: 'transit',              stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',       elementType: 'geometry.stroke',     stylers: [{ color: '#BDBDBD' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#212121' }] },
];

export default function Step2Details({ issueData, onNext, onBack }) {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
        },
        (err) => {
          console.warn('Geolocation failed, using default', err);
          setLocation(DEFAULT_CENTER);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocation(DEFAULT_CENTER);
    }
  }, []);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleMarkerDragEnd = (e) => {
    setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  const handleNext = () => {
    onNext({ ...issueData, description, location });
  };

  // Severity label colors (light mode)
  const severityStyle = issueData.severity === 'high'
    ? { color: 'var(--color-signal-red)', backgroundColor: 'rgba(178,59,46,0.08)' }
    : issueData.severity === 'medium'
      ? { color: 'var(--color-signal-amber)', backgroundColor: 'rgba(198,125,45,0.08)' }
      : { color: 'var(--color-fog)', backgroundColor: 'var(--color-stone-paper)' };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="card-white p-4 sm:p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Confirm Details</h2>
          <p style={{ color: 'var(--color-fog)' }}>Our AI analyzed your photo. Refine the location if needed.</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* AI Results Display */}
          <div
            className="flex items-start gap-4 p-4"
            style={{ backgroundColor: 'var(--color-stone-paper)', borderRadius: '16px', border: '1px solid var(--color-stone-line)' }}
          >
            <img
              src={issueData.imageUrl}
              alt="Issue"
              className="w-20 h-20 object-cover shrink-0"
              style={{ borderRadius: 'var(--radius-image)', border: '1px solid var(--color-stone-line)' }}
            />
            <div>
              <h3 className="font-semibold">{issueData.title || 'Reported Issue'}</h3>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span
                  className="text-xs px-2 py-1 capitalize font-medium"
                  style={{ backgroundColor: 'rgba(62,122,84,0.1)', color: 'var(--color-signal-green)', borderRadius: 'var(--radius-badge)' }}
                >
                  {issueData.category?.replace('_', ' ')}
                </span>
                <span
                  className="text-xs px-2 py-1 capitalize font-medium"
                  style={{ ...severityStyle, borderRadius: 'var(--radius-badge)' }}
                >
                  {issueData.severity} Severity
                </span>
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span style={{ color: 'var(--color-fog)' }}>(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any extra details here..."
              className="w-full p-3 resize-none h-24 transition-colors outline-none"
              style={{
                backgroundColor: 'rgba(34,31,38,0.02)',
                border: '1px solid var(--color-stone-line)',
                borderRadius: '12px',
                color: 'var(--color-ink)',
                fontSize: 'var(--text-body-sm)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-plum)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-stone-line)'}
            />
          </div>

          {/* Location Picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1">
              <MapPin size={16} style={{ color: 'var(--color-plum)' }} />
              Pinpoint Location
            </label>
            <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--color-fog)' }}>
              <Info size={12} /> Drag the marker to the exact spot.
            </p>

            <div className="h-[250px] overflow-hidden relative" style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--color-stone-line)' }}>
              {!isLoaded || !location ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm" style={{ backgroundColor: 'var(--color-stone-paper)', color: 'var(--color-fog)' }}>
                  <div
                    className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--color-plum)', borderTopColor: 'transparent' }}
                  />
                  <span>Loading map…</span>
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={location}
                  zoom={16}
                  onLoad={onMapLoad}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    zoomControlOptions: { position: 9 }, // Symmetrical bottom-right positioning
                    clickableIcons: false,
                    styles: MAP_STYLES
                  }}
                >
                  <MarkerF
                    position={location}
                    draggable={true}
                    onDragEnd={handleMarkerDragEnd}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: '#4B2E46',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                      scale: 10,
                    }}
                  />
                </GoogleMap>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="btn-secondary flex-1"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!location}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
