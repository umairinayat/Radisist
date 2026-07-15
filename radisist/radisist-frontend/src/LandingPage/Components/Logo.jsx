import React from 'react';
import logo from "../../Images/Logo.png";

export default function Logo({ className = "", menuOpen = false, darkBackground = false, white = false }) {
  const showWhiteBg = (darkBackground || menuOpen) && !white;

  return (
    <div className={`flex items-center select-none transition-all duration-300 ${
      showWhiteBg ? "bg-white rounded-2xl p-1.5" : "bg-transparent"
    } ${className}`}>
      <img
        src={logo}
        alt="Logo"
        className={`h-8 w-auto md:h-10 object-contain ${
          white || darkBackground ? "brightness-0 invert" : ""
        }`}
      />
    </div>
  );
}
