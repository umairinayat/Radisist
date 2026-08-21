import React from 'react';
import Sidebar from '../Components/Sidebar';
import PatientHeader from '../Components/PatientHeader';
import { Outlet } from 'react-router-dom';

function PatientDashboard() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar on the left */}
      <Sidebar />

      {/* Main content on the right */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <main className='px-4 md:px-6 py-6 bg-[#F1F7FF] min-h-full'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PatientDashboard;
