import React from "react";
import {
  Activity,
  BrainCircuit,
  ClipboardCheck,
  FileText,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import PublicPageShell from "./PublicPageShell";

const heroCards = [
  {
    icon: <ScanLine className="h-5 w-5" />,
    title: "Multi-scan intake",
    text: "Patients can upload supported medical images with clinical notes for richer context.",
  },
  {
    icon: <BrainCircuit className="h-5 w-5" />,
    title: "AI assistance",
    text: "The pipeline classifies, segments, explains, and drafts structured report content.",
  },
  {
    icon: <ClipboardCheck className="h-5 w-5" />,
    title: "Clinical review",
    text: "Radiologists can review, edit, approve, and finalize reports before patients see them.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Traceable output",
    text: "Reports include model version data, citations, image evidence, and export-ready summaries.",
  },
];

const platformFeatures = [
  {
    title: "Patient-centered upload flow",
    text: "Radisist collects scan files, symptoms, history, and the reason for the exam so AI reports are not generated from image data alone.",
  },
  {
    title: "Explainable imaging support",
    text: "Heatmaps, segmentation output, confidence values, and safety flags help clinicians understand why a case needs attention.",
  },
  {
    title: "Radiologist-in-the-loop design",
    text: "The platform is designed around review, edit, approval, finalization, and patient notification instead of one-click automated diagnosis.",
  },
  {
    title: "Patient-ready reporting",
    text: "Final reports can include patient details, AI summary, references, clinical disclaimer, and radiologist signature for a complete handoff.",
  },
];

function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About Radisist"
      title="Built for safer"
      highlightedTitle="medical imaging workflows"
      description="Radisist is an AI-assisted medical imaging platform for students, clinicians, and radiology teams who need faster scan analysis without removing human oversight from the diagnostic process."
      heroCards={heroCards}
    >
      <section className="px-6 sm:px-10 lg:px-16 py-16 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#780F32]">
              What the platform does
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#211620] sm:text-5xl">
              From raw scan to reviewed report, every step has a purpose.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {platformFeatures.map((feature, index) => (
              <article
                key={feature.title}
                className="group rounded-[2rem] border border-[#780F32]/10 bg-[#F8F3F6] p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-[#780F32] hover:shadow-[0_26px_70px_rgba(120,15,50,0.18)]"
              >
                <span className="text-5xl font-black text-[#780F32]/15 transition-colors duration-300 group-hover:text-white/15">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-xl font-black text-[#271825] transition-colors duration-300 group-hover:text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-[#685D67] transition-colors duration-300 group-hover:text-[#F4DDE6]">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10 lg:px-16 py-16 bg-[#EDEBFF]">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-[#780F32] p-8 text-white shadow-[0_30px_80px_rgba(120,15,50,0.18)]">
            <ShieldCheck className="h-12 w-12 text-[#C9DCF6]" />
            <h2 className="mt-6 text-3xl font-black">
              AI is support, not a replacement.
            </h2>
            <p className="mt-4 leading-7 text-[#F4DDE6]">
              Radisist is designed to assist triage, explanation, documentation,
              and workflow speed. Final diagnosis and treatment decisions should
              remain with qualified healthcare professionals.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Confidence-aware review labels",
              "Unsupported-image detection",
              "Image-quality safety checks",
              "Model version traceability",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white bg-white/70 p-6 shadow-sm"
              >
                <Activity className="h-7 w-7 text-[#780F32]" />
                <p className="mt-4 text-lg font-bold text-[#271825]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

export default AboutPage;
