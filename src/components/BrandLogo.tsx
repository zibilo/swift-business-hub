import React from 'react';

export const BrandLogo = ({ className = "h-8 w-auto", color = "#004080" }: { className?: string, color?: string }) => (
  <svg viewBox="0 0 300 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="150" cy="50" rx="140" ry="45" fill="none" stroke={color} strokeWidth="4" />
    <text x="150" y="65" fontFamily="Arial, sans-serif" fontSize="40" fontWeight="bold" fill={color} textAnchor="middle">
      MUCODEC
    </text>
    <path d="M50 50 Q 100 20 150 50 T 250 50" fill="none" stroke="#E30613" strokeWidth="3" />
  </svg>
);
