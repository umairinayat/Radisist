import React, { useState, useEffect } from 'react';
import SectionHeader from '../Components/SectionHeader';
import { Send, Search, Clock, CheckCircle2, Eye, ShieldAlert } from 'lucide-react';
import { getScans } from '../../api/scans';
import { useNavigate } from 'react-router-dom';
import { ScansSkeleton } from '../Components/SkeletonLoaders';

function formatLabel(value) {
  if (!value) return "Not available";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function Requests() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const data = await getScans();
        // Filter scans where review is requested
        const reviewScans = data.filter(scan => {
          const safety = scan.safety || scan.analysis_metadata?.safety;
          const isManual = scan.analysis_metadata?.manual_review_requested;
          return safety?.needs_radiologist_review || isManual;
        });
        setScans(reviewScans);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error fetching review requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  const getReviewStatus = (scan) => {
    const report = scan.report;
    if (report && report.is_final) {
      return { label: "Finalized", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 };
    }
    if (report && (report.radiologist || report.radiologist_name || report.radiologist_id)) {
      return { label: "Under Review", color: "text-blue-700 bg-blue-50 border-blue-200", icon: Clock };
    }
    return { label: "Awaiting Review", color: "text-amber-700 bg-amber-50 border-amber-200", icon: ShieldAlert };
  };

  const filteredScans = scans.filter(scan => 
    (scan.title || "Untitled Scan").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (scan.routed_modality || scan.scan_type || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <ScansSkeleton />;
  }

  return (
    <div className="py-8 min-h-screen">
      <div className={`transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <SectionHeader
          title="Review Requests"
          subtitle="Track the status of your scans sent for professional radiologist audit."
        />
      </div>

      <div className={`mt-8 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {scans.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#7d1f3f]/5 flex items-center justify-center text-[#7d1f3f] mb-6">
              <Send size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">No review requests</h3>
            <p className="text-gray-500 font-medium max-w-sm">
              You haven't submitted any scans for manual radiologist audit yet. Request review on any scan inside the Analysis workspace.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7d1f3f] transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search requests..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7d1f3f]/10 focus:border-[#7d1f3f] transition-all text-sm shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{filteredScans.length} requests found</span>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#7d1f3f] text-white">
                      <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider first:rounded-tl-2xl">Date Sent</th>
                      <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider">Scan / Modality</th>
                      <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider">Review Status</th>
                      <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider text-right last:rounded-tr-2xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredScans.map((scan) => {
                      const status = getReviewStatus(scan);
                      const StatusIcon = status.icon;
                      return (
                        <tr key={scan.id} className="hover:bg-gray-50/50 transition-all group">
                          <td className="py-5 px-6">
                            <p className="text-sm font-semibold text-gray-500">
                              {new Date(scan.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col gap-0.5">
                              <p className="text-sm font-bold text-gray-900 group-hover:text-[#7d1f3f] transition-colors">
                                {scan.title || `Scan #${scan.id}`}
                              </p>
                              <p className="text-xs text-gray-400 font-medium">
                                {formatLabel(scan.routed_modality || scan.scan_type)}
                              </p>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${status.color}`}>
                              <StatusIcon size={12} strokeWidth={2.5} />
                              {status.label}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <button
                              onClick={() => navigate('/userdashboard/analyzed', { state: { scanData: scan } })}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100/50 text-gray-700 hover:bg-[#7d1f3f] hover:text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-sm active:scale-95 group-hover:shadow-md cursor-pointer"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                              Workspace
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Requests;