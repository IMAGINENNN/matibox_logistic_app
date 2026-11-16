import React from 'react';

interface MatiboxLogoProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  badge?: string;
  darkText?: boolean;
}

export const MatiboxLogo: React.FC<MatiboxLogoProps> = ({
  size = 'md',
  subtitle,
  badge,
  darkText = false
}) => {
  const dimensions = {
    sm: { circle: 36, wordmark: 'text-lg', sub: 'text-[10px]' },
    md: { circle: 44, wordmark: 'text-xl', sub: 'text-[11px]' },
    lg: { circle: 54, wordmark: 'text-2xl', sub: 'text-xs' }
  }[size];

  return (
    <div className="inline-flex items-center gap-3 select-none">
      {/* Authentic MATiBOX Circular Emblem (#E97905 Orange + Inner Ring + "MB" Monogram) */}
      <div
        className="relative shrink-0 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105"
        style={{
          width: dimensions.circle,
          height: dimensions.circle,
          background: 'linear-gradient(145deg, #FF8E1D 0%, #E97905 60%, #B65F04 100%)',
          boxShadow:
            '0 6px 18px -3px rgba(233, 121, 5, 0.55), inset 0 1.5px 2px rgba(255, 255, 255, 0.65), 0 0 0 1.5px rgba(90, 52, 15, 0.35)'
        }}
      >
        {/* Inner White Ring */}
        <div
          className="absolute inset-[3px] rounded-full pointer-events-none"
          style={{
            border: '2px solid rgba(255, 255, 255, 0.92)',
            boxShadow: 'inset 0 1px 3px rgba(62, 32, 0, 0.35)'
          }}
        />
        {/* "MB" Staggered Monogram */}
        <svg
          viewBox="0 0 48 48"
          className="w-full h-full p-[6px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="mb-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0.8" dy="1.4" stdDeviation="1" floodColor="#3E2000" floodOpacity="0.65" />
            </filter>
          </defs>
          <text
            x="8"
            y="29"
            fill="#FFFFFF"
            stroke="#3E2000"
            strokeWidth="0.8"
            filter="url(#mb-shadow)"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: '19px',
              letterSpacing: '-1px'
            }}
          >
            M
          </text>
          <text
            x="25"
            y="34"
            fill="#FFFFFF"
            stroke="#3E2000"
            strokeWidth="0.8"
            filter="url(#mb-shadow)"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: '18px'
            }}
          >
            B
          </text>
        </svg>
      </div>

      {/* MATiBOX Wordmark (#F01111 Scarlet Red) & Subtitle */}
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold tracking-tight leading-none ${dimensions.wordmark}`}
            style={{
              color: '#F01111',
              textShadow: darkText
                ? '0 2px 10px rgba(240, 17, 17, 0.35)'
                : '0 1px 2px rgba(90, 52, 15, 0.12)'
            }}
          >
            MAT<span className="lowercase">i</span>BOX
          </span>
          {badge && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(233, 121, 5, 0.16)',
                color: '#E97905',
                border: '1px solid rgba(233, 121, 5, 0.38)'
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className={`${dimensions.sub} font-medium tracking-wide mt-0.5`}
            style={{ color: 'var(--text-body)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
