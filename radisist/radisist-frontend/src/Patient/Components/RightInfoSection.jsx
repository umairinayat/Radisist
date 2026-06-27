import React from 'react'

import Bulb from '../../Images/Icons/bulb.svg';
import Contact from '../../Images/Icons/contact.svg';
import QuestionMark from '../../Images/Icons/questionmark.svg';

function RightInfoSection() {
  return (
        <div className="flex flex-col items-center md:justify-center w-full h-full gap-7">
          <div className="bg-white px-10 py-8 flex flex-col gap-3 shadow-[0_2px_80px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2">
              <img className="w-8" src={Bulb} alt="Bulbimage" />
              <h1 className="text-lg font-semibold text-[#7B1E3D]">Helpful Tip</h1>
            </div>
            <p className="text-[#8E8E8E]">
              For the best results, ensure your CT scan files are anonymized to protect your privacy.
              You can ask your imaging center for an anonymized copy.
            </p>
          </div>

          <div className="bg-white px-10 py-8 flex flex-col gap-3 shadow-[0_2px_80px_rgba(0,0,0,0.03)]">
            <h1 className="text-lg font-semibold text-[#7B1E3D]">What is a CT scan?</h1>
            <p className="text-[#8E8E8E]">
              A computed tomography scan, formerly called computed axial tomography scan, is a medical imaging technique used to obtain detailed internal images of the body. The personnel that perform CT scans are called radiographers or radiology technologists.
            </p>
            <button className="btn-modern hover:bg-gray-200 cursor-pointer rounded-xl bg-[#F1EEEE] px-2 py-3 w-full shadow-[0_2px_80px_rgba(0,0,0,0.03)]">
              Read More
            </button>
          </div>

          <div className="bg-white px-10 py-8 flex flex-col gap-3 w-full">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#7B1E3D]">Need Help ?</h1>
            </div>
            <p className="text-[#8E8E8E] text-semibold flex items-center gap-3">
              <span><img src={QuestionMark} alt="" /></span> Read our FAQs
            </p>
            <p className="text-[#8E8E8E] text-semibold flex items-center gap-3">
              <span><img src={Contact} alt="" /></span> Contact Support
            </p>
          </div>
     </div>
  )
}

export default RightInfoSection