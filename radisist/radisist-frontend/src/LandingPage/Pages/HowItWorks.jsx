import React from 'react'

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
      subHead:
        "Upload scans in seconds — DICOM, JPEG, or PNG supported.",
    },
    {
      number: "2",
      icon: cardAI,
      heading: "AI Analysis",
      subHead:
        "Our AI instantly analyzes and highlights potential abnormalities.",
    },
    {
      number: "3",
      icon: cardReview,
      heading: "Radiologist Review",
      subHead:
        "Receive a medical-grade report verified by highly qualified Radiologists.",
    },
  ];

  return (
    <article id="how-it-works" className="w-full min-h-screen bg-[#EDEBFF]">
      <div className="relative z-20 flex flex-col gap-6 md:gap-8 items-center justify-center w-full mt-12 md:mt-10 how-it-works-text">
        <h3 className="text-3xl md:text-5xl font-semibold">How It Works?</h3>
        <p className="md:w-full w-full px-10 md:px-70 text-center text-sm md:text-xl text-[#7E767E]">
          In just three simple steps, our platform transforms raw scans into
          actionable medical insights. Fast, Accurate, and Reliable.
        </p>
      </div>

      {/* Cards */}
      <div className="w-full relative z-30 flex flex-wrap items-center justify-center gap-10 md:gap-12 lg:gap-16 py-16 px-6 md:px-12">
        {workCards.map((card, index) => (
          <div
            key={index}
            className="work-card bg-[#6A1934] text-white flex flex-col items-center justify-center text-center 
                py-3 px-10 gap-6 w-[90%] sm:w-[70%] md:w-[42%] lg:w-[28%] 
                h-[380px] md:h-[420px] lg:h-[440px] 
                rounded-[3rem] transition-all relative overflow-hidden">

            <h1 className="absolute text-[160px] sm:text-[300px] top-0 left-0 font-medium opacity-6 text-white select-none">
              {card.number}
            </h1>
            <div className="bg-[#C9DCF6] w-30 h-30 flex items-center justify-center rounded-full relative z-10">
              <img className="w-18 h-18" src={card.icon} alt={card.heading} />
            </div>
            <div className="flex flex-col gap-3 relative z-10">
              <h2 className="text-2xl text-[#C9DCF6] font-bold">
                {card.heading}
              </h2>
              <p className="text-base md:text-lg text-[#EDEBFF]">
                {card.subHead}
              </p>
            </div>
          </div>
        ))}
      </div>

    </article>
  )
}

export default HowItWorks
