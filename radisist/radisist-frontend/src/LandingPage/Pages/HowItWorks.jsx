import React from "react";
import { motion } from "framer-motion";

import cardUpload from "../Images/cardUpload.svg";
import cardAI from "../Images/cardAI.svg";
import cardReview from "../Images/cardReview.svg";

function HowItWorks() {
  // Cards data
  const workCards = [
    {
      number: "1",
      icon: cardUpload,
      heading: "Upload Scans",
      subHead: "Upload mammography scans in seconds — DICOM, JPEG, or PNG formats supported.",
    },
    {
      number: "2",
      icon: cardAI,
      heading: "AI Analysis",
      subHead: "Our deep learning engine instantly parses the scans and highlights potential abnormalities.",
    },
    {
      number: "3",
      icon: cardReview,
      heading: "Radiologist Review",
      subHead: "Receive a clinical-grade diagnostic report verified by highly qualified radiologists.",
    },
  ];

  return (
    <article
      id="how-it-works"
      className="w-full min-h-[90vh] py-24 bg-gradient-to-b from-[#FFFDFE] to-[#F5F2FF] flex flex-col justify-center items-center overflow-hidden"
    >
      {/* Heading block */}
      <div className="relative z-20 flex flex-col gap-4 items-center justify-center w-full px-6 text-center max-w-4xl">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#780F32] bg-[#780F32]/5 px-4 py-1.5 rounded-full">
          Workflow
        </span>
        <h3 className="text-3xl md:text-5xl font-black text-neutral-900 mt-2">
          How It Works?
        </h3>
        <p className="text-sm sm:text-base md:text-lg text-neutral-500 max-w-2xl mt-2 leading-relaxed">
          In just three simple steps, our platform transforms raw imaging scans into
          clear, actionable clinical insights. Fast, accurate, and secure.
        </p>
      </div>

      {/* Cards list */}
      <div className="w-full max-w-7xl relative z-30 flex flex-wrap items-center justify-center gap-8 md:gap-10 py-16 px-6 md:px-12">
        {workCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="work-card bg-gradient-to-br from-[#6A1B36] to-[#470B20] text-white flex flex-col items-center justify-center text-center 
              py-8 px-8 sm:px-10 gap-6 w-[90%] sm:w-[75%] md:w-[45%] lg:w-[30%] 
              min-h-[380px] md:min-h-[420px] lg:min-h-[440px] 
              rounded-[2.5rem] shadow-[0_15px_40px_rgba(71,11,32,0.15)] hover:shadow-[0_25px_50px_rgba(71,11,32,0.3)]
              transition-shadow duration-300 relative overflow-hidden group cursor-pointer"
          >
            {/* Giant Background Number */}
            <h1 className="absolute text-[160px] sm:text-[220px] md:text-[250px] -top-10 -left-6 font-black opacity-[0.04] text-white select-none pointer-events-none transition-transform duration-700 group-hover:scale-110">
              {card.number}
            </h1>

            {/* Glowing element inside */}
            <div className="absolute -right-20 -bottom-20 w-40 h-40 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-colors duration-500" />

            {/* Icon Wrapper */}
            <div className="bg-[#C9DCF6] w-20 h-20 flex items-center justify-center rounded-2xl relative z-10 shadow-lg transform transition-transform duration-500 group-hover:rotate-6">
              <img className="w-11 h-11" src={card.icon} alt={card.heading} />
            </div>

            {/* Content text */}
            <div className="flex flex-col gap-3 relative z-10">
              <h2 className="text-xl md:text-2xl text-[#C9DCF6] font-bold">
                {card.heading}
              </h2>
              <p className="text-sm md:text-base text-[#EDEBFF] leading-relaxed font-light">
                {card.subHead}
              </p>
            </div>

            {/* Top-right card dot indicator */}
            <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-[#C9DCF6] opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
        ))}
      </div>
    </article>
  );
}

export default HowItWorks;
