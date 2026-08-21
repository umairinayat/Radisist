import React from "react";
import { NavLink } from "react-router-dom";
import { Archive, Zap } from "lucide-react";

import "../../../src/index.css";

function QuickActionCard() {
  return (
    <div id="CARD" className="p-8 bg-white flex flex-col gap-6 justify-between shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-gray-50 rounded-4xl h-full transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="bg-[#F1EEEE] px-4 py-1.5 rounded-xl font-bold text-[10px] text-gray-500">Quick Actions</h1>
        <div className="bg-[#7d1f3f]/10 w-10 h-10 rounded-2xl flex items-center justify-center text-[#7d1f3f]">
          <Zap size={20} strokeWidth={2.2} />
        </div>
      </div>
      <h4 className="text-[10px] font-bold text-gray-300 pt-2">Access important tools and shortcuts here.</h4>
      <div className="flex flex-col items-center justify-end gap-3 mt-auto w-full">
        <NavLink to="/userdashboard/upload" className="w-full">
          <button className="btn-animate flex items-center justify-center gap-4 border-2 border-[#7d1f3f]/10 text-[#7d1f3f] px-6 py-3 text-xs font-semibold rounded-2xl w-full hover:bg-[#7d1f3f] hover:text-white cursor-pointer transition-all">
            <Zap size={18} />
            New Scan
          </button>
        </NavLink>
        <NavLink to="/userdashboard/scans" className="w-full">
          <button className="btn-animate flex items-center justify-center gap-4 border-2 border-[#7d1f3f]/10 text-[#7d1f3f] px-6 py-3 text-xs font-semibold rounded-2xl w-full hover:bg-[#7d1f3f] hover:text-white cursor-pointer transition-all">
            <Archive size={18} />
            My Archive
          </button>
        </NavLink>
      </div>
    </div>
  );
}

export default QuickActionCard;
