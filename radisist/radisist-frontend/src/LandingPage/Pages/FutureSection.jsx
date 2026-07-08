import React from "react";
import { useNavigate } from "react-router-dom";
import lasthero from "../Images/lasthero.svg";

function FutureSection() {
  const navigate = useNavigate();

  return (
    <section className="bg-gradient-to-b from-white via-[#8B2B4B] to-black w-full overflow-hidden relative">
      <div className="relative w-full">
        {/* Background image (curves preserved at 100% opacity to align edges seamlessly) */}
        <img
          src={lasthero}
          alt="Future Starts Here Background"
          className="w-full object-cover md:h-full h-[90vh] select-none pointer-events-none"
        />

        {/* Gradient overlay for blending curves and enhancing readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />

        {/* Overlay content */}
        <div
          className="
            absolute inset-0 
            flex flex-col items-center 
            justify-center 
            text-white 
            px-6 sm:px-10 md:px-16 lg:px-24 
            text-center 
            pt-0 md:pt-16
          "
        >
          {/* Heading */}
          <h1 className="w-full text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight max-w-5xl">
            The <span className="bg-white text-black px-4 py-1 rounded-2xl font-black shadow-[0_10px_30px_rgba(255,255,255,0.15)] inline-block my-1 md:my-0">Future</span> Starts Here.
          </h1>

          {/* Description */}
          <p className="w-full mt-6 text-sm sm:text-lg md:text-xl max-w-2xl opacity-90 font-light leading-relaxed">
            Together, we're redefining the future of healthcare — blending human expertise with deep learning innovation to create a world where technology heals with precision, speed, and compassion.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate("/createaccount")}
            className="mt-10 bg-white text-[#780F32] hover:bg-[#780F32] hover:text-white border-2 border-white text-base sm:text-lg px-10 py-3 rounded-full font-bold shadow-[0_15px_30px_rgba(255,255,255,0.1)] transition-all duration-500 ease-in-out cursor-pointer active:scale-95"
          >
            Join the Future
          </button>
        </div>
      </div>
    </section>
  );
}

export default FutureSection;
