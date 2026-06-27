import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, FileText, Loader2 } from "lucide-react";

import SectionHeader from "../Components/SectionHeader";
import { getScans } from "../../api/scans";

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

export default function Reports() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await getScans();
        setScans(data || []);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const reportScans = useMemo(
    () => scans.filter((scan) => scan.report || scan.ai_generated),
    [scans],
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#7d1f3f]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-8 min-h-screen">
      <SectionHeader
        title="Medical Reports"
        subtitle="Review every saved Django pipeline analysis, including the structured report, predicted class, and confidence score."
      />

      {reportScans.length === 0 ? (
        <div className="rounded-[2rem] border border-gray-100 bg-white p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f8eff3] text-[#7d1f3f]">
            <FileText size={34} />
          </div>
          <h3 className="mt-6 text-2xl font-black text-gray-900">No reports yet</h3>
          <p className="mt-3 text-sm text-gray-500">Once you analyze a scan through the integrated Django pipeline, it will appear here for quick review.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {reportScans.map((scan) => (
            <div key={scan.id} className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">{formatLabel(scan.routed_modality || scan.scan_type)}</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#7d1f3f]">{scan.title || `Scan #${scan.id}`}</h3>
                </div>
                <div className="rounded-2xl bg-[#f8eff3] px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7d1f3f]/70">Confidence</p>
                  <p className="mt-1 text-lg font-black text-[#7d1f3f]">{formatPercent(scan.ai_confidence)}</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-gray-600">
                {scan.report?.structured_report?.summary || scan.report?.impression || "Structured report summary is not available yet."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-[#fcfbfd] px-4 py-2 font-semibold text-gray-600">
                  Predicted: {formatLabel(scan.ai_predicted_class)}
                </span>
                <span className="rounded-full bg-[#fcfbfd] px-4 py-2 font-semibold text-gray-600">
                  Model: {formatLabel(scan.disease_model)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fcfbfd] px-4 py-2 font-semibold text-gray-600">
                  <BrainCircuit size={14} /> {scan.report?.provider || scan.analysis_metadata?.report_provider || "Provider unavailable"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/userdashboard/analyzed", { state: { scanData: scan } })}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#7d1f3f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#63172f]"
              >
                Open Report Workspace <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
