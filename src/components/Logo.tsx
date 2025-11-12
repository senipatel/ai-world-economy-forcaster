import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 50 }) => {
  return (
    <img 
      src="/images/logo.svg" 
      alt="AI Economic Forecaster Logo" 
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default Logo;
