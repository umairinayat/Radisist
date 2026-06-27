import React from "react";
import { IoMdCheckmarkCircle } from "react-icons/io";
import { MdPending } from "react-icons/md";
import HLine from "../../Images/Icons/Line-21.svg";

function AnalyzedHeader() {
  return (
    <div className="w-full bg-white rounded-xl shadow-[0_2px_80px_rgba(0,0,0,0.03)] p-4 md:p-6">
      <div className="flex flex-wrap md:flex-nowrap items-start md:items-center justify-between">
        <Step
          icon={<IoMdCheckmarkCircle className="text-2xl text-[#15803D]" />}
          label="UPLOADED"
        />
        <Divider />
        <Step
          icon={<IoMdCheckmarkCircle className="text-2xl text-[#15803D]" />}
          label="ANALYZED"
        />
        <Divider />
        <Step
          icon={<MdPending className="text-2xl text-[#FFA413]" />}
          label="REVIEW"
        />
        <Divider />
        <Step
          icon={<MdPending className="text-2xl text-[#FFA413]" />}
          label="REPORT"
        />
      </div>
    </div>
  );
}

function Step({ icon, label }) {
  return (
    <div className="flex items-center flex-1 min-w-[110px] justify-center">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-black text-sm md:text-lg">
          {label}
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="hidden md:block flex-shrink-0 px-2">
      <img src={HLine} alt="divider" className="h-5 object-contain" />
    </div>
  );
}

export default AnalyzedHeader;
