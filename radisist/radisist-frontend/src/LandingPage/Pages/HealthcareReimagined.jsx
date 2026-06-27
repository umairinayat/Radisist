import React from "react";

import plusicon from "../Images/plusicon.png"
import { IoTimeOutline } from "react-icons/io5";
import { PiStethoscope } from "react-icons/pi";
import { TbHeartPlus } from "react-icons/tb";
import { LiaNotesMedicalSolid } from "react-icons/lia";

function HealthcareReimagined() {

  const reimaginedCards = [
    {
      icon: <IoTimeOutline />,
      heading: "Save Hours of Work",
      subHead:
        "AI reduces manual analysis time so radiologists can focus on decisions that matter.",
    },

    {
      icon: <PiStethoscope />,
      heading: "Detect Disease Earlier",
      subHead:
        "Catch critical conditions in their earliest stages with advanced AI insights.",
    },

    {
      icon: <TbHeartPlus />,
      heading: "Improve Outcomes",
      subHead:
        "Faster, more accurate reports lead to timely treatments and higher survival rates.",
    },

    {
      icon: <LiaNotesMedicalSolid />,
      heading: "Reduce Workload",
      subHead:
        "Streamlined reporting eases pressure on staff and improves overall efficiency.",
    },
  ];

  return (
    <section id="about" className="relative z-[-1] bg-white w-full min-h-screen px-12 md:px-16 lg:px-28 py-16 md:py-20 flex flex-col justify-center items-start md:mt-30">
      {/* Heading content */}
      <div className="flex flex-col gap-5 md:gap-10 w-full max-w-6xl">
        <img className="absolute top-15 right-0" src={plusicon} />
        <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#780F32]">
          HEALTHCARE, <br />
          <span className="font-normal text-black">REIMAGINED</span>
        </h1>

        <p
          id="reimagine-para"
          className="text-base sm:text-lg md:text-2xl text-black"
        >
          Imagine a <span className="font-semibold text-[#780F32]">world</span>{" "}
          where waiting for critical reports is no longer the norm. With AI
          working hand in hand with radiologists, we’re{" "}
          <span className="font-semibold text-[#780F32]">
            reimagining healthcare
          </span>
          , making diagnoses faster, more accurate, and{" "}
          <span className="font-semibold text-[#780F32]">accessible</span> for
          every <span className="font-semibold text-[#780F32]">patient</span>.
        </p>
      </div>

      {/* Reimagined Section Cards Container */}
      <div className="w-full mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-10">
        {/* Example card structure — you can map over `reimaginedCards` later */}
        {reimaginedCards.map((card, index) => (
          <div
            key={index}
            className="group relative work-card overflow-hidden rounded-4xl py-10 px-10 md:py-20 md:px-16 flex flex-col items-center justify-between text-center cursor-pointer bg-[#EDEBFF] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_20px_70px_rgba(0,0,0,0.10)]"
          >
            {/* Hover fill animation layer */}
            <span className="absolute inset-0 overflow-hidden rounded-3xl">
              <span className="absolute left-0 aspect-square w-full origin-center -translate-x-full rounded-full bg-[#780F32] transition-all duration-700 group-hover:-translate-x-0 group-hover:scale-150"></span>
            </span>

            {/* Card content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              {/* Icon Circle */}
              <div className="rounded-full w-14 h-14 md:w-18 md:h-18 bg-[#E5E0F3] flex items-center justify-center transition-all duration-500 group-hover:bg-[#C9DCF6]">
                <span className="text-3xl md:text-5xl text-black group-hover:text-[#780F32]">
                  {card.icon}
                </span>
              </div>

              {/* Heading */}
              <h3 className="text-lg md:text-3xl font-bold text-[#780F32] transition-colors duration-500 group-hover:text-[#C9DCF6]">
                {card.heading}
              </h3>

              {/* Subtext */}
              <p className="text-sm md:text-xl text-[#3F3F3F] transition-colors duration-500 group-hover:text-gray-200">
                {card.subHead}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HealthcareReimagined;
