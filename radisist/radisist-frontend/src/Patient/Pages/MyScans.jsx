import React, { useState, useEffect } from 'react';
import SectionHeader from '../Components/SectionHeader';
import { FolderOpen, ArrowRight, Loader2, FileText, CheckCircle, Clock } from 'lucide-react';
import { getScans } from '../../api/scans';
import { useNavigate } from 'react-router-dom';
import { ScansSkeleton } from '../Components/SkeletonLoaders';

function MyScans() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const data = await getScans();
        setScans(data);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error fetching scans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  if (loading) {
    return <ScansSkeleton />;
  }

  return (
    <div className="py-8 min-h-screen">
      <div className={`transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <SectionHeader
          title="My Scans"
          subtitle="View and manage all your uploaded medical imaging and their status."
        />
      </div>

      <div className={`mt-8 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {scans.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#7d1f3f]/5 flex items-center justify-center text-[#7d1f3f] mb-6">
              <FolderOpen size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">No scans found</h3>
            <p className="text-gray-500 font-medium max-w-sm mb-8">
              You haven't uploaded any CT scans yet. Start by uploading your first scan for analysis.
            </p>
            <button
              onClick={() => navigate('/userdashboard/upload')}
              className="btn-animate inline-flex items-center gap-3 px-8 py-4 bg-[#7d1f3f] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md hover:bg-[#6a1a36] hover:shadow-lg active:scale-95"
            >
              Upload First Scan
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => navigate('/userdashboard/analyzed', { state: { scanData: scan } })}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-gray-50 rounded-2xl text-[#7d1f3f] group-hover:bg-[#7d1f3f] group-hover:text-white transition-colors">
                    <FileText size={24} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${scan.ai_generated ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {scan.ai_generated ? <CheckCircle size={10} /> : <Clock size={10} />}
                    {scan.ai_generated ? 'Analyzed' : 'In Progress'}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 truncate mb-1">{scan.title || "Untitled Scan"}</h4>
                <p className="text-xs text-gray-400 font-medium mb-4">{new Date(scan.created_at).toLocaleDateString()}</p>
                <div className="flex items-center gap-2 text-[#7d1f3f] text-xs font-bold uppercase tracking-widest pt-4 border-t border-gray-50">
                  View Report <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyScans;