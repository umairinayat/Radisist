import React from 'react';
import HeroLayout from './HeroLayout';
import InfiniteBar from '../Components/InfiniteBar';
import MissionLayout from './MissionLayout';
import HowItWorks from './HowItWorks';
import HealthcareReimagined from './HealthcareReimagined';
import FutureSection from './FutureSection';

function MainLayout() {
  return (
    <div className="w-full bg-[#FFFDFE] text-[#17121A] selection:bg-[#780F32]/10 selection:text-[#780F32]">
      {/* Interactive Hero section */}
      <HeroLayout />
      
      {/* Moving text ticker */}
      <InfiniteBar />
      
      {/* Our Mission section */}
      <MissionLayout />
      
      {/* How it works layout */}
      <HowItWorks />
      
      {/* Healthcare Reimagined layout */}
      <HealthcareReimagined />
      
      {/* Future Call-to-action layout */}
      <FutureSection />
    </div>
  );
}

export default MainLayout;