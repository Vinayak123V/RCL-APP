import React, { useState, useEffect } from "react";
import { Battery, BatteryCharging, Zap } from "lucide-react";

interface BatteryCircleProps {
  level: number;
  isCharging: boolean;
  className?: string;
}

export const BatteryCircle: React.FC<BatteryCircleProps> = ({
  level,
  isCharging,
  className,
}) => {
  const [displayLevel, setDisplayLevel] = useState(level);

  useEffect(() => {
    // Animate the number
    let start = displayLevel;
    const end = level;
    if (start === end) return;

    const duration = 500;
    const increment = (end - start) / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
        setDisplayLevel(Math.round(end));
        clearInterval(timer);
      } else {
        setDisplayLevel(Math.round(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [level]);

  const getSegmentColor = (index: number) => {
    const totalSegments = 32;
    const filledSegments = Math.floor((level / 100) * totalSegments);
    
    if (index >= filledSegments) return '#1e293b'; // slate-800
    
    // Color based on battery level
    if (level > 70) return '#22c55e'; // green
    if (level >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getGlowColor = () => {
    if (isCharging) return '#22d3ee'; // cyan
    if (level > 70) return '#22c55e';
    if (level >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center ${className || ""}`}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes scale-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes number-glow {
          0%, 100% { text-shadow: 0 0 15px currentColor, 0 0 30px currentColor; }
          50% { text-shadow: 0 0 25px currentColor, 0 0 50px currentColor; }
        }
        @keyframes segment-fill {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes segment-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .animate-scale-pulse {
          animation: scale-pulse 2s ease-in-out infinite;
        }
        .animate-number-glow {
          animation: number-glow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="relative select-none w-full max-w-[280px] aspect-square mx-auto">
        {/* Outer glow rings */}
        <div 
          className="absolute inset-0 rounded-full blur-2xl animate-pulse-glow"
          style={{ 
            background: `radial-gradient(circle, ${getGlowColor()}25 0%, transparent 60%)`,
            transform: 'scale(1.15)'
          }}
        />
        
        {/* Main circular progress */}
        <div className="relative w-full h-full">
          {/* Segments circle */}
          <svg 
            className="absolute inset-0 w-full h-full" 
            viewBox="0 0 200 200"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {Array.from({ length: 32 }).map((_, i) => {
              const angle = (i * 360) / 32;
              const startAngle = angle - 4.5;
              const endAngle = angle + 4.5;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const outerRadius = 95;
              const innerRadius = 78;

              const x1 = 100 + outerRadius * Math.cos(startRad);
              const y1 = 100 + outerRadius * Math.sin(startRad);
              const x2 = 100 + outerRadius * Math.cos(endRad);
              const y2 = 100 + outerRadius * Math.sin(endRad);
              const x3 = 100 + innerRadius * Math.cos(endRad);
              const y3 = 100 + innerRadius * Math.sin(endRad);
              const x4 = 100 + innerRadius * Math.cos(startRad);
              const y4 = 100 + innerRadius * Math.sin(startRad);

              const totalSegments = 32;
              const filledSegments = Math.floor((level / 100) * totalSegments);
              const isFilled = i < filledSegments;

              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
                  fill={getSegmentColor(i)}
                  style={{
                    transition: 'fill 0.5s ease',
                    animation: isFilled 
                      ? `segment-fill 0.5s ease-out ${i * 0.02}s both, ${isCharging ? 'segment-pulse 1.5s ease-in-out infinite' : 'none'}` 
                      : 'none',
                    animationDelay: isFilled && isCharging ? `${i * 0.05}s` : '0s',
                    transformOrigin: 'center',
                  }}
                />
              );
            })}
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Battery Icon with glow */}
            <div className="relative mb-2 animate-scale-pulse">
              {isCharging ? (
                <BatteryCharging 
                  className="w-12 h-12" 
                  style={{ 
                    color: getGlowColor(),
                    filter: `drop-shadow(0 0 12px ${getGlowColor()})`,
                    transition: 'all 0.5s ease'
                  }} 
                />
              ) : (
                <Battery 
                  className="w-12 h-12" 
                  style={{ 
                    color: getGlowColor(),
                    filter: `drop-shadow(0 0 12px ${getGlowColor()})`,
                    transition: 'all 0.5s ease'
                  }} 
                />
              )}
              {isCharging && (
                <Zap 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-white animate-pulse" 
                />
              )}
            </div>

            {/* Percentage */}
            <div 
              className="text-6xl font-extrabold animate-number-glow tracking-tighter"
              style={{ 
                color: '#ffffff',
                textShadow: `0 0 20px ${getGlowColor()}80`,
                transition: 'all 0.5s ease'
              }}
            >
              {displayLevel}<span className="text-2xl text-slate-400 font-bold ml-0.5">%</span>
            </div>

            {/* Status text */}
            {isCharging && (
              <div className="mt-3 text-cyan-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                Charging
              </div>
            )}
          </div>

          {/* Pulsing outer rings for charging */}
          {isCharging && (
            <>
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none" 
                viewBox="0 0 200 200"
                style={{ opacity: 0.4 }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="98"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  style={{
                    animation: 'pulse-glow 2s ease-in-out infinite'
                  }}
                />
              </svg>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
