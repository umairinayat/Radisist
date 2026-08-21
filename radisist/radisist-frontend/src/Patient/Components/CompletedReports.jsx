import React from "react";
import { NavLink } from "react-router-dom";
import { FileCheck2 } from "lucide-react";

import "../../../src/index.css";

function CompletedReports({ stats }) {
  const numCompReports = stats.completedReports;

  return (
    <div id="CARD" className="p-8 bg-white flex flex-col gap-6 justify-between shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-gray-50 rounded-4xl h-full transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="bg-[#F1EEEE] px-4 py-1.5 rounded-xl font-bold text-[10px] text-gray-500">Completed Reports</h1>
        <div className="bg-[#7d1f3f]/10 w-10 h-10 rounded-2xl flex items-center justify-center text-[#7d1f3f]">
          <FileCheck2 size={20} strokeWidth={2.2} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[#7d1f3f] font-black text-7xl tracking-tighter">{numCompReports || 0}</h1>
        <p className="text-xs font-medium text-gray-400 w-1/3 text-right">Reports are ready for viewing</p>
      </div>
      <div className="flex items-center justify-end pt-2">
        <NavLink to="/userdashboard/reports" className="w-full">
          <button className="w-full btn-animate hover:bg-[#7d1f3f] hover:text-white cursor-pointer border-2 border-[#7d1f3f]/10 hover:border-[#7d1f3f] text-[#7d1f3f] px-6 py-3 text-xs rounded-2xl font-semibold transition-all">View Reports</button>
        </NavLink>
      </div>
    </div>
  );
}

export default CompletedReports;
