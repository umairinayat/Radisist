import React from "react";
import { SlArrowLeftCircle } from "react-icons/sl";

const ITEMS = [
  "Breast Cancer Detection",
  "Mammogram Analysis",
  "Tumor Classification",
  "AI Diagnosis",
  "Medical Imaging",
  "Deep Learning",
  "Radiology AI",
];

function InfiniteBar() {
  return (
    <div className="relative overflow-hidden bg-white mt-12 mb-12 py-5 md:py-8 select-none">
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white to-transparent z-10" />

      {/* Infinite scrolling track */}
      <div className="flex whitespace-nowrap animate-infinite-scroll">
        {[...Array(2)].map((_, loopIndex) => (
          <div
            key={loopIndex}
            className="flex gap-8 md:gap-20 px-10 text-sm md:text-xl font-semibold text-[#787878] uppercase"
          >
            {ITEMS.map((item, index) => (
              <h3
                key={index}
                className="flex items-center gap-6 transition-colors hover:text-[#8A1C3C]"
              >
                <SlArrowLeftCircle
                  aria-hidden="true"
                  className="text-2xl"
                />
                {item}
              </h3>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfiniteBar;
