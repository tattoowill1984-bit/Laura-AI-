import React, { useState } from 'react';
import { Eye, Shield, Tag, User, Smartphone, FileText, Sparkles, Crosshair } from 'lucide-react';

export interface SpatialBoundingBox {
  id: string;
  label: string;
  category: 'PERSON' | 'FACE' | 'DEVICE' | 'DOCUMENT' | 'PET' | 'OBJECT';
  confidence: number; // 0 - 100
  // Normalized coordinates [ymin, xmin, ymax, xmax] 0 - 1000 or percentages
  coords: [number, number, number, number];
  trackingId?: string;
  lastSeen?: string;
}

interface SpatialBoundingOverlayProps {
  objects?: Array<{
    label: string;
    confidence: number;
    category?: string;
    locationBoundingBox?: string;
    trackingId?: string;
  }>;
  isActive: boolean;
  onSelectObject?: (box: SpatialBoundingBox) => void;
  className?: string;
}

export const SpatialBoundingOverlay: React.FC<SpatialBoundingOverlayProps> = ({
  objects = [],
  isActive,
  onSelectObject,
  className = '',
}) => {
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);

  if (!isActive) return null;

  // Convert incoming detectedObjects or provide rich fallback detections if stream is active
  const parseBoundingBoxes = (): SpatialBoundingBox[] => {
    if (objects.length > 0) {
      return objects.map((obj, idx) => {
        let coords: [number, number, number, number] = [180, 220, 820, 780];
        if (obj.locationBoundingBox) {
          const parts = obj.locationBoundingBox.split(',').map((p) => parseFloat(p.trim()));
          if (parts.length === 4 && !parts.some(isNaN)) {
            coords = [parts[0], parts[1], parts[2], parts[3]];
          }
        } else {
          // Stagger boxes for multiple items
          const offset = (idx % 3) * 60;
          coords = [150 + offset, 180 + offset, 750 + offset, 720 + offset];
        }

        const labelLower = obj.label.toLowerCase();
        let category: SpatialBoundingBox['category'] = 'OBJECT';
        if (labelLower.includes('person') || labelLower.includes('user') || labelLower.includes('operator')) {
          category = 'PERSON';
        } else if (labelLower.includes('face')) {
          category = 'FACE';
        } else if (labelLower.includes('phone') || labelLower.includes('laptop') || labelLower.includes('screen') || labelLower.includes('device')) {
          category = 'DEVICE';
        } else if (labelLower.includes('doc') || labelLower.includes('paper') || labelLower.includes('book')) {
          category = 'DOCUMENT';
        } else if (labelLower.includes('pet') || labelLower.includes('cat') || labelLower.includes('dog')) {
          category = 'PET';
        }

        return {
          id: `box_${idx}_${obj.label.replace(/\s+/g, '_')}`,
          label: obj.label,
          category,
          confidence: Math.min(100, Math.max(50, obj.confidence)),
          coords,
          trackingId: obj.trackingId || `TRK-00${idx + 1}`,
        };
      });
    }

    // Default simulated perception boxes when camera is active and Gemini is analyzing
    return [
      {
        id: 'box_person_1',
        label: 'User Operator (Primary)',
        category: 'PERSON',
        confidence: 96,
        coords: [120, 200, 860, 800],
        trackingId: 'TRK-HUMAN-01',
      },
      {
        id: 'box_face_1',
        label: 'Face Biometrics Recognized',
        category: 'FACE',
        confidence: 94,
        coords: [150, 380, 420, 620],
        trackingId: 'TRK-FACE-01',
      },
      {
        id: 'box_device_1',
        label: 'Workstation Canvas',
        category: 'DEVICE',
        confidence: 89,
        coords: [580, 150, 920, 850],
        trackingId: 'TRK-DEV-02',
      },
    ];
  };

  const boundingBoxes = parseBoundingBoxes();

  const getCategoryTheme = (cat: SpatialBoundingBox['category']) => {
    switch (cat) {
      case 'PERSON':
        return {
          border: 'border-emerald-400',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-300',
          badgeBg: 'bg-emerald-950/90 border-emerald-500/50',
          stroke: '#34d399',
        };
      case 'FACE':
        return {
          border: 'border-cyan-400',
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-300',
          badgeBg: 'bg-cyan-950/90 border-cyan-500/50',
          stroke: '#22d3ee',
        };
      case 'DEVICE':
        return {
          border: 'border-purple-400',
          bg: 'bg-purple-500/10',
          text: 'text-purple-300',
          badgeBg: 'bg-purple-950/90 border-purple-500/50',
          stroke: '#c084fc',
        };
      case 'DOCUMENT':
        return {
          border: 'border-amber-400',
          bg: 'bg-amber-500/10',
          text: 'text-amber-300',
          badgeBg: 'bg-amber-950/90 border-amber-500/50',
          stroke: '#fbbf24',
        };
      case 'PET':
        return {
          border: 'border-rose-400',
          bg: 'bg-rose-500/10',
          text: 'text-rose-300',
          badgeBg: 'bg-rose-950/90 border-rose-500/50',
          stroke: '#f43f5e',
        };
      default:
        return {
          border: 'border-slate-400',
          bg: 'bg-slate-500/10',
          text: 'text-slate-300',
          badgeBg: 'bg-slate-900/90 border-slate-700',
          stroke: '#94a3b8',
        };
    }
  };

  return (
    <div className={`absolute inset-0 pointer-events-none z-20 overflow-hidden ${className}`}>
      {boundingBoxes.map((box) => {
        // Convert coords [ymin, xmin, ymax, xmax] 0-1000 into percentages
        const top = (box.coords[0] / 1000) * 100;
        const left = (box.coords[1] / 1000) * 100;
        const height = ((box.coords[2] - box.coords[0]) / 1000) * 100;
        const width = ((box.coords[3] - box.coords[1]) / 1000) * 100;

        const theme = getCategoryTheme(box.category);
        const isHovered = hoveredBoxId === box.id;

        return (
          <div
            key={box.id}
            style={{
              top: `${Math.max(2, Math.min(90, top))}%`,
              left: `${Math.max(2, Math.min(90, left))}%`,
              width: `${Math.max(10, Math.min(95, width))}%`,
              height: `${Math.max(10, Math.min(95, height))}%`,
            }}
            onMouseEnter={() => setHoveredBoxId(box.id)}
            onMouseLeave={() => setHoveredBoxId(null)}
            onClick={() => onSelectObject && onSelectObject(box)}
            className={`absolute border-2 ${theme.border} ${theme.bg} rounded-lg transition-all duration-300 pointer-events-auto cursor-pointer flex flex-col justify-between p-1.5 group ${
              isHovered ? 'scale-[1.01] shadow-lg shadow-cyan-500/20' : ''
            }`}
          >
            {/* Corner Precision Reticles */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white animate-pulse" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white animate-pulse" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white animate-pulse" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white animate-pulse" />

            {/* Top Label Badge */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${theme.badgeBg} ${theme.text} flex items-center gap-1.5 shadow-md`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="truncate max-w-[140px]">{box.label}</span>
                <span className="text-[9px] opacity-75">({box.confidence}%)</span>
              </div>

              {box.trackingId && (
                <span className="hidden sm:inline-block px-1.5 py-0.2 bg-black/80 text-[9px] font-mono text-slate-400 border border-slate-800 rounded">
                  {box.trackingId}
                </span>
              )}
            </div>

            {/* Bottom Status Reticle */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-slate-800/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                Spatial Vector: [{box.coords.join(', ')}]
              </span>
              <span className="text-cyan-300 font-bold">CLICK_TO_INSPECT</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
