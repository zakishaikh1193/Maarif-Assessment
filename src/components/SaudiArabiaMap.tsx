import React, { useEffect, useState } from 'react';
import { School } from '../types';
import { MapPin } from 'lucide-react';
import api from '../services/api';

interface SchoolLocation {
  school: School;
  lat: number;
  lng: number;
  originalAddress: string;
}

interface SaudiArabiaMapProps {
  schools: School[];
}

const SaudiArabiaMap: React.FC<SaudiArabiaMapProps> = ({ schools }) => {
  const [schoolLocations, setSchoolLocations] = useState<SchoolLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Get approximate location based on address keywords
  const getApproximateLocation = (address: string): { lat: number; lng: number } | null => {
    if (!address || address.trim() === '') {
      return null;
    }

    const addressLower = address.toLowerCase();
    
    // Approximate coordinates for major Saudi cities
    const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
      'riyadh': { lat: 24.7136, lng: 46.6753 },
      'medina': { lat: 24.5247, lng: 39.5692 },
      'al-madinah': { lat: 24.5247, lng: 39.5692 },
      'madinah': { lat: 24.5247, lng: 39.5692 },
      'jeddah': { lat: 21.4858, lng: 39.1925 },
      'dammam': { lat: 26.4207, lng: 50.0888 },
      'khobar': { lat: 26.2041, lng: 50.1970 },
      'al-khobar': { lat: 26.2041, lng: 50.1970 },
      'makkah': { lat: 21.3891, lng: 39.8579 },
      'mecca': { lat: 21.3891, lng: 39.8579 },
      'taif': { lat: 21.2703, lng: 40.4158 },
      'abha': { lat: 18.2164, lng: 42.5042 },
      'tabuk': { lat: 28.3998, lng: 36.5700 },
      'hail': { lat: 27.5114, lng: 41.7208 },
      'buraidah': { lat: 26.3260, lng: 43.9750 },
      'khamis mushait': { lat: 18.3000, lng: 42.7333 },
      'najran': { lat: 17.4924, lng: 44.1277 },
      'jazan': { lat: 16.8894, lng: 42.5611 },
      'al-khalidiyah': { lat: 24.5247, lng: 39.5692 },
      'hiteen': { lat: 24.7136, lng: 46.6753 },
    };

    // Check for city matches
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (addressLower.includes(city)) {
        // Add small random offset to show multiple schools in same city
        const offset = (Math.random() - 0.5) * 0.15; // ~17km max offset
        return {
          lat: coords.lat + offset,
          lng: coords.lng + offset
        };
      }
    }

    // Default to Riyadh if no match found
    return { lat: 24.7136, lng: 46.6753 };
  };

  useEffect(() => {
    const loadSchoolLocations = async () => {
      setLoading(true);
      
      const locations: SchoolLocation[] = [];
      
      schools.forEach((school) => {
        if (school.address) {
          const coords = getApproximateLocation(school.address);
          if (coords) {
            locations.push({
              school,
              lat: coords.lat,
              lng: coords.lng,
              originalAddress: school.address
            });
          }
        }
      });

      setSchoolLocations(locations);
      setLoading(false);
    };

    if (schools.length > 0) {
      loadSchoolLocations();
    } else {
      setLoading(false);
    }
  }, [schools]);

  // Calculate map bounds for Saudi Arabia
  // Saudi Arabia approximate bounds: lat 16-32, lng 34-56
  const saudiBounds = {
    minLat: 16,
    maxLat: 32,
    minLng: 34,
    maxLng: 56,
    centerLat: 24,
    centerLng: 45
  };

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = (lat: number, lng: number, width: number, height: number) => {
    const latRange = saudiBounds.maxLat - saudiBounds.minLat;
    const lngRange = saudiBounds.maxLng - saudiBounds.minLng;
    
    const normalizedLat = (lat - saudiBounds.minLat) / latRange;
    const normalizedLng = (lng - saudiBounds.minLng) / lngRange;
    
    // Convert to pixel coordinates (invert Y for screen coordinates)
    const x = normalizedLng * width;
    const y = (1 - normalizedLat) * height;
    
    return { x, y };
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 h-96 flex items-center justify-center border-2 border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50/50 to-gray-50 rounded-xl h-96 overflow-hidden border-2 border-gray-200 shadow-inner">
      {/* Saudi Arabia Map Background */}
      <div className="absolute inset-0">
        {/* Map-like background with grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50/30 to-amber-50/20">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}></div>
          
          {/* Major city labels (simplified representation) */}
          <div className="absolute inset-0">
            {/* Riyadh */}
            <div className="absolute" style={{ left: '45%', top: '35%' }}>
              <div className="text-xs text-gray-400 font-medium">Riyadh</div>
            </div>
            {/* Jeddah */}
            <div className="absolute" style={{ left: '20%', top: '60%' }}>
              <div className="text-xs text-gray-400 font-medium">Jeddah</div>
            </div>
            {/* Dammam */}
            <div className="absolute" style={{ left: '75%', top: '25%' }}>
              <div className="text-xs text-gray-400 font-medium">Dammam</div>
            </div>
            {/* Medina */}
            <div className="absolute" style={{ left: '15%', top: '35%' }}>
              <div className="text-xs text-gray-400 font-medium">Medina</div>
            </div>
          </div>
        </div>
        
        {/* School markers */}
        {schoolLocations.map((location) => {
          const { x, y } = latLngToPixel(location.lat, location.lng, 100, 100);
          const percentageX = x;
          const percentageY = y;
          
          return (
            <div
              key={location.school.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
              style={{
                left: `${percentageX}%`,
                top: `${percentageY}%`,
              }}
              title={`${location.school.name}\n${location.originalAddress}`}
            >
              {/* Marker pin */}
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full border-3 border-white shadow-xl flex items-center justify-center transform group-hover:scale-125 transition-transform duration-300">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                {/* Outer glow */}
                <div className="absolute inset-0 w-8 h-8 bg-blue-400 rounded-full opacity-30 group-hover:opacity-50 group-hover:scale-150 transition-all duration-300"></div>
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-4 py-3 shadow-2xl whitespace-nowrap min-w-max">
                  <p className="font-bold text-sm mb-1">{location.school.name}</p>
                  {location.originalAddress && (
                    <p className="text-gray-300 text-xs">{location.originalAddress}</p>
                  )}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend/Info */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>{schoolLocations.length} {schoolLocations.length === 1 ? 'School' : 'Schools'} on map</span>
        </p>
      </div>
      
      {/* Map title */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg border border-gray-200">
        <p className="text-xs font-semibold text-gray-700">Saudi Arabia</p>
      </div>
    </div>
  );
};

export default SaudiArabiaMap;
