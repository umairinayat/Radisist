import React from 'react'

import { AiOutlineExclamationCircle } from "react-icons/ai";

function DisclaimerCard() {
  return (
    <div className='flex p-6 gap-4 items-center justify-center text-base font-medium bg-[#FEFBF0] border-3 rounded-2xl border-[#DAAE56] md:mb-20 shadow-[0_2px_80px_rgba(0,0,0,0.03)]' >
        <div>
            <AiOutlineExclamationCircle className='text-4xl text-[#DAAE56]' />
        </div>
        <div>
            <h3 className='text-[#DAAE56]' ><span className='font-bold' >Disclaimer:</span> AI results are provided for informational purposes only and should not replace a professional medical diagnosis.</h3>
        </div>
    </div>
  )
}

export default DisclaimerCard