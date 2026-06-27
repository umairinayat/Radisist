import React, { useState, useEffect } from 'react';
import '../../../src/index.css';

import { useLocation, useNavigate } from 'react-router-dom';
import { FaRegCircleCheck } from "react-icons/fa6";
import { FaSpinner } from "react-icons/fa";

import RightInfoSection from './RightInfoSection';

function UploadSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const scanData = location.state?.scanData;
  const fileName = scanData?.title || location.state?.fileName || 'Your file';

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPleaseWait, setShowPleaseWait] = useState(false);

  useEffect(() => {
    let interval;
    if (isAnalyzing && progress < 100) {
      interval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.floor(Math.random() * 15) + 5; // random speed
          const next = prev + increment;
          return next >= 100 ? 100 : next;
        });
      }, 800);
    } else if (progress === 100) {
      setShowPleaseWait(true);
      setTimeout(() => {
        navigate('/userdashboard/analyzed', { state: { scanData } }); // navigate with real scan data
      }, 2000); // Wait 2s after completion
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, progress, navigate, scanData]);

  const handleStart = () => {
    setIsAnalyzing(true);
  };

  const getProcessingMessage = (p) => {
    if (p < 20) return "Initializing AI Engine...";
    if (p < 40) return "Scanning for anatomical markers...";
    if (p < 60) return "Analyzing tissue density & anomalies...";
    if (p < 80) return "Cross-referencing medical database...";
    if (p < 95) return "Refining results and generating report...";
    return "Finalizing insights...";
  };

  return (
    <section className='bg-[#F1F7FF] min-h-screen flex flex-col md:flex-row gap-10 py-5'>
      <div className="md:w-1/2 w-full bg-white rounded-3xl p-6 md:p-10 flex flex-col gap-8 shadow-sm">
        <h1 className='text-3xl font-black text-[#7B1E3D] tracking-tight'>Upload Complete</h1>

        <div className='flex items-center bg-[#DCFCE7] px-7 py-4 rounded-2xl text-[#196736] gap-6 font-bold shadow-sm border border-emerald-100'>
          <FaRegCircleCheck className='text-xl' />
          <h3 className="truncate">{fileName}</h3>
        </div>

        <div className="space-y-4">
          <p className='text-base text-[#525252] font-medium'>
            We've successfully received your medical scan. Your data is now secured and ready for our advanced AI to perform a detailed assessment.
          </p>
          <p className='text-sm text-[#8E8E8E]'>
            Our system is designed to act as a precision assistant, scanning every pixel for subtle markers that help in early detection and accurate classification.
          </p>
        </div>

        <div className='text-sm flex flex-col justify-center gap-1 bg-gray-50/50 p-6 rounded-2xl border border-gray-100'>
          <h1 className='mb-5 font-bold text-lg text-[#7B1E3D] flex items-center gap-2'>
            <div className="w-2 h-2 rounded-full bg-[#7B1E3D]" />
            What to Expect
          </h1>
          <div className="space-y-4">
            <p className='text-[#666] flex gap-3 text-sm'> <span className='font-bold text-[#7B1E3D] not-italic'>•</span> Your scan undergoes a multi-layered verification process.</p>
            <p className='text-[#666] flex gap-3 text-sm'> <span className='font-bold text-[#7B1E3D] not-italic'>•</span> We calculate probabilities with deep-learning precision.</p>
            <p className='text-[#666] flex gap-3 text-sm'> <span className='font-bold text-[#7B1E3D] not-italic'>•</span> A finalized report will be generated for your immediate review.</p>
          </div>
        </div>

        <div className='flex flex-col gap-4 mt-auto'>
          <button
            onClick={handleStart}
            disabled={isAnalyzing}
            className={`flex items-center justify-center gap-3 bg-[#7B1E3D] hover:bg-[#5b122b] text-white font-bold rounded-2xl py-6 text-lg shadow-lg shadow-[#7B1E3D]/10 active:scale-[0.98] transition-all ${isAnalyzing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isAnalyzing ? (
              <>
                <FaSpinner className='animate-spin text-xl' />
                Generating Comprehensive Report...
              </>
            ) : (
              'Generate AI Report'
            )}
          </button>

          {/* Progress Section */}
          <div className="min-h-[80px]">
            {isAnalyzing && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-end mb-2">
                  <p className='text-[13px] font-bold text-[#7B1E3D] uppercase tracking-widest animate-pulse'>
                    {getProcessingMessage(progress)}
                  </p>
                  <span className="text-sm font-black text-gray-400">{progress}%</span>
                </div>

                <div className='w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200 p-1'>
                  <div
                    className='bg-gradient-to-r from-[#7B1E3D] to-[#B91C1C] h-full rounded-full transition-all duration-500 shadow-inner'
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                {showPleaseWait && (
                  <p className='text-[13px] text-[#7B1E3D] font-black mt-3 flex items-center gap-2 italic'>
                    <FaSpinner className='animate-spin text-[10px]' />
                    Finalizing report data, please do not refresh...
                  </p>
                )}
              </div>
            )}

            {!isAnalyzing && (
              <p className='text-sm text-[#8E8E8E] font-medium text-center italic'>
                Safe and encrypted processing of medical imaging data.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className='UPLOADDED LEFT md:w-1/2 w-full'>
        <RightInfoSection />
      </div>
    </section>
  );
}

export default UploadSuccess;


// <section className="bg-[#F1F7FF] min-h-screen flex flex-col items-center justify-center text-center p-6">
//   <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full flex flex-col gap-6">
//     <h1 className="text-2xl md:text-3xl font-black text-[#7B1E3D]">
//       Scan Uploaded Successfully!
//     </h1>
//     <p className="text-[#707070] text-sm md:text-base">
//       <span className="font-semibold">{fileName}</span> has been uploaded successfully.
//     </p>
//     <p className="text-[#707070] text-sm md:text-base">
//       Our system will now analyze your scan. You’ll be notified when your report is ready.
//     </p>

//     <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
//       <button
//         onClick={() => navigate('/upload')}
//         className="bg-[#7B1E3D] hover:bg-[#5e162f] text-white px-5 py-3 rounded-lg font-medium transition"
//       >
//         Upload Another
//       </button>
//       <button
//         onClick={() => navigate('/scans')}
//         className="border border-[#7B1E3D] text-[#7B1E3D] hover:bg-[#7B1E3D] hover:text-white px-5 py-3 rounded-lg font-medium transition"
//       >
//         View My Scans
//       </button>
//     </div>
//   </div>
// </section>