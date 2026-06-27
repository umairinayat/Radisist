import React from "react";
import "../../index.css";
import ShinyPlateBadge from "../Components/ShinyPlateBadge";
import { GoArrowUpRight } from "react-icons/go";

import mobileHeroImg from "../Images/heroImage.png";
import plusicon from "../Images/plusicon.png";
import { useNavigate } from "react-router-dom";

function HeroLayout() {
  const navigate = useNavigate();
  return (
    <main id="home" className="relative z-0 flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-6 md:min-h-[calc(100vh-6rem)] md:gap-10">
      {/* Shiny Badge */}
      <ShinyPlateBadge />
      <img
        className="absolute right-0 md:z-[52] top-0 w-50 md:w-250"
        src={plusicon}
      />

      {/* Main Heading and tagline */}
      <div className="flex flex-col items-center justify-center w-3/4 text-center gap-3 md:gap-5">
        <h1 className="text-[1.69rem] md:text-[3.5rem] font-bold">
          Upload, Analyze, and Download{" "}
          <span className="text-[#6C1B36] font-black">medical-grade</span>{" "}
          reports in minutes.
        </h1>
        <p className="md:text-[1.2rem] md:px-24 text-[#74737A] text-[12px]">
          A precision-driven mammography assistant enabling timely and reliable
          breast cancer detection for better clinical decisions.
        </p>
      </div>

      {/* Explore Now Button */}
      <button
        onClick={() => navigate("/login")}
        className="
          group relative flex items-center gap-3
          overflow-hidden rounded-full px-7 md:px-9 py-2 md:py-3 
          text-white text-sm md:text-base font-semibold 
          bg-gradient-to-r from-[#5B1C2E] to-[#751e37] 
          shadow-[0_8px_20px_rgba(0,0,0,0.12)]
          transition-all duration-500 ease-in-out 
          active:scale-95 cursor-pointer z-[100]
        "
      >
        {/* Hover animation overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <span
            className="
              absolute left-0 aspect-square w-full origin-center 
              -translate-x-full rounded-full 
              bg-gradient-to-r from-[#431423] to-[#000] 
              transition-all duration-700 ease-in-out 
              group-hover:-translate-x-0 group-hover:scale-150
            "
          ></span>
        </span>

        <span className="relative z-10">Explore now</span>

        <span
          className="
            relative z-10 flex items-center justify-center 
            w-8 h-8 md:w-10 md:h-10 bg-black rounded-full 
            transition-all duration-500 ease-in-out 
            group-hover:bg-white group-hover:-translate-y-[2px]
          "
        >
          <GoArrowUpRight className="w-5 h-5 text-white group-hover:text-black transition-colors duration-500 ease-in-out" />
        </span>
      </button>

      {/* Image section — visible only on mobile & tablet */}
      <div className="relative w-full flex justify-center items-center mt-6 md:mt-10 lg:hidden">
        {/* Solid Side Bars */}
        <div className="absolute left-0 top-0 bottom-0 w-[6vw] sm:w-[10vw] md:w-[8vw] bg-[#751e37] rounded-r-[2rem]"></div>
        <div className="absolute right-0 top-0 bottom-0 w-[6vw] sm:w-[10vw] md:w-[8vw] bg-[#751e37] rounded-l-[2rem]"></div>

        {/* Center Image */}
        <div className="relative z-10 w-[65%] sm:w-[50%] md:hidden rounded-[1.8rem] overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.1)]">
          <img
            src={mobileHeroImg}
            alt="Radiologist"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </main>
  );
}

export default HeroLayout;
