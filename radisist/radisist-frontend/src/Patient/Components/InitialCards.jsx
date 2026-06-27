import React, { useState, useEffect } from "react";
import { Search, Filter, Eye, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import SectionHeader from "./SectionHeader";
import PendingRequests from "../Components/PendingRequests";
import CompletedReports from "./CompletedReports";
import QuickActionCard from "./QuickActionCard";
import { getUserProfile } from "../../api/login";
import { getScans } from "../../api/scans";
import { DashboardSkeleton } from "./SkeletonLoaders";

function InitialCards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [userData, setUserData] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profile, scansList] = await Promise.all([
          getUserProfile(),
          getScans()
        ]);
        setUserData(profile);
        setScans(scansList);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const recentActivity = scans.map(scan => ({
    date: new Date(scan.created_at).toLocaleDateString(),
    activity: scan.ai_generated ? "AI Analysis Complete" : "Uploaded",
    scan: scan.title || "Untitled Scan",
    status: scan.ai_generated ? "Completed" : "In Progress"
  }));

  const filteredData = recentActivity.filter((item) => {
    const matchesSearch = item.scan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus ? item.status.toLowerCase() === filterStatus.toLowerCase() : true;
    return matchesSearch && matchesFilter;
  });

  // Calculate dashboard stats
  const stats = {
    pendingRequests: scans.filter(s => !s.ai_generated).length,
    completedReports: scans.filter(s => s.ai_generated).length
  };

  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return { color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 };
      case "in progress":
        return { color: "text-blue-600 bg-blue-50", icon: Clock };
      case "pending":
        return { color: "text-amber-600 bg-amber-50", icon: AlertCircle };
      default:
        return { color: "text-gray-600 bg-gray-50", icon: AlertCircle };
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="py-8 min-h-screen">
      <div className={`transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <SectionHeader
          title={userData?.full_name ? `Welcome, ${userData.full_name}` : "Welcome Back"}
          subtitle="Here's a quick overview of your medical scanning activity and pending reviews."
        />
      </div>

      {/* ---- Top Cards Section ---- */}
      <section className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6 mb-12 items-stretch">
        <div className={`h-full transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <PendingRequests stats={stats} />
        </div>
        <div className={`h-full transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <CompletedReports stats={stats} />
        </div>
        <div className={`h-full transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <QuickActionCard />
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className={`transition-all duration-700 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-[#7d1f3f]">Recent Activity</h2>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7d1f3f] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search scans..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7d1f3f]/10 focus:border-[#7d1f3f] transition-all text-sm shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative w-full sm:w-40 group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7d1f3f]/10 focus:border-[#7d1f3f] transition-all text-sm shadow-sm cursor-pointer appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modern Activity Feed */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#7d1f3f] text-white">
                  <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider first:rounded-tl-2xl">Date</th>
                  <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider">Scan Information</th>
                  <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="py-5 px-6 text-xs font-bold uppercase tracking-wider text-right last:rounded-tr-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item, i) => {
                  const status = getStatusConfig(item.status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={i} className="hover:bg-gray-50/80 transition-all group">
                      <td className="py-5 px-6">
                        <p className="text-sm font-semibold text-gray-500">{item.date}</p>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-[#7d1f3f] transition-colors">{item.scan}</p>
                          <p className="text-xs text-gray-400 font-medium">{item.activity}</p>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${status.color} shadow-sm border border-current opacity-90`}>
                          <StatusIcon size={12} strokeWidth={3} />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100/50 text-gray-700 hover:bg-[#7d1f3f] hover:text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-sm active:scale-95 group-hover:shadow-md">
                          <Eye size={14} strokeWidth={2.5} />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default InitialCards;
