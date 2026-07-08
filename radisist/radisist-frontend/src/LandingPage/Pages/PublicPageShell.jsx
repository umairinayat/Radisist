import React from "react";
import ThreeHeroBackground from "../Components/ThreeHeroBackground";

function PublicPageShell({ children }) {
  return (
    <div className="relative w-full overflow-x-hidden font-normal">
      {/* Three.js interactive 3D particle connectome background */}
      <ThreeHeroBackground />

      {/* Decorative blurry background radial layers */}
      <div className="bg-[#780F32]/5 w-[500px] h-[500px] rounded-full blur-[120px] absolute top-[-100px] right-[-100px] pointer-events-none z-0" />
      <div className="bg-[#C9DCF6]/10 w-[600px] h-[600px] rounded-full blur-[150px] absolute bottom-[-200px] left-[-200px] pointer-events-none z-0" />

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export default PublicPageShell;
