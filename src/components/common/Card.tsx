import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'warning' | 'danger';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-slate-200 text-slate-700',
    elevated: 'bg-white border border-slate-200 text-slate-700',
    interactive:
      'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer text-slate-700',
    warning: 'bg-amber-50/60 border border-amber-200 text-slate-800',
    danger: 'bg-rose-50/60 border border-rose-200 text-slate-800',
  };

  return (
    <div
      className={`rounded-none p-4 font-normal ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
