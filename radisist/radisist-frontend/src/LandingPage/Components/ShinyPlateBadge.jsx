import React from 'react'

function ShinyPlateBadge() {
  return (
    <div className="relative overflow-hidden border-[#780F32] border px-8 py-[6px] md:px-10 md:py-[8px] rounded-full inline-block text-[#780F32] shadow-[0_2px_10px_rgba(120,15,50,0.15)] bg-[#ffecec] scale-[0.9]">
      <span className="relative z-10 text-[13px] md:text-[15px] font-medium">
        Your Radiology Assistant
      </span>

      {/* Diagonal infinite shine */}
      <div className="animate-shine-diagonal absolute inset-0 -top-[40px] flex h-[calc(100%+80px)] w-full justify-center blur-[10px]">
        <div className="relative h-full w-12 bg-white/60 rotate-[25deg]"></div>
      </div>
    </div>
  )
}

export default ShinyPlateBadge
