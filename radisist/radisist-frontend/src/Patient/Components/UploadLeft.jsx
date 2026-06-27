import React from 'react';

import fileUploadScan from "../../Images/Icons/fileUploadScan.svg";
import MedicalPlus from "../../Images/Icons/medicalplus.png";
import LaptopProtect from "../../Images/Icons/laptopprotect.png";
import ClickScan from "../../Images/Icons/clickscan.png";

function UploadLeft({ onFileUpload }) {
  const handleClick = () => {
    document.getElementById('fileInput').click();
  };

  return (
    <div className="bg-white w-full rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center shadow-[0_2px_80px_rgba(0,0,0,0.03)]">

      {/* Upload Drop Zone */}
      <div
        className="w-full h-[180px] sm:h-[220px] border-2 border-dashed border-gray-400 rounded-3xl flex items-center justify-center flex-col gap-2 hover:bg-[#F5F5F5] transition-all duration-300 cursor-pointer"
        onClick={handleClick}
      >
        <img className="w-10 sm:w-12" src={fileUploadScan} alt="upload scan" />
        <p className="text-[#A3A3A3] text-xs sm:text-sm md:text-lg font-medium text-center">
          Drag & Drop your file or{" "}
          <span className="text-[#7B1E3D] font-semibold cursor-pointer hover:underline">
            Browse
          </span>
        </p>
        <p className="text-[10px] sm:text-xs text-[#CDCDCD] text-center">
          Supported formats: DICOM, Ntfls
        </p>

        {/* Hidden input for file upload */}
        <input
          type="file"
          id="fileInput"
          className="hidden"
          onChange={onFileUpload}
        />
      </div>

      {/* How to Upload Section */}
      <div className="flex flex-col gap-4 mt-8 w-full items-center md:items-start">
        <h1 className="text-lg md:text-xl font-semibold text-[#2E2E2E]">How to Upload?</h1>

        {/* Step 1 */}
        <div className="bg-[#F8F8F8] flex items-center sm:items-start px-4 py-5 gap-4 rounded-xl w-full">
          <img src={MedicalPlus} alt="step1" className="w-10 sm:w-12" />
          <div>
            <h2 className="text-[#7B1E3D] font-medium text-sm md:text-base">Select your files</h2>
            <h3 className="text-[#8F8F8F] text-xs md:text-sm">
              Click the “Browse” button or drag and drop files from your system.
            </h3>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#F8F8F8] flex items-center sm:items-start px-4 py-5 gap-4 rounded-xl w-full">
          <img src={LaptopProtect} alt="step2" className="w-10 sm:w-12" />
          <div>
            <h2 className="text-[#7B1E3D] font-medium text-sm md:text-base">Secure Upload</h2>
            <h3 className="text-[#8F8F8F] text-xs md:text-sm">
              Your files are safely encrypted and processed instantly.
            </h3>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#F8F8F8] flex items-center sm:items-start px-4 py-5 gap-4 rounded-xl w-full">
          <img src={ClickScan} alt="step3" className="w-10 sm:w-12" />
          <div>
            <h2 className="text-[#7B1E3D] font-medium text-sm md:text-base">Submit for Analysis</h2>
            <h3 className="text-[#8F8F8F] text-xs md:text-sm">
              Once uploaded, your scan will be analyzed automatically.
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadLeft;
