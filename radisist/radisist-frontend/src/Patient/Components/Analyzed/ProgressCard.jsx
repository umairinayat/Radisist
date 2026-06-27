import React from "react";
import { useNavigate } from "react-router-dom";
import { IoCheckmarkDoneOutline } from "react-icons/io5";
import uploadNew from "../../../Images/Icons/uploadnew.svg";
import viewNew from "../../../Images/Icons/viewnew.svg";

import FileNameIcon from "../../../Images/Icons/filename.svg"
import UploadedIcon from "../../../Images/Icons/uploaded.svg"
import StatusIcon from "../../../Images/Icons/status.svg"


const ProgressCard = ({ scanData }) => {
  const navigate = useNavigate();

  const fileName = scanData?.title || 'scan_file_chest.dcm';
  const uploadDate = scanData?.created_at
    ? new Date(scanData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Oct 15, 2025';

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_80px_rgba(0,0,0,0.03)] p-6 flex flex-col gap-5">
      <h1 className="text-[#15803D] bg-[#DCFCE7] px-4 py-3 text-lg font-semibold flex items-center gap-3 rounded-lg">
        <IoCheckmarkDoneOutline className="text-2xl" />
        Scan Successfully Processed
      </h1>

      <p className="text-gray-600 text-sm md:text-base">
        Your scan has been successfully analyzed by our AI system. The
        preliminary findings are now available in the report section on the
        right.
      </p>

      {/* File info box */}
      <div className="bg-[#F4F3F3] p-5 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Scan Preview Section - Now more concise and 'thumbnail' style */}
          {scanData?.image && (
            <div className="w-28 h-28 flex-shrink-0 relative rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-black flex items-center justify-center group">
              <img
                src={scanData.image}
                alt="Scan Preview"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
          )}

          <div className="flex flex-col md:flex-row flex-1 items-start md:items-center justify-between gap-6 w-full">
            <ul className="text-gray-700 text-[12px] md:text-sm lg:text-base space-y-2 flex-1">
              <li className="flex items-center gap-2" > <img src={StatusIcon} className="w-3" alt="" /> <strong>Status:</strong> Analysis Complete</li>
              {scanData?.patient_name && (
                <li className="flex items-center gap-2" > <IoCheckmarkDoneOutline className="text-[#15803D] w-3" /> <strong>Patient:</strong> {scanData.patient_name}</li>
              )}
              <li className="flex items-center gap-2" > <img src={FileNameIcon} className="w-3" alt="" /> <strong>File Name:</strong> {fileName}</li>
              <li className="flex items-center gap-2" > <img src={UploadedIcon} className="w-3" alt="" /> <strong>Uploaded:</strong> {uploadDate}</li>
            </ul>

            <div className="flex flex-col w-full md:w-auto gap-3">
              <button
                onClick={() => navigate('/userdashboard/upload')}
                className="px-5 md:px-6 bg-[#7B1E3D] hover:bg-[#5b122b] text-white font-medium py-2 rounded-lg flex  text-sm items-center justify-center gap-3 transition"
              >
                <img src={uploadNew} alt="upload new" className="w-6 h-6" />
                Upload new file
              </button>
              <button
                onClick={() => navigate('/userdashboard/scans')}
                className="px-5 md:px-6 border border-[#7B1E3D] hover:bg-[#f9e7ec] text-[#7B1E3D] font-medium py-2 text-sm  rounded-lg flex items-center justify-center gap-3 transition"
              >
                <img src={viewNew} alt="view all scans" className="w-5 h-5" />
                View all scans
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCard;
