import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar (fixed on desktop, toggle on mobile) */}
      <div className="fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content — scrollable */}
      <main
        className="
          flex flex-col 
          w-full 
          min-h-screen 
          bg-[#F1F7FF] 
          overflow-y-auto
          lg:ml-[370px]    /* Margin only on large screens */
        "
      >
        <div className="bg-[#F1F7FF] pt-24 lg:pt-10 px-6 lg:px-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
