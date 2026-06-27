import React from "react";
import '../../../../src/index.css';


import { LuTriangleAlert } from "react-icons/lu";
import { LuDot } from "react-icons/lu";
import { CiMedicalCross } from "react-icons/ci";
import plusDoctor from "../../../Images/Icons/plusdoctor.svg"

const RightSection = ({ scanData }) => {
  const normalize = (val) => {
    if (val === undefined || val === null) return 0;
    const num = parseFloat(val);
    // If value is <= 1, it's likely a decimal (0.985), so convert to percentage.
    // If > 1, it's already a percentage (98.5).
    return num <= 1 ? num * 100 : num;
  };

  const fileName = scanData?.title || 'scan_file_chest.dcm';
  const rawConfidence = normalize(scanData?.ai_confidence ?? 89);
  const confidence = Number.isInteger(rawConfidence) ? rawConfidence : rawConfidence.toFixed(1);
  const impression = scanData?.report?.impression || 'No impression provided by AI.';
  const predictedClass = scanData?.ai_predicted_class || 'Benign';
  // Logic: IF CONFIDENCE LESS THAN 50 THEN NO RECOMMENED ELSE RECOMMENDED
  const recommendation = rawConfidence >= 50 ? 'YES' : 'NO';
  const patientName = scanData?.patient_name || 'Anonymous Patient';

  return (
    <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-[0_2px_80px_rgba(0,0,0,0.03)] h-fit px-10 py-12 flex flex-col gap-2">
      <h1 className="font-bold text-2xl text-center" >Scan Report</h1>

      {/* Top Heading */}
      <div className="flex flex-col mt-10 gap-5" >
        <div className="border-b border-gray-50 pb-3">
          <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em] mb-1" >Patient Identification</h3>
          <h1 className="text-xl font-bold text-[#8B2B4B]">{patientName}</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em] mb-1" >Scan Type</h3>
            <h1 className="text-sm font-semibold text-gray-700">{scanData?.scan_type || "CT SCAN"}</h1>
          </div>
          <div className="text-right">
            <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em] mb-1" >Record ID</h3>
            <h1 className="text-sm font-semibold text-gray-700">#{scanData?.id || 'N/A'}</h1>
          </div>
        </div>
        <div>
          <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em] mb-1" >File Name</h3>
          <h1 className="text-sm font-medium text-gray-500 truncate">{fileName}</h1>
        </div>
      </div>

      {/* Alert Message */}
      <div className={`flex items-center gap-5 px-5 py-6 mt-5 rounded-2xl border-2 ${recommendation === 'YES' ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-green-50 border-green-200'}`} >
        <div>
          <LuTriangleAlert className={`${recommendation === 'YES' ? 'text-[#B91C1C]' : 'text-green-600'} font-bold text-3xl`} />
        </div>
        <div>
          <h2 className={`${recommendation === 'YES' ? 'text-[#B91C1C]' : 'text-green-700'} font-medium text-base`} >Recommended for Review</h2>
          <h3 className={`${recommendation === 'YES' ? 'text-[#B91C1C]' : 'text-green-800'} font-bold text-base`} >{recommendation}</h3>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="flex justify-between items-center bg-[#8B2B4B] mt-5 px-6 py-2 rounded-lg text-base font-semibold text-white" >
        <h3>AI Confidence Score</h3>
        <h3>{confidence}%</h3>
      </div>

      {/* Patient Data - from scan description */}
      <div className="flex flex-col gap-3 mt-4" >
        <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em]">Patient Clinical Data</h3>
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-700 italic">
            "{scanData?.description || "No specific clinical notes provided."}"
          </p>
        </div>
      </div>

      {/* Predicted Classification */}
      <div className="flex flex-col gap-2 mt-4" >
        <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em]">Predicted Classification</h3>
        <div className={`text-2xl font-black ${predictedClass === 'Malignant' ? 'text-red-600' : 'text-green-600'}`}>
          {predictedClass}
        </div>
      </div>

      {/* Reasoning div */}
      <div className="flex flex-col gap-2 mt-4" >
        <h3 className="text-[#8E8E8E] text-[11px] font-bold uppercase tracking-[0.1em]" >AI Impression</h3>
        <div className="bg-[#F4F3F3] p-5 rounded-2xl" >
          <p className="text-sm font-medium text-gray-800">{impression}</p>
        </div>
      </div>

      <button className="flex items-center justify-center gap-4 bg-[#8B2B4B] px-4 py-4 mt-5 text-white font-medium cursor-pointer hover:bg-[#5f152e] rounded-xl" >
        <img src={plusDoctor} alt="Radiologist" />
        Radiologist Review
      </button>

    </div>
  );
};

export default RightSection;
