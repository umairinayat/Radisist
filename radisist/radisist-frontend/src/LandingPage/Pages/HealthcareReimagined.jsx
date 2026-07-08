import React from "react";
import { motion } from "framer-motion";

import plusicon from "../Images/plusicon.png";
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
        "AI reduces manual scan analysis time so radiologists can focus on critical diagnostic decisions.",
    },
    {
      icon: <PiStethoscope />,
      heading: "Detect Disease Earlier",
      subHead:
        "Catch anomalies in their earliest stages with deep learning micro-calcification highlights.",
    },
    {
      icon: <TbHeartPlus />,
      heading: "Improve Outcomes",
      subHead:
        "Faster, highly accurate reports lead to early intervention and significantly higher patient survival rates.",
    },
    {
      icon: <LiaNotesMedicalSolid />,
      heading: "Reduce Workload",
      subHead:
        "Streamlined workflows and automated report templates ease clinical team burnout and build efficiency.",
    },
  ];

  return (
    <section
      id="about"
      className="relative z-20 bg-white w-full min-h-screen px-6 sm:px-10 lg:px-24 py-24 flex flex-col justify-center items-center"
    >
      {/* Decorative Plus Icon in Background */}
      <img
        className="absolute top-12 right-0 w-32 md:w-48 opacity-20 pointer-events-none"
        src={plusicon}
        alt="decorative plus"
      />

      <div className="w-full max-w-7xl flex flex-col gap-6 md:gap-10">
        {/* Eyebrow and Title */}
        <div className="flex flex-col gap-3 max-w-4xl">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#780F32] bg-[#780F32]/5 px-4 py-1.5 rounded-full self-start">
            Innovation
          </span>
          <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#780F32] mt-2 leading-[1.05]">
            HEALTHCARE, <br />
            <span className="font-light text-black">REIMAGINED</span>
          </h1>

          <p
            id="reimagine-para"
            className="text-base sm:text-lg md:text-2xl text-neutral-600 mt-4 leading-relaxed font-light"
          >
            Imagine a <span className="font-semibold text-[#780F32]">world</span> where waiting
            for critical diagnostic reports is no longer the norm. With AI working hand-in-hand
            with clinical experts, we're{" "}
            <span className="font-semibold text-[#780F32]">reimagining healthcare</span>,
            making early cancer detection faster, more accurate, and{" "}
            <span className="font-semibold text-[#780F32]">accessible</span> for every{" "}
            <span className="font-semibold text-[#780F32]">patient</span>.
          </p>
        </div>

        {/* Reimagined Cards Grid */}
        <div className="w-full mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {reimaginedCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-[2.5rem] py-12 px-8 sm:px-12 flex flex-col items-center justify-center text-center cursor-pointer bg-[#F5F2FF] border border-[#780F32]/5 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-300"
            >
              {/* Hover fill animation layer */}
              <span className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
                <span className="absolute left-0 aspect-square w-full origin-center -translate-x-full rounded-full bg-[#780F32] transition-all duration-500 ease-in-out group-hover:-translate-x-0 group-hover:scale-150"></span>
              </span>

              {/* Card content */}
              <div className="relative z-10 flex flex-col items-center gap-4">
                {/* Icon Circle */}
                <div className="rounded-2xl w-16 h-16 bg-[#E5E0F3] flex items-center justify-center transition-all duration-300 group-hover:bg-white/10">
                  <span className="text-3xl md:text-4xl text-neutral-800 transition-colors duration-300 group-hover:text-white">
                    {card.icon}
                  </span>
                </div>

                {/* Heading */}
                <h3 className="text-lg md:text-2xl font-bold text-[#780F32] mt-2 transition-colors duration-300 group-hover:text-[#C9DCF6]">
                  {card.heading}
                </h3>

                {/* Subtext */}
                <p className="text-sm md:text-base text-neutral-600 leading-relaxed font-light transition-colors duration-300 group-hover:text-white/80">
                  {card.subHead}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HealthcareReimagined;
