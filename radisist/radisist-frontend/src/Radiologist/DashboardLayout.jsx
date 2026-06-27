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

function statusStyles(status) {
  switch (status) {
    case "Finalized":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Accepted":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Needs Review":
      return "bg-amber-50 text-amber-700 border-amber-100";
    default:
      return "bg-gray-50 text-gray-600 border-gray-100";
  }
}

function CaseCard({ scan, active, onClick }) {
  const status = getCaseStatus(scan);
  const safety = getSafety(scan);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.75rem] border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-[#7d1f3f] bg-[#fbf4f7] shadow-md" : "border-gray-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
            {formatLabel(scan.routed_modality || scan.scan_type)}
          </p>
          <h3 className="mt-2 truncate text-lg font-black text-gray-900">{scan.title || `Scan #${scan.id}`}</h3>
          <p className="mt-1 text-sm text-gray-500">{scan.patient_name || "Patient unavailable"}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusStyles(status)}`}>
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/80 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">AI Label</p>
          <p className="mt-2 text-sm font-bold text-[#7d1f3f]">{formatLabel(scan.display_prediction || scan.ai_predicted_class)}</p>
        </div>
        <div className="rounded-2xl bg-white/80 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Confidence</p>
          <p className="mt-2 text-sm font-bold text-gray-800">{formatPercent(scan.ai_confidence)}</p>
        </div>
      </div>

      {safety?.needs_radiologist_review && (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
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
        // Notification read state is non-critical for case review.
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
      <div className="flex min-h-screen items-center justify-center bg-[#fbfafb] text-[#7d1f3f]">
        <Loader2 className="animate-spin" size={34} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbfafb] via-white to-[#f8eff3]">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#7d1f3f]/70">Radisist Review Desk</p>
            <h1 className="mt-2 text-2xl font-black text-gray-950 sm:text-3xl">Radiologist Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Claim AI-assisted cases, edit draft reports, and send final summaries to patients.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative rounded-2xl border border-gray-100 bg-white p-3 text-gray-500 transition hover:text-[#7d1f3f]"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-14 z-50 w-[min(92vw,380px)] rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-gray-950">Notifications</h3>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-bold text-[#7d1f3f]"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                  {notifications.length ? (
                    notifications.slice(0, 8).map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`block w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                          notification.is_read ? "bg-[#fcfbfd] text-gray-600" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        <p className="font-black">{notification.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5">{notification.message}</p>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-[#fcfbfd] px-4 py-6 text-center text-sm text-gray-500">
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
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-500 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={18} /> Logout
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7d1f3f] text-sm font-black text-white shadow-lg shadow-[#7d1f3f]/20">
              {initials || <User size={20} />}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        {(error || notice) && (
          <div className={`mb-6 rounded-[1.5rem] border px-5 py-4 text-sm font-semibold ${error ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
            {error || notice}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Cases", value: stats.total, icon: FileText, tone: "text-[#7d1f3f]" },
            { label: "Needs Review", value: stats.needsReview, icon: ShieldAlert, tone: "text-amber-600" },
            { label: "Accepted", value: stats.accepted, icon: Clock, tone: "text-blue-600" },
            { label: "Finalized", value: stats.finalized, icon: CheckCircle, tone: "text-emerald-600" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">{card.label}</p>
                  <Icon className={card.tone} size={22} />
                </div>
                <p className="mt-4 text-4xl font-black text-gray-950">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8eff3] text-[#7d1f3f]">
                <Stethoscope size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-950">Patient Cases</h2>
                <p className="text-sm text-gray-500">Live Django scans and AI reports.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                    activeFilter === filter ? "bg-[#7d1f3f] text-white" : "border border-gray-100 bg-white text-gray-500 hover:border-[#7d1f3f]/20 hover:text-[#7d1f3f]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by patient, modality, model..."
                className="w-full rounded-2xl border border-gray-100 bg-[#fcfbfd] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#7d1f3f]/30"
              />
            </div>

            <div className="mt-5 max-h-[720px] space-y-4 overflow-auto pr-1">
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
                <div className="rounded-[1.75rem] bg-[#fcfbfd] px-5 py-10 text-center text-sm text-gray-500">
                  No cases match this filter.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {selectedScan ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-[#7d1f3f]/70">Case #{selectedScan.id}</p>
                    <h2 className="mt-2 text-3xl font-black text-gray-950">{selectedScan.title || "Untitled Scan"}</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      {selectedScan.patient_name || "Patient unavailable"} · {formatLabel(selectedScan.routed_modality || selectedScan.scan_type)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-sm font-black ${statusStyles(selectedStatus)}`}>
                    {selectedStatus}
                  </span>
                </div>

                {selectedSafety?.needs_radiologist_review && (
                  <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertCircle size={20} />
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Low-Confidence Safety Gate</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedSafety.warnings || ["Needs radiologist review."]).map((warning) => (
                        <span key={warning} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                          {warning}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">AI Display</p>
                    <p className="mt-3 text-lg font-black text-[#7d1f3f]">{formatLabel(selectedScan.display_prediction || selectedScan.ai_predicted_class)}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Disease Model</p>
                    <p className="mt-3 text-lg font-black text-gray-900">{formatLabel(selectedScan.disease_model)}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Confidence</p>
                    <p className="mt-3 text-lg font-black text-gray-900">{formatPercent(selectedScan.ai_confidence)}</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-6">
                    <div className="rounded-[1.75rem] border border-gray-100 p-5">
                      <h3 className="text-lg font-black text-gray-950">Scan Preview</h3>
                      <img
                        src={selectedScan.image}
                        alt={selectedScan.title || "Selected scan"}
                        className="mt-4 max-h-[360px] w-full rounded-[1.5rem] border border-gray-100 object-contain"
                      />
                    </div>

                    <div className="rounded-[1.75rem] border border-gray-100 p-5">
                      <h3 className="text-lg font-black text-gray-950">Patient Context</h3>
                      <div className="mt-4 space-y-3 text-sm text-gray-600">
                        <p><span className="font-bold text-gray-900">Notes:</span> {patientContext.clinical_notes || selectedScan.description || "None provided"}</p>
                        <p><span className="font-bold text-gray-900">Symptoms:</span> {patientContext.symptoms || "None provided"}</p>
                        <p><span className="font-bold text-gray-900">History:</span> {patientContext.previous_breast_disease || "None provided"}</p>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-gray-100 p-5">
                      <h3 className="text-lg font-black text-gray-950">Model Traceability</h3>
                      <div className="mt-4 space-y-3 text-xs leading-5 text-gray-600">
                        <p><span className="font-black text-gray-900">Router:</span> {modelVersions.router?.name || "Not stored"}</p>
                        <p className="break-all"><span className="font-black text-gray-900">Router checkpoint:</span> {modelVersions.router?.checkpoint || "Not stored"}</p>
                        <p><span className="font-black text-gray-900">Classifier:</span> {modelVersions.classifier?.name || "Not stored"}</p>
                        <p className="break-all"><span className="font-black text-gray-900">Classifier checkpoint:</span> {modelVersions.classifier?.checkpoint || "Not stored"}</p>
                        <p><span className="font-black text-gray-900">Report provider:</span> {modelVersions.reporting?.provider_used || selectedScan.report?.provider || "Not stored"}</p>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-gray-100 p-5">
                      <h3 className="text-lg font-black text-gray-950">Citation Links</h3>
                      <div className="mt-4 space-y-2">
                        {citations.length ? (
                          citations.map((citation) => (
                            <a
                              key={citation.id || citation.source}
                              href={citation.url || "#"}
                              target={citation.url ? "_blank" : undefined}
                              rel="noreferrer"
                              className="block rounded-2xl bg-[#fcfbfd] px-4 py-3 text-sm font-semibold text-[#7d1f3f] hover:bg-[#f8eff3]"
                            >
                              {citation.id ? `${citation.id}: ` : ""}{citation.source}
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No citation links were generated for this report.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-gray-100 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-gray-950">Radiologist Report Editor</h3>
                        <p className="mt-1 text-sm text-gray-500">Edit the AI draft before finalizing.</p>
                      </div>
                      <Activity className="text-[#7d1f3f]" size={22} />
                    </div>

                    <label className="mt-5 block">
                      <span className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Patient Summary / Impression</span>
                      <textarea
                        value={draftImpression}
                        onChange={(event) => setDraftImpression(event.target.value)}
                        className="mt-3 min-h-[120px] w-full rounded-[1.5rem] border border-gray-100 bg-[#fcfbfd] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#7d1f3f]/30"
                        placeholder="Write the final impression visible to the patient..."
                      />
                    </label>

                    <label className="mt-5 block">
                      <span className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Full Radiologist Report</span>
                      <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        className="mt-3 min-h-[300px] w-full rounded-[1.5rem] border border-gray-100 bg-[#fcfbfd] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#7d1f3f]/30"
                        placeholder="Edit full report content..."
                      />
                    </label>

                    <div className="mt-5 rounded-[1.5rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                      {selectedScan.report?.structured_report?.disclaimer || selectedSafety?.disclaimer || "AI output is decision support only and must be reviewed before clinical use."}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleAcceptCase}
                        disabled={saving || selectedStatus === "Accepted" || selectedStatus === "Finalized"}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#7d1f3f]/20 bg-[#f8eff3] px-5 py-3 text-sm font-black text-[#7d1f3f] transition hover:border-[#7d1f3f]/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Stethoscope size={16} />} Accept Case
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={saving || selectedStatus === "Finalized"}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:border-[#7d1f3f]/30 hover:text-[#7d1f3f] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleFinalize}
                        disabled={saving || selectedStatus === "Finalized" || !draftImpression.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#7d1f3f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#63172f] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Finalize And Send
                      </button>
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={saving || selectedStatus !== "Finalized"}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 transition hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FileDown size={16} /> Export PDF
                      </button>
                    </div>

                    {selectedScan.report?.is_final && (
                      <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                        Final summary sent to the patient workspace
                        {selectedScan.patient_summary_sent_at ? ` at ${new Date(selectedScan.patient_summary_sent_at).toLocaleString()}` : "."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[1.75rem] bg-[#fcfbfd] text-center">
                <FileText className="text-[#7d1f3f]" size={42} />
                <h2 className="mt-4 text-2xl font-black text-gray-950">No cases available</h2>
                <p className="mt-2 text-sm text-gray-500">Patient scans will appear here after upload and AI analysis.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
