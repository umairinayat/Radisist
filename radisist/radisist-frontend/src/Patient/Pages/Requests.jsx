import React, { useState, useEffect } from 'react';
import SectionHeader from '../Components/SectionHeader';
import { Send, Search, Clock } from 'lucide-react';

function Requests() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="py-8 min-h-screen">
      <div className={`transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <SectionHeader
          title="Review Requests"
          subtitle="Track the status of your scans sent for radiologist review."
        />
      </div>

      <div className={`mt-8 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#7d1f3f]/5 flex items-center justify-center text-[#7d1f3f] mb-6">
            <Send size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">No pending requests</h3>
          <p className="text-gray-500 font-medium max-w-sm">
            All your requests have been processed or you haven't sent any scans for review yet.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Requests;