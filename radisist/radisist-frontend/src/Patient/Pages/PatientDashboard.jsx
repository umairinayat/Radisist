import React from 'react';
import Sidebar from '../Components/Sidebar';
import PatientHeader from '../Components/PatientHeader';
import { Outlet } from 'react-router-dom';

function PatientDashboard() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar on the left */}
      <Sidebar />

      {/* Main content on the right */}
      <div className="flex-1 flex flex-col">
        
        {/* This will render nested routes like Upload, Reports, etc. */}
        <main className='px-10 bg-[#F1F7FF] '>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PatientDashboard;
