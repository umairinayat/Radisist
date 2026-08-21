import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  ChevronRight,
  Expand,
  ImagePlus,
  Loader2,
  SearchCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import SectionHeader from "../Components/SectionHeader";
import ImageExpandModal from "../Components/ImageExpandModal";
import {
  analyzePipelineImage,
  getPipelineSamples,
  routePipelineImage,
  savePipelineCrop,
} from "../../api/pipeline";

function formatLabel(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function loadSampleAsFile(url, fallbackName) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load sample image.");
  }

  const blob = await response.blob();
  return new File([blob], fallbackName, { type: blob.type || "image/jpeg" });
}

function ProbabilityPill({ item, active = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm transition ${active ? "border-[#7d1f3f] bg-[#7d1f3f] text-white shadow-lg shadow-[#7d1f3f]/15" : "border-gray-100 bg-white text-gray-600"}`}>
      <p className="font-semibold">{item.class}</p>
      <p className={`mt-1 text-xs ${active ? "text-white/80" : "text-gray-400"}`}>
        {(item.confidence * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export default function Upload() {
  const navigate = useNavigate();
  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [selectedModality, setSelectedModality] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [routingResult, setRoutingResult] = useState(null);
  const [selectedDisease, setSelectedDisease] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [cropSaving, setCropSaving] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCrop, setPendingCrop] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSamples = async () => {
      try {
        const data = await getPipelineSamples(5);
        if (!active) {
          return;
        }

        const nextSamples = data.diseases || [];
        const modalityOrder = [
          "mammography",
          "breast_ultrasound",
          "thyroid_ultrasound",
          "endoscopy",
          "chest_xray",
          "dermatology",
        ];
        nextSamples.sort((a, b) => {
          const indexA = modalityOrder.indexOf(a.disease);
          const indexB = modalityOrder.indexOf(b.disease);
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.disease.localeCompare(b.disease);
        });
        setSamples(nextSamples);
        if (nextSamples.length > 0) {
          setSelectedModality(nextSamples[0].disease);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.error || "Unable to load modality samples.");
        }
      } finally {
        if (active) {
          setSamplesLoading(false);
        }
      }
    };

    loadSamples();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectedSampleGroup = useMemo(
    () => samples.find((item) => item.disease === selectedModality),
    [samples, selectedModality],
  );

  const recommendedDisease = selectedDisease || (routingResult?.disease_models?.length === 1 ? routingResult.disease_models[0] : "");

  const handleFileSelection = (file) => {
    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRoutingResult(null);
    setSelectedDisease("");
    setPendingCrop(null);
    setError("");
  };

  const handleSampleClick = async (url) => {
    try {
      setError("");
      const filename = `${selectedModality || "sample"}.jpg`;
      const relativeUrl = url.replace(/^https?:\/\/[^\/]+/, "");
      const file = await loadSampleAsFile(relativeUrl, filename);
      handleFileSelection(file);
    } catch (sampleError) {
      setError(sampleError.message || "Unable to load this sample.");
    }
  };

  const handleRecommend = async () => {
    if (!selectedFile) {
      setError("Select or upload an image first.");
      return;
    }

    setRouteLoading(true);
    setError("");
    try {
      const result = await routePipelineImage(selectedFile);
      setRoutingResult(result);
      if ((result.disease_models || []).length === 1) {
        setSelectedDisease(result.disease_models[0]);
      } else {
        setSelectedDisease("");
      }
    } catch (routeError) {
      setError(routeError.response?.data?.error || "Recommendation failed.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Select or upload an image before analysis.");
      return;
    }

    if (routingResult?.disease_models?.length > 1 && !recommendedDisease) {
      setError("Select the routed disease option before analysis.");
      return;
    }

    setAnalyzeLoading(true);
    setError("");
    try {
      const scanData = await analyzePipelineImage({
        file: selectedFile,
        title: selectedFile.name,
        description: clinicalNotes,
        forceDisease: recommendedDisease || undefined,
      });

      let nextScanData = scanData;
      if (pendingCrop) {
        setCropSaving(true);
        const crop = await savePipelineCrop(scanData.id, pendingCrop);
        nextScanData = {
          ...scanData,
          crops: [...(scanData.crops || []), crop],
        };
        setCropSaving(false);
      }

      const role = localStorage.getItem("role");
      if (role === "RADIOLOGIST" || role === "ADMIN") {
        navigate("/radiologist/analyzed", { state: { scanData: nextScanData } });
      } else {
        navigate("/userdashboard/analyzed", { state: { scanData: nextScanData } });
      }
    } catch (analyzeError) {
      setCropSaving(false);
      setError(analyzeError.response?.data?.error || "Analysis failed. Please try again.");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleCropSave = async (crop) => {
    setPendingCrop(crop);
    setIsModalOpen(false);
  };

  return (
    <div className="py-8 space-y-8 max-w-6xl mx-auto">
      <SectionHeader
        title="Medical Scan Analysis"
        subtitle="Upload your medical scan or choose a sample scan to get AI-powered diagnostics, reports, and insights."
      />

      {error && (
        <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6 min-w-0">
        {/* Step 1: Choose a Scan Modality */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7d1f3f]/70">Step 1</p>
              <h2 className="mt-2 text-2xl font-bold text-[#7d1f3f]">Choose a Scan Modality</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Select your scan type below to view sample scans or compare them with your own uploaded image.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8eff3] px-4 py-3 text-sm font-semibold text-[#7d1f3f]">
              {selectedSampleGroup?.specialist || "AI-ready workflow"}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {samples.map((modality) => (
              <button
                key={modality.disease}
                type="button"
                onClick={() => setSelectedModality(modality.disease)}
                className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-bold transition ${selectedModality === modality.disease ? "bg-[#7d1f3f] text-white shadow-[0_10px_30px_rgba(125,31,63,0.24)]" : "border border-gray-100 bg-white text-gray-500 hover:border-[#7d1f3f]/25 hover:text-[#7d1f3f]"}`}
              >
                {formatLabel(modality.disease)}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[1.75rem] bg-[#fcfbfd] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sample Scans</h3>
                <p className="text-sm text-gray-500">Click any sample scan below to load it directly into the workspace.</p>
              </div>
            </div>

            {samplesLoading ? (
              <div className="flex min-h-[140px] items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {(selectedSampleGroup?.thumbnails || []).map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => handleSampleClick(url)}
                    className="group shrink-0 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#7d1f3f]/25 hover:shadow-lg"
                  >
                    <img src={url.replace(/^https?:\/\/[^\/]+/, "")} alt={`${selectedModality}-${index}`} className="h-36 w-36 object-cover transition duration-500 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2 & Step 3: Side by Side */}
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Step 2: Upload scan */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col justify-between">
            <div>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7d1f3f]/70">Step 2</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#7d1f3f]">Upload Your Medical Scan</h2>
                </div>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#7d1f3f] transition hover:border-[#7d1f3f]"
                  >
                    <Expand size={16} /> Expand Image
                  </button>
                )}
              </div>

              <label className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-[#7d1f3f]/20 bg-[#fbf8fa] px-6 py-8 text-center transition hover:border-[#7d1f3f]/40 hover:bg-[#f9f0f4]">
                <input
                  type="file"
                  accept="image/*,.dcm"
                  className="hidden"
                  onChange={(event) => handleFileSelection(event.target.files?.[0])}
                />

                {previewUrl ? (
                  <div className="w-full">
                    <div className="mx-auto flex max-h-[340px] w-full max-w-xl items-center justify-center rounded-[1.5rem] bg-white p-2 shadow-sm">
                      <img src={previewUrl} alt="Selected scan" className="max-h-[320px] w-auto max-w-full rounded-[1.25rem] object-contain" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-[#7d1f3f]">{selectedFile?.name}</p>
                    <p className="mt-1 text-sm text-gray-500">Ready for routing, expansion, or full analysis.</p>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="h-12 w-12 text-[#7d1f3f]" />
                    <h3 className="mt-4 text-xl font-bold text-[#7d1f3f]">Drag & drop or browse to upload your scan</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                      Supports DICOM, JPG, PNG, BMP, and TIFF files. You can also select one of the sample scans above to test.
                    </p>
                  </>
                )}
              </label>

              <textarea
                value={clinicalNotes}
                onChange={(event) => setClinicalNotes(event.target.value)}
                placeholder="Optional patient clinical history, symptoms, or radiologist notes..."
                className="mt-5 min-h-[120px] w-full rounded-[1.75rem] border border-gray-100 bg-[#fcfbfd] px-5 py-4 text-sm text-gray-700 outline-none transition focus:border-[#7d1f3f]/25 resize-none"
              />

              {pendingCrop && (
                <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                  Crop captured. It will be saved with the scan right after the Django analysis completes.
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Run analysis */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7d1f3f]/70">Step 3</p>
              <h2 className="mt-2 text-2xl font-bold text-[#7d1f3f]">AI Diagnosis & Analysis</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Automatically detect the scan modality and run the diagnostic AI models to generate a structured medical report.
              </p>

              <div className="mt-6 space-y-4">
                <button
                  type="button"
                  disabled={!selectedFile || routeLoading || analyzeLoading}
                  onClick={handleRecommend}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-[#7d1f3f]/20 bg-[#f8eff3] px-4 py-4 text-sm font-bold text-[#7d1f3f] transition hover:border-[#7d1f3f]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {routeLoading ? <Loader2 className="animate-spin" size={18} /> : <SearchCheck size={18} />}
                  Detect Scan Modality
                </button>

                <button
                  type="button"
                  disabled={!selectedFile || !routingResult || routingResult.modality === "Unknown" || analyzeLoading || routeLoading}
                  onClick={handleAnalyze}
                  title={routingResult?.modality === "Unknown" ? "Unsupported scan type — cannot analyze" : !routingResult && selectedFile ? "Detect scan modality first" : undefined}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#7d1f3f] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#63172f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {analyzeLoading || cropSaving ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                  Start AI Diagnostics
                </button>
                {routingResult?.modality === "Unknown" ? (
                  <p className="text-xs text-red-600 text-center font-bold">Unsupported/unknown modality — please upload a valid medical scan (Mammography, Ultrasound, Endoscopy, Chest X-Ray, Dermatology).</p>
                ) : !routingResult && selectedFile ? (
                  <p className="text-xs text-amber-600 text-center font-medium">Click “Detect Scan Modality” first to enable diagnostics.</p>
                ) : null}
              </div>

              <div className="mt-6 rounded-[1.75rem] bg-[#fcfbfd] p-5">
                <div className="flex items-center gap-3 text-[#7d1f3f]">
                  <Sparkles size={18} />
                  <p className="text-sm font-bold uppercase tracking-[0.2em]">Modality Detection Result</p>
                </div>

                {routingResult ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Detected Modality</p>
                          <h3 className="mt-2 text-xl font-bold text-gray-900">{routingResult.modality}</h3>
                        </div>
                        <div className="rounded-2xl bg-[#f8eff3] px-4 py-3 text-right">
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7d1f3f]/70">Confidence</p>
                          <p className="mt-1 text-lg font-black text-[#7d1f3f]">{(routingResult.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {(routingResult.top3 || []).map((item, index) => (
                        <ProbabilityPill key={`${item.class}-${index}`} item={item} active={index === 0} />
                      ))}
                    </div>

                    {(routingResult.low_confidence || routingResult.needs_radiologist_review || routingResult.confidence < 0.75) && (
                      <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                        <p className="font-black uppercase tracking-[0.2em] text-amber-700">Safety Check</p>
                        <p className="mt-2">
                          This image may need radiologist review before the AI output is used clinically.
                        </p>
                        {((routingResult.warnings || routingResult.image_quality?.warnings || [])).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(routingResult.warnings || routingResult.image_quality?.warnings || []).map((warning) => (
                              <span key={warning} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                                {warning}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(routingResult.disease_models || []).length > 1 && (
                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Select Routed Disease</p>
                        <div className="flex flex-wrap gap-3">
                          {routingResult.disease_models.map((disease) => (
                            <button
                              key={disease}
                              type="button"
                              onClick={() => setSelectedDisease(disease)}
                              className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${selectedDisease === disease ? "bg-[#7d1f3f] text-white shadow-[0_10px_20px_rgba(125,31,63,0.18)]" : "border border-gray-100 bg-white text-gray-600 hover:border-[#7d1f3f]/30 hover:text-[#7d1f3f]"}`}
                            >
                              {formatLabel(disease)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {recommendedDisease && routingResult?.modality !== "Unknown" && (
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        <WandSparkles size={16} /> Analysis will use {formatLabel(recommendedDisease)}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-gray-500">
                    No detection results generated yet. Click "Detect Scan Modality" above to identify the scan type and configure the AI model path.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workflow & What You Get: side-by-side at the end */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Workflow */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7d1f3f]/70">Workflow</p>
            <div className="mt-5 space-y-4">
              {[
                "Select a modality and browse the five Django-served sample images.",
                "Upload your own image or load a sample into the preview workspace.",
                "Use recommendation first so the router decides the modality branch.",
                "Analyze the image to persist the scan, structured report, segmentation, and heatmap in Django.",
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-4 rounded-[1.5rem] bg-[#fcfbfd] px-4 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#7d1f3f] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-gray-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What You Get */}
          <div className="rounded-[2rem] border border-gray-100 bg-gradient-to-br from-[#7d1f3f] to-[#9f3257] p-6 text-white shadow-[0_14px_40px_rgba(125,31,63,0.18)]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">What You Get</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-white/90">
              <div className="flex items-start gap-3">
                <ChevronRight className="mt-1 shrink-0" size={16} />
                <p>Router recommendation before the final analysis path is selected.</p>
              </div>
              <div className="flex items-start gap-3">
                <ChevronRight className="mt-1 shrink-0" size={16} />
                <p>Structured AI report, detailed audit trail, segmentation overlay, and Grad-CAM heatmap.</p>
              </div>
              <div className="flex items-start gap-3">
                <ChevronRight className="mt-1 shrink-0" size={16} />
                <p>Expand-image popup with zoom, crop box drawing, and saved region support for future workflows.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageExpandModal
        isOpen={isModalOpen}
        imageSrc={previewUrl}
        onClose={() => setIsModalOpen(false)}
        onSaveCrop={handleCropSave}
        saving={cropSaving}
      />
    </div>
  );
}
