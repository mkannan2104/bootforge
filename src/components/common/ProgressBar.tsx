import React from 'react';

export interface ProgressBarProps {
  percentage: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  variant = 'primary',
  size = 'md',
}) => {
  const clamped = Math.min(100, Math.max(0, percentage));

  const variantColors = {
    primary: 'bg-slate-700',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
  };

  const sizeHeights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className={`w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden ${sizeHeights[size]}`}>
      <div
        className={`h-full transition-all duration-200 rounded-none ${variantColors[variant]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
