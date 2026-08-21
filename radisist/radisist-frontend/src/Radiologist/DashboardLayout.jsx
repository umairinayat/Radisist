import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle,
  Clock,
  FileDown,
  FileText,
  Loader2,
  LogOut,
  Save,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
  UploadCloud,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logoutUser } from "../api/logout";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { acceptScanCase, getScans } from "../api/scans";
import { exportReportPdf, finalizeReport, updateReport } from "../api/reports";

const filters = ["All", "Needs Review", "Accepted", "Finalized"];

function formatLabel(value) {
  if (!value) {
    return "Not available";
  }
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPercent(value) {
  if (value == null) {
    return "-";
  }
  const numeric = Number(value);
  const normalized = numeric <= 1 ? numeric * 100 : numeric;
  return `${normalized.toFixed(1)}%`;
}

function getSafety(scan) {
  return scan?.safety || scan?.analysis_metadata?.safety || scan?.report?.structured_report?.safety || {};
}

// Case Status Helper
function getCaseStatus(scan) {
  if (scan?.report?.is_final) {
    return "Finalized";
  }
  if (scan?.report?.radiologist || scan?.report?.radiologist_name) {
    return "Accepted";
  }
  if (getSafety(scan)?.needs_radiologist_review) {
    return "Needs Review";
  }
  return "Awaiting Review";
}

// Status styles mapping
function statusStyles(status) {
  switch (status) {
    case "Finalized":
      return "bg-emerald-50 text-emerald-700 border-emerald-100/80";
    case "Accepted":
      return "bg-blue-50 text-blue-700 border-blue-100/80";
    case "Needs Review":
      return "bg-amber-50 text-amber-700 border-amber-100/80";
    default:
      return "bg-neutral-50 text-neutral-600 border-neutral-100/80";
  }
}

function toBase64Src(value) {
  if (!value) return "";
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

// Reusable Patient Case Card Component
function CaseCard({ scan, active, onClick }) {
  const status = getCaseStatus(scan);
  const safety = getSafety(scan);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border text-left transition-all duration-300 relative overflow-hidden p-5 outline-none ${
        active
          ? "border-[#780F32] bg-[#FDF9FA] shadow-[0_12px_25px_rgba(120,15,50,0.06)] scale-[1.01]"
          : "border-neutral-100 bg-white hover:border-neutral-200/80 hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)] hover:-translate-y-[1px]"
      }`}
    >
      {/* Active Sidebar Stripe Accent */}
      {active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#780F32] rounded-r-md" />}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {formatLabel(scan.routed_modality || scan.scan_type)}
          </p>
          <h3 className="mt-2 truncate text-base font-bold text-neutral-900">{scan.title || `Scan #${scan.id}`}</h3>
          <p className="mt-1 text-sm text-neutral-500">{scan.patient_name || "Patient unavailable"}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles(status)}`}>
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-50/50 border border-neutral-100/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">AI Label</p>
          <p className="mt-1.5 text-sm font-bold text-[#780F32]">{formatLabel(scan.display_prediction || scan.ai_predicted_class)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50/50 border border-neutral-100/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Confidence</p>
          <p className="mt-1.5 text-sm font-bold text-neutral-800">{formatPercent(scan.ai_confidence)}</p>
        </div>
      </div>

      {safety?.needs_radiologist_review && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800">
          {safety.warnings?.[0] || "Low-confidence safety gate triggered."}
        </div>
      )}
    </button>
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftImpression, setDraftImpression] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeLayer, setActiveLayer] = useState("original");

  const userName = localStorage.getItem("full_name") || "Radiologist";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const loadScans = async () => {
    setError("");
    try {
      const data = await getScans();
      const nextScans = data || [];
      setScans(nextScans);
      setSelectedScan((current) => {
        if (!current) {
          return nextScans[0] || null;
        }
        return nextScans.find((scan) => scan.id === current.id) || nextScans[0] || null;
      });
    } catch (loadError) {
      setError(loadError.response?.data?.error || "Unable to load radiology cases.");
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const [items, countPayload] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(items || []);
      setUnreadCount(countPayload?.count || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadScans();
    loadNotifications();
  }, []);

  useEffect(() => {
    setDraftContent(selectedScan?.report?.content || selectedScan?.report?.structured_report?.summary || "");
    setDraftImpression(selectedScan?.report?.impression || selectedScan?.report?.structured_report?.summary || "");
    setActiveLayer("original");
  }, [selectedScan?.id, selectedScan?.report]);

  const filteredScans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scans.filter((scan) => {
      const status = getCaseStatus(scan);
      const matchesFilter = activeFilter === "All" || status === activeFilter;
      const searchable = [
        scan.title,
        scan.patient_name,
        scan.routed_modality,
        scan.disease_model,
        scan.ai_predicted_class,
        scan.display_prediction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [activeFilter, scans, searchQuery]);

  const stats = useMemo(() => {
    const finalized = scans.filter((scan) => scan.report?.is_final).length;
    const accepted = scans.filter((scan) => !scan.report?.is_final && (scan.report?.radiologist || scan.report?.radiologist_name)).length;
    const needsReview = scans.filter((scan) => getSafety(scan)?.needs_radiologist_review && !scan.report?.is_final).length;
    return { finalized, accepted, needsReview, total: scans.length };
  }, [scans]);

  const previewImageSrc = useMemo(() => {
    if (!selectedScan) return "";
    if (activeLayer === "segmentation" && selectedScan.segmentation_overlay_base64) {
      return toBase64Src(selectedScan.segmentation_overlay_base64);
    }
    if (activeLayer === "heatmap" && selectedScan.xai_heatmap_base64) {
      return toBase64Src(selectedScan.xai_heatmap_base64);
    }
    return selectedScan.image;
  }, [selectedScan, activeLayer]);

  const replaceScan = (nextScan) => {
    setScans((current) => current.map((scan) => (scan.id === nextScan.id ? nextScan : scan)));
    setSelectedScan(nextScan);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      localStorage.clear();
    }
    navigate("/login");
  };

  const handleAcceptCase = async () => {
    if (!selectedScan) {
      return null;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const nextScan = await acceptScanCase(selectedScan.id);
      replaceScan(nextScan);
      setNotice("Case accepted. You can now edit and finalize the report.");
      return nextScan;
    } catch (acceptError) {
      setError(acceptError.response?.data?.error || "Unable to accept this case.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const ensureAcceptedScan = async () => {
    if (selectedScan?.report?.radiologist || selectedScan?.report?.radiologist_name) {
      return selectedScan;
    }
    return handleAcceptCase();
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const scan = await ensureAcceptedScan();
      if (!scan?.report?.id) {
        throw new Error("Report was not created for this case.");
      }
      const report = await updateReport(scan.report.id, {
        content: draftContent,
        impression: draftImpression,
        is_final: false,
      });
      const nextScan = { ...scan, report };
      replaceScan(nextScan);
      setNotice("Draft saved for radiologist review.");
    } catch (saveError) {
      setError(saveError.response?.data?.error || saveError.message || "Unable to save report draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const scan = await ensureAcceptedScan();
      if (!scan?.report?.id) {
        throw new Error("Report was not created for this case.");
      }
      await finalizeReport(scan.report.id, {
        content: draftContent,
        impression: draftImpression,
        structured_report: scan.report.structured_report,
      });
      setNotice("Report finalized and final summary sent to the patient workspace.");
      await loadScans();
      await loadNotifications();
    } catch (finalizeError) {
      setError(finalizeError.response?.data?.error || finalizeError.message || "Unable to finalize report.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedScan?.report?.id) {
      return;
    }

    setError("");
    setNotice("");
    try {
      const blob = await exportReportPdf(selectedScan.report.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `radisist-report-${selectedScan.report.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice("Finalized report PDF exported.");
    } catch (exportError) {
      setError(exportError.response?.data?.error || "Only finalized reports can be exported as PDF.");
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        await loadNotifications();
      } catch {
        // Non-critical for notification flow
      }
    }
    if (notification.scan) {
      const scan = scans.find((item) => item.id === notification.scan);
      if (scan) {
        setSelectedScan(scan);
      }
    }
    setNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch {
      setError("Unable to update notifications.");
    }
  };

  const selectedSafety = getSafety(selectedScan);
  const selectedStatus = getCaseStatus(selectedScan);
  const patientContext = selectedScan?.patient_context || selectedScan?.analysis_metadata?.clinical_context || {};
  const citations = selectedScan?.report?.structured_report?.evidence_citations || [];
  const modelVersions = selectedScan?.model_versions || selectedScan?.analysis_metadata?.model_versions || {};

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDFE] text-[#780F32]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDFE] relative overflow-hidden font-normal text-[#17121A]">
      {/* Dynamic Background Blur Layers */}
      <div className="bg-[#780F32]/5 w-[500px] h-[500px] rounded-full blur-[120px] fixed top-[-200px] right-[-200px] pointer-events-none z-0" />
      <div className="bg-[#C9DCF6]/10 w-[600px] h-[600px] rounded-full blur-[150px] fixed bottom-[-300px] left-[-300px] pointer-events-none z-0" />

      {/* Glassmorphic Navbar Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-md sm:px-6 lg:px-8 relative">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#780F32]/80">Radisist Review Desk</p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Radiologist Dashboard</h1>
            <p className="mt-1 text-sm text-neutral-500">Claim AI-assisted cases, edit draft reports, and send final summaries to patients.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/radiologist/upload")}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#780F32] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#63172f] shadow-sm"
            >
              <UploadCloud size={16} /> Upload Scan
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-2xl border border-neutral-100 bg-white p-3 text-neutral-500 transition-all duration-200 hover:text-[#780F32] hover:border-[#780F32]/30"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-14 z-50 w-[min(92vw,380px)] rounded-[1.5rem] border border-neutral-100 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-neutral-50">
                    <h3 className="text-sm font-bold text-neutral-900">Notifications</h3>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-bold text-[#780F32] hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="mt-3 max-h-80 space-y-2 overflow-auto no-scrollbar">
                    {notifications.length ? (
                      notifications.slice(0, 8).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`block w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                            notification.is_read ? "bg-neutral-50/50 text-neutral-600" : "bg-amber-50/60 text-amber-800"
                          }`}
                        >
                          <p className="font-semibold text-neutral-900">{notification.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-90">{notification.message}</p>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-xl bg-neutral-50/50 px-4 py-6 text-center text-xs text-neutral-400">
                        No notifications yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-100 bg-white px-4 py-3 text-sm font-bold text-neutral-500 transition-all duration-200 hover:border-rose-100 hover:bg-rose-50/50 hover:text-rose-600"
            >
              <LogOut size={16} /> Logout
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#780F32] to-[#5C0A25] text-sm font-semibold text-white shadow-md shadow-[#780F32]/10">
              {initials || <User size={18} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 relative z-10">
        {(error || notice) && (
          <div className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-semibold ${
            error ? "border-red-100 bg-red-50/60 text-red-700" : "border-emerald-100 bg-emerald-50/60 text-emerald-700"
          }`}>
            {error || notice}
          </div>
        )}

        {/* Top Statistics Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { label: "Total Cases", value: stats.total, icon: FileText, tone: "text-[#780F32]" },
            { label: "Needs Review", value: stats.needsReview, icon: ShieldAlert, tone: "text-amber-600" },
            { label: "Accepted", value: stats.accepted, icon: Clock, tone: "text-blue-600" },
            { label: "Finalized", value: stats.finalized, icon: CheckCircle, tone: "text-emerald-600" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-[1.75rem] border border-neutral-100 bg-white/75 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_15px_30px_rgba(120,15,50,0.03)] hover:-translate-y-[2px]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{card.label}</p>
                  <Icon className={card.tone} size={20} />
                </div>
                <p className="mt-4 text-3xl font-bold text-neutral-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Sidebar & Core Panel Grid */}
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
          
          {/* LEFT COLUMN: Cases List */}
          <section className="rounded-[1.75rem] border border-neutral-100 bg-white/75 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] backdrop-blur-sm flex flex-col self-start">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8EEF2] text-[#780F32]">
                <Stethoscope size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Patient Cases</h2>
                <p className="text-xs text-neutral-400">Live Django scans and AI reports.</p>
              </div>
            </div>

            {/* Filter Pill Tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 outline-none ${
                    activeFilter === filter
                      ? "bg-[#780F32] text-white shadow-sm shadow-[#780F32]/10"
                      : "border border-neutral-100 bg-white text-neutral-500 hover:border-[#780F32]/30 hover:text-[#780F32]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by patient, modality, model..."
                className="w-full rounded-2xl border border-neutral-100 bg-neutral-50/50 py-3 pl-11 pr-4 text-xs outline-none transition-all duration-300 focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5"
              />
            </div>

            {/* Cases Container */}
            <div className="mt-5 max-h-[720px] space-y-4 overflow-auto pr-1 no-scrollbar">
              {filteredScans.length ? (
                filteredScans.map((scan) => (
                  <CaseCard
                    key={scan.id}
                    scan={scan}
                    active={selectedScan?.id === scan.id}
                    onClick={() => setSelectedScan(scan)}
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-neutral-50/30 border border-neutral-100/40 px-5 py-10 text-center text-xs text-neutral-400">
                  No cases match this filter.
                </div>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: Case Detail panel */}
          <section className="rounded-[1.75rem] border border-neutral-100 bg-white/75 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] backdrop-blur-sm">
            {selectedScan ? (
              <div className="space-y-6">
                
                {/* Case Title and Status */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-neutral-50">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#780F32]/80">Case #{selectedScan.id}</p>
                    <h2 className="mt-1.5 text-2xl font-bold text-neutral-900 tracking-tight">{selectedScan.title || "Untitled Scan"}</h2>
                    <p className="mt-1.5 text-xs text-neutral-400">
                      {selectedScan.patient_name || "Patient unavailable"} · {formatLabel(selectedScan.routed_modality || selectedScan.scan_type)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${statusStyles(selectedStatus)}`}>
                    {selectedStatus}
                  </span>
                </div>

                {/* Safety Warning */}
                {selectedSafety?.needs_radiologist_review && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertCircle size={18} />
                      <p className="text-xs font-bold uppercase tracking-wider">Low-Confidence Safety Gate</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedSafety.warnings || ["Needs radiologist review."]).map((warning) => (
                        <span key={warning} className="rounded-full border border-amber-200/50 bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                          {warning}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Metrics Grid */}
                <div className="rounded-2xl border border-neutral-100/50 bg-[#FDF9FA]/30 p-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-neutral-100/60 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">AI Display</p>
                    <p className="mt-1.5 text-base font-bold text-[#780F32]">{formatLabel(selectedScan.display_prediction || selectedScan.ai_predicted_class)}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-100/60 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Disease Model</p>
                    <p className="mt-1.5 text-base font-bold text-neutral-900">{formatLabel(selectedScan.disease_model)}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-100/60 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Confidence</p>
                    <p className="mt-1.5 text-base font-bold text-neutral-900">{formatPercent(selectedScan.ai_confidence)}</p>
                  </div>
                </div>

                {/* Secondary Column Layout */}
                <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                  
                  {/* Left Column: Images, Metadata */}
                  <div className="space-y-6">
                    
                    {/* Scan Preview and Layer Tabs */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-bold text-neutral-900">Scan Preview</h3>

                        <div className="flex gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-100 self-start">
                          <button
                            type="button"
                            onClick={() => setActiveLayer("original")}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                              activeLayer === "original" ? "bg-white text-[#780F32] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                            }`}
                          >
                            Original
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveLayer("segmentation")}
                            disabled={!selectedScan.segmentation_overlay_base64}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                              activeLayer === "segmentation" ? "bg-white text-[#780F32] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                            }`}
                          >
                            AI Segmentation
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveLayer("heatmap")}
                            disabled={!selectedScan.xai_heatmap_base64}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                              activeLayer === "heatmap" ? "bg-white text-[#780F32] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                            }`}
                          >
                            AI Heatmap
                          </button>
                        </div>
                      </div>

                      <div className="relative w-full rounded-xl border border-neutral-100 overflow-hidden bg-neutral-950 flex items-center justify-center aspect-video">
                        {previewImageSrc ? (
                          <img
                            src={previewImageSrc}
                            alt={selectedScan.title || "Selected scan"}
                            className="max-h-[360px] w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-neutral-400">Preview unavailable</span>
                        )}
                      </div>
                    </div>

                    {/* Patient Context */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                      <h3 className="text-sm font-bold text-neutral-900">Patient Context</h3>
                      <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-neutral-500">
                        <p><span className="font-semibold text-neutral-900">Notes:</span> {patientContext.clinical_notes || selectedScan.description || "None provided"}</p>
                        <p><span className="font-semibold text-neutral-900">Symptoms:</span> {patientContext.symptoms || "None provided"}</p>
                        <p><span className="font-semibold text-neutral-900">History:</span> {patientContext.previous_breast_disease || "None provided"}</p>
                      </div>
                    </div>

                    {/* Model Traceability */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                      <h3 className="text-sm font-bold text-neutral-900">Model Traceability</h3>
                      <div className="mt-4 space-y-2.5 text-[11px] leading-relaxed text-neutral-500">
                        <p><span className="font-semibold text-neutral-900">Router:</span> {modelVersions.router?.name || "Not stored"}</p>
                        <p className="break-all"><span className="font-semibold text-neutral-900">Router Checkpoint:</span> {modelVersions.router?.checkpoint || "Not stored"}</p>
                        <p><span className="font-semibold text-neutral-900">Classifier:</span> {modelVersions.classifier?.name || "Not stored"}</p>
                        <p className="break-all"><span className="font-semibold text-neutral-900">Classifier Checkpoint:</span> {modelVersions.classifier?.checkpoint || "Not stored"}</p>
                        <p><span className="font-semibold text-neutral-900">Report Provider:</span> {modelVersions.reporting?.provider_used || selectedScan.report?.provider || "Not stored"}</p>
                      </div>
                    </div>

                    {/* Citation links */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                      <h3 className="text-sm font-bold text-neutral-900">Citation Links</h3>
                      <div className="mt-4 space-y-2">
                        {citations.length ? (
                          citations.map((citation) => (
                             <a
                              key={citation.id || citation.source}
                              href={citation.url || "#"}
                              target={citation.url ? "_blank" : undefined}
                              rel="noreferrer"
                              className="block rounded-xl border border-[#780F32]/5 bg-[#FDF9FA] px-4 py-3 text-xs font-semibold text-[#780F32] transition-all duration-300 hover:bg-[#F8EEF2] hover:border-[#780F32]/25 hover:translate-x-1.5 hover:shadow-[0_4px_15px_rgba(120,15,50,0.05)] hover:text-[#5C0A25]"
                            >
                              {citation.id ? `${citation.id}: ` : ""}{citation.source}
                            </a>
                          ))
                        ) : (
                          <p className="text-xs text-neutral-400">No citation links were generated for this report.</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Editor */}
                  <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-50">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">Radiologist Report Editor</h3>
                        <p className="mt-0.5 text-xs text-neutral-400">Edit the AI draft before finalizing.</p>
                      </div>
                      <Activity className="text-[#780F32]" size={20} />
                    </div>

                    <label className="mt-5 block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Patient Summary / Impression</span>
                      <textarea
                        value={draftImpression}
                        onChange={(event) => setDraftImpression(event.target.value)}
                        className="mt-3 min-h-[120px] w-full rounded-2xl border border-neutral-100 bg-neutral-50/50 px-4 py-3 text-xs leading-relaxed text-neutral-700 outline-none transition-all duration-300 focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5"
                        placeholder="Write the final impression visible to the patient..."
                      />
                    </label>

                    <label className="mt-5 block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Full Radiologist Report</span>
                      <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        className="mt-3 min-h-[300px] w-full rounded-2xl border border-neutral-100 bg-neutral-50/50 px-4 py-3 text-xs leading-relaxed text-neutral-700 outline-none transition-all duration-300 focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5"
                        placeholder="Edit full report content..."
                      />
                    </label>

                    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/50 px-5 py-4 text-xs font-medium leading-relaxed text-amber-800">
                      {selectedScan.report?.structured_report?.disclaimer || selectedSafety?.disclaimer || "AI output is decision support only and must be reviewed before clinical use."}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={handleAcceptCase}
                        disabled={saving || selectedStatus === "Accepted" || selectedStatus === "Finalized"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#780F32]/25 bg-[#FDF9FA] px-4 py-3 text-xs font-semibold text-[#780F32] transition-all duration-200 hover:bg-[#F8EEF2] hover:border-[#780F32]/45 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                      >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Stethoscope size={14} />} Accept Case
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={saving || selectedStatus === "Finalized"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:border-[#780F32]/30 hover:text-[#780F32] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] shadow-sm hover:shadow"
                      >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleFinalize}
                        disabled={saving || selectedStatus === "Finalized" || !draftImpression.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#780F32] to-[#5C0A25] px-5 py-3 text-xs font-semibold text-white transition-all duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] shadow-md shadow-[#780F32]/10"
                      >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Finalize & Send
                      </button>
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={saving || selectedStatus !== "Finalized"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:border-emerald-200/80 hover:bg-emerald-50/80 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                      >
                        <FileDown size={14} /> Export PDF
                      </button>
                    </div>

                    {selectedScan.report?.is_final && (
                      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-4 text-xs font-semibold text-emerald-700">
                        Final summary sent to the patient workspace
                        {selectedScan.patient_summary_sent_at ? ` at ${new Date(selectedScan.patient_summary_sent_at).toLocaleString()}` : "."}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl bg-neutral-50/40 text-center p-6">
                <FileText className="text-[#780F32]/80" size={36} />
                <h2 className="mt-4 text-lg font-bold text-neutral-900">No cases available</h2>
                <p className="mt-1 text-xs text-neutral-400">Patient scans will appear here after upload and AI analysis.</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
