import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api';
import { MapPin, Info } from 'lucide-react';

const LIBRARIES = [];
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // Delhi fallback

export default function Step2Details({ issueData, onNext, onBack }) {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null); // will hold {lat, lng}
  const mapRef = useRef(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Get user location on mount so they don't drop a pin in the ocean
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
    setLocation({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  };

  const handleNext = () => {
    onNext({
      ...issueData,
      description,
      location,
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">Confirm Details</h2>
        <p className="text-slate-400 mt-2">Our AI analyzed your photo. Refine the location if needed.</p>
      </div>

      <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
        {/* AI Results Display */}
        <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <img src={issueData.imageUrl} alt="Issue" className="w-20 h-20 object-cover rounded-lg" />
          <div>
            <h3 className="font-semibold text-slate-100">{issueData.title || 'Reported Issue'}</h3>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-1 bg-[#00D4AA]/20 text-[#00D4AA] rounded-md capitalize">
                {issueData.category?.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2 py-1 rounded-md capitalize ${
                issueData.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                issueData.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {issueData.severity} Severity
              </span>
            </div>
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any extra details here..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00D4AA] transition-colors resize-none h-24"
          />
        </div>

        {/* Location Picker */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
            <MapPin size={16} /> 
            Pinpoint Location
          </label>
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
            <Info size={12} /> Drag the marker to the exact spot.
          </p>
          
          <div className="h-[250px] rounded-xl overflow-hidden bg-slate-800 relative">
            {!isLoaded || !location ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Loading map...
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
                  styles: [
                    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
                    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
                  ]
                }}
              >
                <MarkerF
                  position={location}
                  draggable={true}
                  onDragEnd={handleMarkerDragEnd}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#f87171',
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

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!location}
          className="flex-1 py-3 rounded-xl font-semibold text-slate-900 bg-[#00D4AA] hover:bg-[#00b38f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
