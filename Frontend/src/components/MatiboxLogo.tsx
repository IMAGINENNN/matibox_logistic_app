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
    sm: { circle: 34, wordmark: 'text-base sm:text-lg', sub: 'text-[11px]' },
    md: { circle: 40, wordmark: 'text-lg sm:text-xl', sub: 'text-xs' },
    lg: { circle: 48, wordmark: 'text-xl sm:text-2xl', sub: 'text-xs' }
  }[size];

  return (
    <div className="inline-flex items-center gap-3 select-none min-w-0">
      {/* Authentic MATiBOX Circular Emblem */}
      <div
        className="relative shrink-0 rounded-full flex items-center justify-center shadow-md"
        style={{
          width: dimensions.circle,
          height: dimensions.circle,
          background: 'linear-gradient(145deg, #F58612 0%, #E97905 65%, #C45D00 100%)',
          boxShadow:
            '0 4px 12px -2px rgba(233, 121, 5, 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
        }}
      >
        <div
          className="absolute inset-[2.5px] rounded-full pointer-events-none"
          style={{
            border: '1.75px solid rgba(255, 255, 255, 0.9)'
          }}
        />
        <svg
          viewBox="0 0 48 48"
          className="w-full h-full p-[6px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <text
            x="8"
            y="29"
            fill="#FFFFFF"
            stroke="#3E2000"
            strokeWidth="0.7"
            style={{
              fontFamily: 'var(--font-brand)',
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
            strokeWidth="0.7"
            style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 800,
              fontSize: '18px'
            }}
          >
            B
          </text>
        </svg>
      </div>

      {/* MATiBOX Wordmark & Subtitle */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold tracking-tight leading-none ${dimensions.wordmark}`}
            style={{
              fontFamily: 'var(--font-brand)',
              color: darkText ? '#FF3B30' : '#DC2626'
            }}
          >
            MAT<span className="lowercase">i</span>BOX
          </span>
          {badge && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-primary-soft)] text-[var(--accent-primary-vivid)] border border-[var(--accent-primary)]/25 shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className={`${dimensions.sub} font-medium mt-0.5 truncate`}
            style={{ color: 'var(--text-muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
