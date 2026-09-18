import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white border border-slate-900',
    secondary:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300',
    danger:
      'bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white border border-rose-800',
    ghost:
      'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600',
    outline:
      'bg-transparent hover:bg-slate-50 text-slate-600 border border-slate-300',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2',
    lg: 'text-sm px-4 py-2 gap-2',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-normal rounded-none transition-colors select-none outline-none ${
        sizeStyles[size]
      } ${variantStyles[variant]} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <span>Please wait...</span>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
