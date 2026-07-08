import React from 'react';
import logo from "../../Images/Logo.png";

export default function Logo({ className = "", menuOpen = false, darkBackground = false }) {
  const showWhiteBg = darkBackground || menuOpen;

  return (
    <div className={`flex items-center select-none transition-all duration-300 ${
      showWhiteBg ? "bg-white rounded-2xl p-1.5" : "bg-transparent"
    } ${className}`}>
      <img src={logo} alt="Logo" className="h-10 w-auto md:h-12 object-contain" />
    </div>
  );
}
