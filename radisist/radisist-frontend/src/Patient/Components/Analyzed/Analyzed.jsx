import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  Expand,
  Eye,
  FileText,
  Layers3,
  Loader2,
  Save,
  ScanSearch,
  Sparkles,
} from "lucide-react";

import SectionHeader from "../SectionHeader";
import ImageExpandModal from "../ImageExpandModal";
import { savePipelineCrop } from "../../../api/pipeline";

const tabs = [
  { id: "analysis", label: "Analysis", icon: BrainCircuit },
  { id: "explanation", label: "Explanation", icon: Sparkles },
  { id: "report", label: "Report", icon: FileText },
  { id: "ai-report", label: "AI Report", icon: Activity },
];

const reasoningOrder = [
  ["selecting", "Selecting"],
  ["observing", "Observing"],
  ["analyzing", "Analyzing"],
  ["cross_referencing", "Cross-referencing"],
  ["weighing", "Weighing"],
];

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

function toBase64Src(value) {
  if (!value) {
    return "";
  }
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

function TabButton({ tab, activeTab, onClick }) {
  const Icon = tab.icon;
  const isActive = activeTab === tab.id;
  const shouldBlink = tab.id === "explanation" && activeTab !== "explanation";
  return (
    <button
      type="button"
      onClick={() => onClick(tab.id)}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive ? "bg-[#7d1f3f] text-white shadow-[0_10px_24px_rgba(125,31,63,0.18)]" : "border border-gray-100 bg-white text-gray-500 hover:border-[#7d1f3f]/25 hover:text-[#7d1f3f]"}`}
    >
      <Icon size={16} />
      {tab.label}
      {shouldBlink && (
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7d1f3f] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7d1f3f]"></span>
        </span>
      )}
    </button>
  );
}

function ProbabilityBars({ predictions }) {
  if (!predictions.length) {
    return <p className="text-sm text-gray-500">No classification probabilities were stored for this scan.</p>;
  }

  return (
    <div className="space-y-4">
      {predictions.map((item) => (
        <div key={`${item.class}-${item.probability}`}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <p className="font-semibold text-gray-700">{formatLabel(item.class)}</p>
            <p className="font-bold text-[#7d1f3f]">{formatPercent(item.probability)}</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#f4edf1]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7d1f3f] to-[#b23c66]"
              style={{ width: formatPercent(item.probability) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReasoningSteps({ report }) {
  const process = report?.ai_reasoning_process || {};
  const steps = reasoningOrder
    .map(([key, label]) => ({ key, label, value: process[key] }))
    .filter((item) => item.value);

  if (!steps.length) {
    return <p className="text-sm text-gray-500">The structured reasoning flow is unavailable for this report.</p>;
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.key} className="rounded-[1.5rem] border border-gray-100 bg-[#fcfbfd] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#7d1f3f] text-sm font-bold text-white">
              {index + 1}
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-gray-900">{step.label}</h4>
              {step.value.tool && (
                <p className="inline-flex rounded-full bg-[#f8eff3] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#7d1f3f]">
                  {step.value.tool}
                </p>
              )}
              {step.value.lead && <p className="text-sm italic text-gray-500">{step.value.lead}</p>}
              <p className="text-sm leading-6 text-gray-700">{step.value.text || step.value.description || step.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTrail({ trail }) {
  if (!trail.length) {
    return <p className="text-sm text-gray-500">No audit trail is available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-gray-100">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="bg-[#7d1f3f] text-white">
          <tr>
            <th className="px-5 py-4 font-bold">Step</th>
            <th className="px-5 py-4 font-bold">Tool</th>
            <th className="px-5 py-4 font-bold">Latency</th>
            <th className="px-5 py-4 font-bold">Output</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {trail.map((item, index) => (
            <tr key={`${item.step}-${index}`}>
              <td className="px-5 py-4 font-semibold text-gray-700">{formatLabel(item.step)}</td>
              <td className="px-5 py-4 text-gray-600">{item.tool || "-"}</td>
              <td className="px-5 py-4 text-gray-500">{item.latency_ms ? `${item.latency_ms}ms` : item.error || "-"}</td>
              <td className="px-5 py-4 text-gray-500">{item.output || item.error || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Analyzed() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scanData, setScanData] = useState(location.state?.scanData || null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [activeFindingIndex, setActiveFindingIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [cropSaving, setCropSaving] = useState(false);

  useEffect(() => {
    setScanData(location.state?.scanData || null);
  }, [location.state]);

  useEffect(() => {
    setActiveFindingIndex(0);
  }, [scanData?.id]);

  const structuredReport = scanData?.report?.structured_report || null;
  const predictions = useMemo(
    () => scanData?.classification_result?.predictions || [],
    [scanData?.classification_result],
  );
  const findings = useMemo(() => structuredReport?.key_findings || [], [structuredReport]);
  const citations = useMemo(() => structuredReport?.evidence_citations || [], [structuredReport]);
  const safety = scanData?.safety || scanData?.analysis_metadata?.safety || structuredReport?.safety || null;
  const needsReview = Boolean(safety?.needs_radiologist_review);
  const activeFinding = findings[activeFindingIndex] || null;
  const segmentationSrc = toBase64Src(scanData?.segmentation_overlay_base64);
  const heatmapSrc = toBase64Src(scanData?.xai_heatmap_base64);

  const handleSaveCrop = async (crop) => {
    if (!scanData?.id) {
      return;
    }

    setCropSaving(true);
    try {
      const savedCrop = await savePipelineCrop(scanData.id, crop);
      setScanData((current) => ({
        ...current,
        crops: [...(current?.crops || []), savedCrop],
      }));
      setModalOpen(false);
    } finally {
      setCropSaving(false);
    }
  };

  const reportSummary = structuredReport?.summary || scanData?.report?.impression || "No summary is available for this scan yet.";
  const nextActions = useMemo(() => structuredReport?.clinical_recommendations || [], [structuredReport]);

  const tabContent = useMemo(() => {
    if (!scanData) {
      return null;
    }

    switch (activeTab) {
      case "analysis":
        return (
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Probability Breakdown</h3>
              <p className="mt-2 text-sm text-gray-500">Detailed class probabilities from the selected disease model.</p>
              <div className="mt-6">
                <ProbabilityBars predictions={predictions} />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Segmentation Regions</h3>
              <p className="mt-2 text-sm text-gray-500">Detected regions are listed here when a segmentation model is available.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {(scanData.segmentation_result?.regions || []).length ? (
                  scanData.segmentation_result.regions.map((region) => (
                    <div key={region.id} className="rounded-2xl bg-[#f8eff3] px-4 py-3 text-sm font-semibold text-[#7d1f3f]">
                      Region {region.id}: {region.bbox.width}x{region.bbox.height}px
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No segmentation regions were stored for this scan.</p>
                )}
              </div>
            </div>
          </div>
        );
      case "report":
        return (
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Clinical Summary</h3>
              <p className="mt-4 text-sm leading-7 text-gray-700">{reportSummary}</p>
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Key Findings</h3>
              <div className="mt-5 space-y-3">
                {findings.length ? (
                  findings.map((finding, index) => (
                    <button
                      key={`${finding.finding || finding.text}-${index}`}
                      type="button"
                      onClick={() => setActiveFindingIndex(index)}
                      className={`block w-full rounded-[1.5rem] border px-5 py-4 text-left text-sm transition ${activeFindingIndex === index ? "border-[#7d1f3f] bg-[#f8eff3]" : "border-gray-100 bg-white hover:border-[#7d1f3f]/20"}`}
                    >
                      <p className="font-semibold text-gray-800">{finding.finding || finding.text || "Finding"}</p>
                      {(finding.location || finding.confidence != null) && (
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                          {finding.location ? `${finding.location} · ` : ""}
                          {finding.confidence != null ? formatPercent(finding.confidence) : ""}
                        </p>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">The AI report did not return a structured findings list.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Clinical Recommendation</h3>
              {nextActions.length ? (
                <div className="mt-5 space-y-3">
                  {nextActions.map((action, index) => (
                    <div key={`${action.recommendation || action.text}-${index}`} className="rounded-[1.5rem] bg-[#fcfbfd] px-5 py-4">
                      <p className="text-sm leading-6 text-gray-700">{action.recommendation || action.text || "Recommendation unavailable"}</p>
                      {action.citation && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d1f3f]">{action.citation}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No next-step recommendations were stored for this report.</p>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Evidence Citations</h3>
              {citations.length ? (
                <div className="mt-5 space-y-3">
                  {citations.map((citation) => (
                    <a
                      key={citation.id || citation.source}
                      href={citation.url || "#"}
                      target={citation.url ? "_blank" : undefined}
                      rel="noreferrer"
                      className="block rounded-[1.5rem] bg-[#fcfbfd] px-5 py-4 text-sm font-semibold text-[#7d1f3f] transition hover:bg-[#f8eff3]"
                    >
                      {citation.id ? `${citation.id}: ` : ""}{citation.source}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No citation links were stored for this report.</p>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-6">
              <h3 className="text-xl font-bold text-amber-900">Medical Disclaimer</h3>
              <p className="mt-3 text-sm leading-7 text-amber-800">
                {structuredReport?.disclaimer || safety?.disclaimer || "AI output is decision support only and must be reviewed by a qualified radiologist before clinical use."}
              </p>
            </div>
          </div>
        );
      case "ai-report":
        return (
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Structured AI Report</h3>
              <p className="mt-2 text-sm text-gray-500">This is the stored report payload generated from the Django-integrated pipeline.</p>
              <pre className="mt-5 max-h-[560px] overflow-auto rounded-[1.5rem] bg-[#1f1721] p-5 text-xs leading-6 text-[#f7edf2]">
                {JSON.stringify(structuredReport || scanData.report || {}, null, 2)}
              </pre>
            </div>
          </div>
        );
      case "explanation":
      default:
        return (
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">AI Reasoning Flow</h3>
              <p className="mt-2 text-sm text-gray-500">The reasoning sequence mirrors the stored structured report generated inside Django.</p>
              <div className="mt-6">
                <ReasoningSteps report={structuredReport} />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
              <h3 className="text-xl font-bold text-gray-900">Audit Trail</h3>
              <p className="mt-2 text-sm text-gray-500">Full orchestration timing and tool trace for this analysis.</p>
              <div className="mt-6">
                <AuditTrail trail={scanData.audit_trail || []} />
              </div>
            </div>
          </div>
        );
    }
  }, [activeTab, activeFindingIndex, citations, findings, nextActions, predictions, reportSummary, scanData, structuredReport, safety]);

  if (!scanData) {
    return (
      <div className="py-8">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-2xl font-bold text-[#7d1f3f]">No analysis loaded</h2>
          <p className="mt-3 text-sm text-gray-500">Upload and analyze a scan first, or open an existing scan from your dashboard.</p>
          <button
            type="button"
            onClick={() => navigate("/userdashboard/upload")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#7d1f3f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#63172f]"
          >
            <ArrowLeft size={16} /> Return To Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeader
          title="Analysis Workspace"
          subtitle="The router, classification, segmentation, heatmap, audit trail, and structured report are now all coming from the Django-integrated pipeline."
        />
        <button
          type="button"
          onClick={() => navigate("/userdashboard/scans")}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#7d1f3f] transition hover:border-[#7d1f3f]"
        >
          <ArrowLeft size={16} /> Back To Scans
        </button>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {needsReview && (
          <div className="mb-5 rounded-[1.5rem] border border-amber-100 bg-amber-50 px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">Needs Radiologist Review</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              This scan has low-confidence or image-quality warnings. The AI prediction is hidden as a strong diagnosis until a radiologist finalizes the report.
            </p>
            {(safety?.warnings || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {safety.warnings.map((warning) => (
                  <span key={warning} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                    {warning}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 animate-fade-in">
          <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Detected Modality</p>
            <p className="mt-3 text-xl font-bold text-[#7d1f3f]">{scanData.routed_modality || "Not stored"}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Disease Model</p>
            <p className="mt-3 text-xl font-bold text-gray-900">{formatLabel(scanData.disease_model)}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Predicted Class</p>
            <p className={`mt-3 text-xl font-bold ${needsReview ? "text-amber-700" : "text-gray-900"}`}>
              {formatLabel(scanData.display_prediction || scanData.ai_predicted_class)}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[#fcfbfd] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Radiologist Review</p>
            <p className={`mt-3 text-xl font-bold ${needsReview ? "text-amber-600" : "text-emerald-600"}`}>
              {needsReview ? "Required" : "Not Required"}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[#7d1f3f] p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">AI Confidence</p>
            <p className="mt-3 text-2xl font-black">{formatPercent(scanData.ai_confidence)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <TabButton key={tab.id} tab={tab} activeTab={activeTab} onClick={setActiveTab} />
              ))}
            </div>
          </div>

          {tabContent}
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7d1f3f]/70">Original Scan</p>
                <h3 className="mt-2 text-xl font-bold text-gray-900">Review Image</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#7d1f3f] transition hover:border-[#7d1f3f]"
              >
                <Expand size={16} /> Expand Image
              </button>
            </div>

            <img src={scanData.image ? scanData.image.replace(/^https?:\/\/[^\/]+/, "") : ""} alt={scanData.title || "Analyzed scan"} className="mt-5 w-full rounded-[1.5rem] border border-gray-100 object-cover" />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#fcfbfd] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Scan ID</p>
                <p className="mt-2 text-sm font-semibold text-gray-700">#{scanData.id}</p>
              </div>
              <div className="rounded-2xl bg-[#fcfbfd] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Saved Crops</p>
                <p className="mt-2 text-sm font-semibold text-gray-700">{(scanData.crops || []).length}</p>
              </div>
            </div>

            {(scanData.crops || []).length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#7d1f3f]">
                  <Save size={16} /> Saved Crops
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {scanData.crops.map((crop) => (
                    <img key={crop.id} src={crop.image} alt={`Crop ${crop.id}`} className="h-28 w-full rounded-2xl border border-gray-100 object-cover" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-[#7d1f3f]">
              <Layers3 size={18} />
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Segmentation</p>
            </div>
            {segmentationSrc ? (
              <img src={segmentationSrc} alt="Segmentation overlay" className="mt-5 w-full rounded-[1.5rem] border border-gray-100 object-cover" />
            ) : (
              <div className="mt-5 rounded-[1.5rem] bg-[#fcfbfd] px-5 py-8 text-sm text-gray-500">No segmentation overlay is available for this scan.</div>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-[#7d1f3f]">
              <Eye size={18} />
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Heatmap</p>
            </div>
            {heatmapSrc ? (
              <img src={heatmapSrc} alt="Grad-CAM heatmap" className="mt-5 w-full rounded-[1.5rem] border border-gray-100 object-cover" />
            ) : (
              <div className="mt-5 rounded-[1.5rem] bg-[#fcfbfd] px-5 py-8 text-sm text-gray-500">No heatmap was returned for this scan.</div>
            )}

            {activeFinding && (
              <div className="mt-5 rounded-[1.5rem] bg-[#f8eff3] px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#7d1f3f]">
                  <ScanSearch size={16} /> Active Finding
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-700">{activeFinding.finding || activeFinding.text}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ImageExpandModal
        isOpen={modalOpen}
        imageSrc={scanData.image ? scanData.image.replace(/^https?:\/\/[^\/]+/, "") : ""}
        onClose={() => setModalOpen(false)}
        onSaveCrop={handleSaveCrop}
        saving={cropSaving}
      />

      {(cropSaving || false) && (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-3 rounded-2xl bg-[#7d1f3f] px-5 py-4 text-sm font-bold text-white shadow-[0_16px_40px_rgba(125,31,63,0.25)]">
          <Loader2 size={16} className="animate-spin" /> Saving crop to Django
        </div>
      )}
    </div>
  );
}
