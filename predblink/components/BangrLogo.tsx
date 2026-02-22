import React from 'react';

interface PredBlinkLogoProps {
  className?: string;
}

export const PredBlinkLogo: React.FC<PredBlinkLogoProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="40" height="40" rx="10" fill="#7259ff" />
    <path
      d="M12 28V12h7.5c1.8 0 3.2.5 4.2 1.4 1 .9 1.5 2.1 1.5 3.5 0 1-.3 1.8-.8 2.5-.5.7-1.2 1.2-2 1.4v.1c1 .2 1.8.7 2.4 1.5.6.8.9 1.7.9 2.8 0 1.6-.6 2.8-1.7 3.7-1.1.9-2.6 1.4-4.5 1.4H12zm3.5-9.3h3.8c1 0 1.8-.2 2.3-.7.6-.5.8-1.1.8-2 0-.8-.3-1.5-.8-1.9-.5-.5-1.3-.7-2.3-.7h-3.8v5.3zm0 2.6v6h4.3c1 0 1.9-.3 2.4-.8.6-.5.9-1.3.9-2.2 0-.9-.3-1.6-.9-2.2-.6-.5-1.4-.8-2.5-.8h-4.2z"
      fill="white"
    />
  </svg>
);
