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
  // Special case: Saudi International School - place at far southeast region (opposite side)
  if (school.name && school.name.toLowerCase().includes('saudi international school')) {
    return { x: 72, y: 33 }; // Far southeast region (opposite from northwest)
  }
  
  // Special case: Manarat Al-Madinah - place on left side (western coast)
  if (school.name && (school.name.toLowerCase().includes('manarat al-madinah') || school.name.toLowerCase().includes('manarat almadinah'))) {
    return { x: 4, y: 45 }; // Left side (western coast), middle of coastline
  }
  
  // Special case: Manarat Al-Dammam - place at red mark location (eastern coast, above Saudi International School)
  if (school.name && (school.name.toLowerCase().includes('manarat al-dammam') || school.name.toLowerCase().includes('manarat aldammam'))) {
    return { x: 61, y: 21}; // Eastern coast, above Saudi International School (red mark location)
  }
  
  // Special case: Noor Al-Islam National - place exactly to the right of Saudi International School
  if (school.name && (school.name.toLowerCase().includes('noor al-islam') || school.name.toLowerCase().includes('noor alislam'))) {
    return { x: 78, y: 33 }; // Right side of Saudi International School (eastern coast)
  }
  
  // Special case: Ajyal International - place exactly above Saudi International School
  if (school.name && (school.name.toLowerCase().includes('ajyal international') || school.name.toLowerCase().includes('ajyal'))) {
    return { x: 72, y: 26 }; // Exactly above Saudi International School (same x, lower y)
  }
  
  // Special case: Manarat Al-Khobar - place to the right side of the map
  if (school.name && (school.name.toLowerCase().includes('manarat al-khobar') || school.name.toLowerCase().includes('manarat alkhobar') || school.name.toLowerCase().includes('manarat khobar'))) {
    return { x: 84, y: 37}; // Right side of the map (eastern coast)
  }
  
  // Special case: Al-Faisaliah Islamic - place exactly below Manarat Al-Khobar
  if (school.name && (school.name.toLowerCase().includes('al-faisaliah islamic') || school.name.toLowerCase().includes('faisaliah islamic') || school.name.toLowerCase().includes('faisaliah'))) {
    return { x: 85, y: 44 }; // Exactly below Manarat Al-Khobar (same x, higher y)
  }
  
  // Special case: Green Hills International - place at lower left side of the map
  if (school.name && (school.name.toLowerCase().includes('green hills international') || school.name.toLowerCase().includes('green hills'))) {
    return { x: 12.5, y: 67 }; // Lower left side of the map
  }
  
  // Special case: Sherborne School Jeddah - place exactly above Green Hills International
  if (school.name && (school.name.toLowerCase().includes('sherborne school jeddah') || school.name.toLowerCase().includes('sherborne'))) {
    return { x: 9, y: 64 }; // Exactly above Green Hills International (same x, lower y)
  }
  
  // Special case: Manarat Jeddah - place exactly below and to the right of Green Hills International
  if (school.name && (school.name.toLowerCase().includes('manarat jeddah') || (school.name.toLowerCase().includes('manarat') && !school.name.toLowerCase().includes('ibn khaldun') && !school.name.toLowerCase().includes('khobar') && !school.name.toLowerCase().includes('madinah') && !school.name.toLowerCase().includes('dammam') && !school.name.toLowerCase().includes('riyadh')))) {
    return { x: 18, y: 68 }; // Below and to the right of Green Hills International (higher x and y)
  }
  
  // Special case: Ibn Khaldun Schools - place in the lower/southern region of the map
  if (school.name && (school.name.toLowerCase().includes('ibn khaldun') || school.name.toLowerCase().includes('khaldun'))) {
    return { x: 55, y: 53 }; // Lower/southern region of the map
  }
  
  // Special case: Manarat Al-Riyadh - place exactly below Ibn Khaldun Schools
  if (school.name && (school.name.toLowerCase().includes('manarat al-riyadh') || school.name.toLowerCase().includes('manarat alriyadh') || school.name.toLowerCase().includes('manarat riyadh'))) {
    return { x: 60, y: 48 }; // Exactly below Ibn Khaldun Schools (same x, higher y)
  }
  
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
  const [clickedSchool, setClickedSchool] = useState<School | null>(null);

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

      <div 
        className="absolute inset-0 flex items-center justify-center pl-[260px] pr-4"
        onClick={() => setClickedSchool(null)}
      >
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
                height: '100%',
                overflow: 'visible'
              }}
            >
              {filteredSchools.map((school, index) => {
                const coords = getSchoolCoordinates(school);
                const colorFilter = getSchoolTypeFilter(school.school_type);
                const isClicked = clickedSchool?.id === school.id;
                
                return (
                  <g 
                    key={school.id || index} 
                    className="school-pin group" 
                    style={{ pointerEvents: 'auto', cursor: 'pointer', overflow: 'visible' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setClickedSchool(isClicked ? null : school);
                    }}
                  >
                    {/* Pin Icon Image - Using blue.png with color filter based on school type - Much larger size */}
                    <image
                      href={bluePinIcon}
                      x={coords.x - (isClicked ? 11.5 : 10)}
                      y={coords.y - (isClicked ? 20.75 : 18)}
                      width={isClicked ? "23" : "20"}
                      height={isClicked ? "28.75" : "25"}
                      className="hover:opacity-90 transition-opacity"
                      style={{ 
                        filter: `${colorFilter} drop-shadow(0 4px 8px rgba(0,0,0,0.5))`,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        opacity: isClicked ? 1 : 0.9,
                        transition: 'opacity 0.2s ease, width 0.2s ease, height 0.2s ease, x 0.2s ease, y 0.2s ease'
                      }}
                    />
                    
                    {/* Clicked Overlay - Show school name and address in a card with black background - Positioned above the pin */}
                    {isClicked && (
                      <g className="pointer-events-none" style={{ zIndex: 1000 }}>
                        {/* Calculate card dimensions based on text length */}
                        {(() => {
                          const nameLength = school.name?.length || 0;
                          const addressLength = school.address?.length || 0;
                          const maxLength = Math.max(nameLength, addressLength);
                          // Better width calculation: base width + character-based width (increased significantly for longer addresses)
                          // Use larger multiplier for addresses to ensure they fit completely
                          const baseWidth = 40;
                          // For very long addresses, use wider character spacing
                          const charWidth = addressLength > 40 ? 0.8 : (addressLength > 25 ? 0.7 : 0.65);
                          // Increased max width to 100 to accommodate very long addresses
                          const cardWidth = Math.max(45, Math.min(100, baseWidth + (maxLength * charWidth)));
                          const cardHeight = school.address ? 9 : 5.5;
                          const padding = 2;
                          // Position card well above the pin - account for clicked pin height (28.75)
                          const pinTopY = coords.y - 20.75; // Top of clicked pin
                          const gap = 2; // Gap between pin and card
                          let cardY = pinTopY - cardHeight - padding - gap; // Position card above pin
                          let cardX = coords.x - cardWidth / 2;
                          
                          // If card would go above viewBox (y < 3), position it below the pin instead
                          if (cardY < 3) {
                            const pinBottomY = coords.y + 5; // Bottom of pin
                            cardY = pinBottomY + gap;
                          }
                          
                          // Ensure card is within viewBox bounds (0-100)
                          const finalCardY = Math.max(2, Math.min(95, cardY)); // Keep within y bounds
                          // Adjust x position to keep card within bounds, but allow it to extend if needed
                          let finalCardX = cardX;
                          if (finalCardX - cardWidth/2 < 2) {
                            finalCardX = cardWidth/2 + 2; // Shift right if too far left
                          } else if (finalCardX + cardWidth/2 > 98) {
                            finalCardX = 98 - cardWidth/2; // Shift left if too far right
                          }
                          
                          return (
                            <>
                              {/* Black background card with rounded corners and padding */}
                              <rect
                                x={finalCardX - padding}
                                y={finalCardY - padding}
                                width={cardWidth + (padding * 2)}
                                height={cardHeight + (padding * 2)}
                                rx="2"
                                ry="2"
                                fill="#000000"
                                opacity="0.95"
                                style={{
                                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                                  pointerEvents: 'none'
                                }}
                              />
                              {/* School Name - White text on black background */}
                              <text
                                x={coords.x}
                                y={finalCardY + 3.5}
                                textAnchor="middle"
                                fontSize="3.8"
                                fill="#FFFFFF"
                                fontWeight="900"
                                style={{ 
                                  pointerEvents: 'none',
                                  fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}
                              >
                                {school.name || 'Unknown School'}
                              </text>
                              {/* Address - Light gray text on black background - Full address with no truncation */}
                              {school.address && (
                                <text
                                  x={coords.x}
                                  y={finalCardY + 7.5}
                                  textAnchor="middle"
                                  fontSize="2.4"
                                  fill="#E5E7EB"
                                  fontWeight="600"
                                  style={{ 
                                    pointerEvents: 'none',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                  }}
                                >
                                  {school.address}
                                </text>
                              )}
                            </>
                          );
                        })()}
                      </g>
                    )}
                    
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
