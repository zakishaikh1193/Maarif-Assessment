import React, { useState, useMemo } from 'react';
import { School } from '../types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import mapImage from '../images/map-patch2.png';
import bluePinIcon from '../images/blue.png';

interface SaudiArabiaMapProps {
  schools: School[];
}

const cityCoordinates: { [key: string]: { x: number; y: number } } = {
  'Riyadh': { x: 50, y: 45 },
  'Jeddah': { x: 25, y: 35 },
  'Medina': { x: 30, y: 40 },
  'Dammam': { x: 55, y: 50 },
  'Mecca': { x: 28, y: 38 },
  'Taif': { x: 32, y: 38 },
  'Abha': { x: 35, y: 20 },
  'Tabuk': { x: 20, y: 55 },
  'Buraydah': { x: 45, y: 48 },
  'Khobar': { x: 58, y: 52 },
  'Hail': { x: 42, y: 52 },
  'Jazan': { x: 30, y: 15 },
  'Najran': { x: 40, y: 18 },
  'Khamis Mushait': { x: 33, y: 22 },
  'Al-Madinah': { x: 30, y: 40 },
  'Al-Madinah Al-Munawarah': { x: 30, y: 40 },
};

const extractCityFromAddress = (address: string): string | null => {
  if (!address) return null;
  const addressLower = address.toLowerCase();
  for (const city of Object.keys(cityCoordinates)) {
    if (addressLower.includes(city.toLowerCase())) {
      return city;
    }
  }
  if (addressLower.includes('riyadh')) return 'Riyadh';
  if (addressLower.includes('jeddah')) return 'Jeddah';
  if (addressLower.includes('medina') || addressLower.includes('madinah')) return 'Medina';
  if (addressLower.includes('dammam')) return 'Dammam';
  if (addressLower.includes('mecca') || addressLower.includes('makkah')) return 'Mecca';
  return null;
};

const getSchoolCoordinates = (school: School): { x: number; y: number } => {
  const city = extractCityFromAddress(school.address || '');
  if (city && cityCoordinates[city]) {
    const base = cityCoordinates[city];
    const offsetX = ((school.id || 0) % 5) * 0.8 - 1.6;
    const offsetY = (((school.id || 0) * 3) % 5) * 0.8 - 1.6;
    return { x: base.x + offsetX, y: base.y + offsetY };
  }
  return { x: 50, y: 45 };
};

const getSchoolTypeFilter = (schoolType?: string): string => {
  switch (schoolType) {
    case 'National & International': 
      // Blue - match bg-blue-600 (#2563eb) / bg-blue-500 (#3b82f6)
      return 'brightness(0.95) saturate(1.3) hue-rotate(-5deg)';
    case 'National': 
      // Green - match bg-green-600 (#16a34a) / bg-green-500 (#22c55e) - vibrant green
      return 'brightness(1.15) saturate(1.6) hue-rotate(130deg)';
    case 'International': 
      // Purple - match bg-purple-600 (#9333ea) / bg-purple-500 (#a855f7) - vibrant purple
      return 'brightness(1.1) saturate(1.7) hue-rotate(255deg)';
    default: 
      return 'brightness(0.8) saturate(0.5)';
  }
};

const SaudiArabiaMap: React.FC<SaudiArabiaMapProps> = ({ schools }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [zoom, setZoom] = useState(0.8);

  const filteredSchools = useMemo(() => {
    if (selectedFilter === 'All') return schools;
    return schools.filter(school => school.school_type === selectedFilter);
  }, [schools, selectedFilter]);

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

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 rounded-xl overflow-hidden">

      <div className="absolute left-4 top-4 bottom-4 z-10">
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

      <div className="absolute inset-0 flex items-center justify-center pl-[260px] pr-4">
        <div className="relative" style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s ease' }}>
          {/* Map Image */}
          <div className="relative flex items-center justify-center w-full h-full">
            <img 
              src={mapImage} 
              alt="Saudi Arabia Map" 
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{ 
                filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.4))'
              }}
            />
            
            {/* School Location Pins Overlay */}
            <svg 
              className="absolute top-0 left-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              style={{ 
                width: '100%',
                height: '100%'
              }}
            >
              {filteredSchools.map((school, index) => {
                const coords = getSchoolCoordinates(school);
                const colorFilter = getSchoolTypeFilter(school.school_type);
                return (
                  <g key={school.id || index} className="school-pin group" style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
                    {/* Pin Icon Image - Using blue.png with color filter based on school type - Much larger size */}
                    <image
                      href={bluePinIcon}
                      x={coords.x - 10}
                      y={coords.y - 18}
                      width="20"
                      height="25"
                      className="hover:opacity-90 transition-opacity"
                      style={{ 
                        filter: `${colorFilter} drop-shadow(0 4px 8px rgba(0,0,0,0.5))`,
                        pointerEvents: 'auto',
                        cursor: 'pointer'
                      }}
                    />
                    
                    {/* Hover Tooltip - School name and address, complete text */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" transform={`translate(0, -12)`}>
                      {/* School Name - Complete name, no truncation */}
                      <text
                        x={coords.x}
                        y={coords.y - 20}
                        textAnchor="middle"
                        fontSize="4.2"
                        fill="#000000"
                        fontWeight="900"
                        style={{ 
                          textShadow: '0 2px 8px rgba(255,255,255,1), 0 0 12px rgba(255,255,255,1), 0 1px 4px rgba(255,255,255,0.9)',
                          filter: 'drop-shadow(0 3px 6px rgba(255,255,255,0.9))'
                        }}
                      >
                        {school.name}
                      </text>
                      {/* Address - Complete address, positioned directly below school name with minimal gap */}
                      {school.address && (
                        <text
                          x={coords.x}
                          y={coords.y - 14}
                          textAnchor="middle"
                          fontSize="2.2"
                          fill="#4b5563"
                          fontWeight="700"
                          style={{ 
                            textShadow: '0 1px 4px rgba(255,255,255,1), 0 0 8px rgba(255,255,255,0.8)',
                            filter: 'drop-shadow(0 2px 3px rgba(255,255,255,0.7))'
                          }}
                        >
                          {school.address}
                        </text>
                      )}
                    </g>
                    
                    {/* School Name Tooltip (for accessibility) */}
                    <title>{school.name} - {school.address || 'No address'} - {school.school_type || 'Unknown type'}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors" title="Zoom In">
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors" title="Zoom Out">
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button onClick={() => setZoom(1)} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors" title="Reset View">
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

    </div>
  );
};

export default SaudiArabiaMap;
