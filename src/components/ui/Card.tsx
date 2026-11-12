import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      style={{
        boxShadow:
          '0 20px 45px -12px rgba(61,107,145,0.18), inset 2px 2px 6px rgba(255,255,255,0.95), inset -3px -3px 8px rgba(61,107,145,0.05)',
        ...style,
      }}
      className={`bg-white/95 backdrop-blur-xs rounded-[32px] border border-[#d8ecfd] p-6 relative transition-all ${className}`}
    >
      {children}
    </div>
  );
}
