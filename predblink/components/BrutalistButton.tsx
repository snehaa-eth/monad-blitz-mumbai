import React from 'react';

interface BrutalistButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const BrutalistButton: React.FC<BrutalistButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = "relative font-mono font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-nitro-purple text-white hover:bg-nitro-violet hover:shadow-glow active:scale-[0.97]",
    secondary: "bg-nitro-purple text-white hover:bg-nitro-violet hover:shadow-glow active:scale-[0.97]",
    danger: "bg-transparent text-nitro-red border border-nitro-red/40 hover:bg-nitro-red/10 active:scale-[0.97]",
    outline: "bg-[#1a1a20] text-nitro-text border border-[#333340] hover:border-nitro-purple/50 hover:text-white active:scale-[0.97]",
  };

  const sizes: Record<string, string> = {
    sm: "px-5 py-2 text-[10px]",
    md: "px-7 py-3 text-[11px]",
    lg: "px-9 py-4 text-xs",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
