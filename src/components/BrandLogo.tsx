
import React from 'react';

export const BrandLogo = ({ className = "h-8 w-auto", color = "#004080" }: { className?: string, color?: string }) => {
  return (
    <svg
      viewBox="0 0 400 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue Oval Border */}
      <ellipse
        cx="200" cy="100" rx="190" ry="90"
        stroke={color}
        strokeWidth="10"
        strokeDasharray="900 300"
        transform="rotate(-5 200 100)"
      />

      {/* Red Graphic (Mountain/Lightning) */}
      <path
        d="M100 80 L150 80 L180 50 L220 80 L250 80 L300 50"
        stroke="#E60000"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* MUCODEC Text */}
      <text
        x="200" y="160"
        textAnchor="middle"
        fill={color}
        style={{
          fontFamily: 'serif',
          fontSize: '70px',
          fontWeight: 'bold',
          letterSpacing: '2px'
        }}
      >
        MUCODEC
      </text>
    </svg>
  );
};
