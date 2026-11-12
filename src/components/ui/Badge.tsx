interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'done' | 'locked' | 'info';
}

export function Badge({ children, variant = 'info' }: BadgeProps) {
  const variants = {
    active: 'bg-[#70f8e8] text-[#006a62]',
    done: 'bg-[#c3f7c0] text-[#1a7a1a]',
    locked: 'bg-[#e0e0e0] text-[#777]',
    info: 'bg-[#a6d7ff] text-[#253f8a]',
  };
  return (
    <span
      className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
