import React from 'react';

const Card = ({
  children,
  className = '',
  hoverEffect = false,
  padding = 'p-4 sm:p-6',
  ...props
}) => {
  return (
    <div
      className={`bg-white text-[#172B4D] rounded-2xl border border-[#E2E8F0] shadow-sm ${
        hoverEffect
          ? 'hover:border-[#315BEA] hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200'
          : ''
      } ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
