import React, { useState, useMemo, useEffect, useRef } from 'react';
import { School } from '../types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { schoolsAPI } from '../services/api';
import bluePinIcon from '../images/blue.png';

interface SaudiArabiaMapProps {
  schools: School[];
}

// Custom icon creator function
const createCustomIcon = (iconUrl: string, schoolType?: string) => {
  // Determine color based on school type
  let colorFilter = '';
  switch (schoolType) {
    case 'National & International':
      // Blue
      colorFilter = 'brightness(0.95) saturate(1.3) hue-rotate(-5deg)';
      break;
    case 'National':
      // Green
      colorFilter = 'brightness(1.15) saturate(1.6) hue-rotate(130deg)';
      break;
    case 'International':
      // Purple
      colorFilter = 'brightness(1.1) saturate(1.7) hue-rotate(255deg)';
      break;
    default:
      colorFilter = 'brightness(0.8) saturate(0.5)';
  }

  // Create a custom icon using the blue pin image with color filter
  const iconHtml = `
    <div style="
      width: 40px;
      height: 50px;
      background-image: url(${iconUrl});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      filter: ${colorFilter};
      transform: translate(-50%, -100%);
    "></div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-school-icon',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50]
  });
};

// Component to handle map view changes
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Default center of Saudi Arabia (Riyadh)
const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 6;

// Saudi Arabia geographic bounds
// North: ~32.0°N, South: ~16.0°N, East: ~55.0°E, West: ~34.0°E
const SAUDI_BOUNDS: [[number, number], [number, number]] = [
  [16.0, 34.0], // Southwest corner (South, West)
  [32.0, 55.0]  // Northeast corner (North, East)
];

interface SchoolWithCoordinates extends School {
  latitude?: number;
  longitude?: number;
  city?: string | null;
}

const SaudiArabiaMap: React.FC<SaudiArabiaMapProps> = ({ schools }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [schoolsWithCoords, setSchoolsWithCoords] = useState<SchoolWithCoordinates[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const geocodeCache = useRef<Map<string, { latitude: number; longitude: number }>>(new Map());

  const filteredSchools = useMemo(() => {
    if (selectedFilter === 'All') return schoolsWithCoords;
    return schoolsWithCoords.filter(school => school.school_type === selectedFilter);
  }, [schoolsWithCoords, selectedFilter]);

  const schoolTypeCounts = useMemo(() => ({
    'All': schools.length,
    'National & International': schools.filter(s => s.school_type === 'National & International').length,
    'National': schools.filter(s => s.school_type === 'National').length,
    'International': schools.filter(s => s.school_type === 'International').length,
  }), [schools]);

  const filterOptions = [
    { label: 'All', value: 'All' },
    { label: 'National & International', value: 'National & International' },
    { label: 'National', value: 'National' },
    { label: 'International', value: 'International' },
  ];

  // Extract city from address
  const extractCity = (address?: string): string | null => {
    if (!address) return null;
    const addressLower = address.toLowerCase();
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'makkah', 'medina', 'madinah', 
                    'taif', 'khobar', 'abha', 'tabuk', 'buraydah', 'hail', 'jazan', 'najran'];
    for (const city of cities) {
      if (addressLower.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }
    return null;
  };

  // City coordinates fallback
  const cityCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
    'Riyadh': { latitude: 24.7136, longitude: 46.6753 },
    'Jeddah': { latitude: 21.4858, longitude: 39.1925 },
    'Dammam': { latitude: 26.4207, longitude: 50.0888 },
    'Mecca': { latitude: 21.3891, longitude: 39.8579 },
    'Makkah': { latitude: 21.3891, longitude: 39.8579 },
    'Medina': { latitude: 24.5247, longitude: 39.5692 },
    'Madinah': { latitude: 24.5247, longitude: 39.5692 },
    'Taif': { latitude: 21.2703, longitude: 40.4158 },
    'Khobar': { latitude: 26.2794, longitude: 50.2080 },
    'Abha': { latitude: 18.2164, longitude: 42.5042 },
    'Tabuk': { latitude: 28.3998, longitude: 36.5700 },
    'Buraydah': { latitude: 26.3260, longitude: 43.9750 },
    'Hail': { latitude: 27.5114, longitude: 41.7208 },
    'Jazan': { latitude: 16.8894, longitude: 42.5706 },
    'Najran': { latitude: 17.4924, longitude: 44.1277 }
  };

  // Geocode schools
  useEffect(() => {
    const geocodeSchools = async () => {
      setLoading(true);
      const schoolsWithCoordinates: SchoolWithCoordinates[] = [];

      for (const school of schools) {
        try {
          // Check cache first
          const cacheKey = school.address || school.name;
          if (geocodeCache.current.has(cacheKey)) {
            const coords = geocodeCache.current.get(cacheKey)!;
            schoolsWithCoordinates.push({
              ...school,
              latitude: coords.latitude,
              longitude: coords.longitude,
              city: extractCity(school.address)
            });
            continue;
          }

          // Try to geocode using API
          if (school.address) {
            try {
              const response = await schoolsAPI.geocodeAddress(school.address);
              if (response.success && response.coordinates) {
                const coords = response.coordinates;
                geocodeCache.current.set(cacheKey, coords);
                schoolsWithCoordinates.push({
                  ...school,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  city: extractCity(school.address)
                });
                continue;
              }
            } catch (error) {
              console.warn(`Failed to geocode ${school.name}:`, error);
            }
          }

          // Fallback to city-based coordinates
          const city = extractCity(school.address);
          if (city && cityCoordinates[city]) {
            const coords = cityCoordinates[city];
            schoolsWithCoordinates.push({
              ...school,
              latitude: coords.latitude,
              longitude: coords.longitude,
              city: city
            });
          } else {
            // Default to Riyadh if no city found
            schoolsWithCoordinates.push({
              ...school,
              latitude: DEFAULT_CENTER[0],
              longitude: DEFAULT_CENTER[1],
              city: 'Riyadh'
            });
          }
        } catch (error) {
          console.error(`Error processing school ${school.name}:`, error);
          // Add with default coordinates
          schoolsWithCoordinates.push({
            ...school,
            latitude: DEFAULT_CENTER[0],
            longitude: DEFAULT_CENTER[1],
            city: 'Riyadh'
          });
        }
      }

      setSchoolsWithCoords(schoolsWithCoordinates);
      setLoading(false);
    };

    if (schools.length > 0) {
      geocodeSchools();
    } else {
      setLoading(false);
    }
  }, [schools]);

  const getFilterButtonStyle = (value: string) => {
    const isActive = selectedFilter === value;
    const baseStyle = "w-full px-4 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg";
    
    if (value === 'All') {
      return `${baseStyle} ${isActive ? 'bg-gray-700' : 'bg-gray-600'}`;
    } else if (value === 'National & International') {
      return `${baseStyle} ${isActive ? 'bg-blue-600' : 'bg-blue-500'}`;
    } else if (value === 'National') {
      return `${baseStyle} ${isActive ? 'bg-purple-600' : 'bg-purple-500'}`;
    } else if (value === 'International') {
      return `${baseStyle} ${isActive ? 'bg-green-600' : 'bg-green-500'}`;
    }
    return baseStyle;
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 3));
  };

  const handleResetView = () => {
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(DEFAULT_ZOOM);
  };

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 rounded-xl overflow-hidden">
      {/* Filter Buttons */}
      <div className="absolute left-4 top-4 bottom-4 z-[1000]">
        <div className="h-full flex flex-col gap-3 min-w-[240px] justify-between">
          <div className="flex flex-col gap-3">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={getFilterButtonStyle(option.value)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{option.label}</span>
                  {selectedFilter === option.value && (
                    <span className="text-xs bg-gray-500/80 text-white px-2.5 py-1 rounded-md font-bold">
                      {schoolTypeCounts[option.value as keyof typeof schoolTypeCounts] || 0}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* School Count Footer */}
          <div className="mt-auto pt-4 border-t border-gray-300/50">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{filteredSchools.length} {filteredSchools.length === 1 ? 'School' : 'Schools'} on map</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 flex items-center justify-center pl-[260px] pr-4">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="w-full h-full rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              scrollWheelZoom={true}
              maxBounds={SAUDI_BOUNDS}
              maxBoundsViscosity={1.0}
              minZoom={5}
              maxZoom={12}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} zoom={mapZoom} />
              
              {/* School Markers */}
              {filteredSchools
                .filter(school => school.latitude && school.longitude)
                .map((school) => (
                  <Marker
                    key={school.id}
                    position={[school.latitude!, school.longitude!]}
                    icon={createCustomIcon(bluePinIcon, school.school_type)}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-gray-900 text-base mb-1">{school.name}</h3>
                        {school.address && (
                          <p className="text-sm text-gray-700 mb-1">{school.address}</p>
                        )}
                        {school.city && (
                          <p className="text-xs text-gray-600">{school.city}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={handleZoomIn} 
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors" 
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button 
          onClick={handleZoomOut} 
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors" 
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button 
          onClick={handleResetView} 
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors" 
          title="Reset View"
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export default SaudiArabiaMap;
