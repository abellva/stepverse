import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#68b6f7] disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-gradient-to-b from-[#68b6f7] to-[#3d6b91] text-white shadow-[0_14px_22px_-6px_rgba(61,107,145,0.45),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-4px_0_#253f8a] hover:brightness-110 active:scale-[0.98]',
    secondary:
      'bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] shadow-[inset_2px_2px_4px_rgba(61,107,145,0.18),inset_-2px_-2px_4px_rgba(255,255,255,0.85),0_6px_12px_-4px_rgba(61,107,145,0.15)] hover:bg-[#d0ecff] active:scale-[0.98]',
    ghost: 'bg-transparent text-[#3d6b91] hover:bg-[#eaf6ff] active:scale-[0.98]',
  };
  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
