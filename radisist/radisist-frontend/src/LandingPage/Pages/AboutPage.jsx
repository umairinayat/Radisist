import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  ClipboardCheck,
  FileText,
  ScanLine,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import PublicPageShell from "./PublicPageShell";

const platformFeatures = [
  {
    title: "Patient-centered upload flow",
    text: "Radisist collects scan files, symptoms, history, and the reason for the exam so AI reports are not generated from image data alone.",
    icon: <ScanLine className="h-6 w-6 text-[#780F32]" />,
  },
  {
    title: "Explainable imaging support",
    text: "Heatmaps, segmentation output, confidence values, and safety flags help clinicians understand why a case needs attention.",
    icon: <BrainCircuit className="h-6 w-6 text-[#780F32]" />,
  },
  {
    title: "Radiologist-in-the-loop design",
    text: "The platform is designed around review, edit, approval, finalization, and patient notification instead of one-click automated diagnosis.",
    icon: <ClipboardCheck className="h-6 w-6 text-[#780F32]" />,
  },
  {
    title: "Patient-ready reporting",
    text: "Final reports can include patient details, AI summary, references, clinical disclaimer, and radiologist signature for a complete handoff.",
    icon: <FileText className="h-6 w-6 text-[#780F32]" />,
  },
];

const safetyItems = [
  {
    title: "Confidence-aware reviews",
    desc: "Automatically flags low-confidence AI class detections for manual radiologist audit.",
  },
  {
    title: "Unsupported-image blocks",
    desc: "Validates that incoming medical scans match accepted modalities to prevent processing errors.",
  },
  {
    title: "Quality safety checks",
    desc: "Scans for noise, artifacts, and clipping to ensure clear, readable data input.",
  },
  {
    title: "Model traceability",
    desc: "Attaches exact classifier and router parameters to every report for strict model lineage.",
  },
];

function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <PublicPageShell>
      {/* UNIQUE HERO SECTION: Left text, Right custom interactive scanner visualization */}
      <section className="relative isolate px-6 sm:px-10 lg:px-16 py-16 md:py-24 max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center"
        >
          {/* Hero Left Content */}
          <motion.div variants={itemVariants} className="flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#780F32]/15 bg-[#FDF9FA] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#780F32] shadow-sm">
              <Sparkles className="h-4 w-4" />
              About Radisist
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl lg:text-6xl tracking-tight">
              Built for safer <span className="text-[#780F32]">medical imaging workflows</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-neutral-500 sm:text-lg">
              Radisist is an AI-assisted medical imaging platform for students, clinicians, and radiology teams who need faster scan analysis without removing human oversight from the diagnostic process.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#780F32] px-7 py-3 text-sm font-bold text-white shadow-[0_15px_35px_rgba(120,15,50,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5F102A]"
              >
                Start analysis
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-[#780F32]/20 bg-white px-7 py-3 text-sm font-bold text-[#780F32] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#780F32]/40 hover:bg-[#FFF8FB]"
              >
                Talk to us
              </Link>
            </div>
          </motion.div>

          {/* Hero Right Content: Stylized Scanner Interface Mockup */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-4 rounded-[2.5rem] bg-[#780F32] blur-3xl opacity-10" />
            <div className="relative overflow-hidden rounded-[2rem] border border-neutral-100/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-sm">
              <div className="relative aspect-video rounded-2xl bg-neutral-950 overflow-hidden flex items-center justify-center border border-neutral-850">
                
                {/* Stylized scan grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                {/* Horizontal scanline animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-[#780F32]/70 shadow-[0_0_12px_#780F32] top-1/3 animate-pulse" />

                {/* Stylized breast scan graphic placeholder */}
                <svg viewBox="0 0 200 120" className="w-4/5 opacity-70">
                  <path d="M 30 110 Q 70 30 110 80 T 170 110" fill="none" stroke="#FFF" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Heatmap blur spot */}
                  <circle cx="110" cy="80" r="16" fill="rgba(120, 15, 50, 0.45)" className="animate-ping" style={{ animationDuration: "3s" }} />
                  <circle cx="110" cy="80" r="10" fill="#780F32" />
                  {/* Target coordinates lines */}
                  <line x1="110" y1="0" x2="110" y2="120" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2="200" y2="80" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                </svg>

                {/* Scanning status banner */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 border border-neutral-800 backdrop-blur px-3 py-2 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F4DDE6] tracking-wide uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#780F32] animate-pulse" />
                    AI Modality: Mammogram
                  </span>
                  <span className="font-bold text-[#780F32]">94% Confidence</span>
                </div>
              </div>

              {/* Extra details widget */}
              <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-neutral-100 bg-[#FDF9FA]/50">
                  <span className="text-neutral-400 font-semibold uppercase">Classifier Check</span>
                  <p className="mt-1 text-sm font-bold text-neutral-900">ResNet-50 v2</p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-100 bg-[#FDF9FA]/50">
                  <span className="text-neutral-400 font-semibold uppercase">Explainability</span>
                  <p className="mt-1 text-sm font-bold text-neutral-900">Grad-CAM Overlay</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 1: Timeline Platform Features */}
      <section className="px-6 sm:px-10 lg:px-16 py-20 bg-white relative border-t border-neutral-100">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[#780F32]">
              What the platform does
            </p>
            <h2 className="mt-3 text-3xl font-bold text-neutral-900 tracking-tight sm:text-4xl">
              From raw scan to reviewed report, every step has a purpose.
            </h2>
            <p className="mt-4 text-sm text-neutral-500 max-w-xl mx-auto">
              Our clinical workflow keeps the physician at the center of AI insights to guarantee safety and compliance.
            </p>
          </motion.div>

          {/* Alternating Timeline Layout */}
          <div className="relative mt-16 max-w-5xl mx-auto">
            {/* Timeline Center Line (Desktop) */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-[82%] bg-gradient-to-b from-[#780F32]/10 via-[#780F32]/25 to-[#780F32]/5 hidden md:block top-10" />

            <div className="space-y-12 md:space-y-20 relative z-10">
              {platformFeatures.map((feature, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div
                    key={feature.title}
                    className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
                      isEven ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Content Block */}
                    <div className="w-full md:w-1/2 flex justify-start md:justify-end">
                      <motion.article
                        initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, delay: index * 0.1 }}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        className="group w-full max-w-md rounded-3xl border border-neutral-100/90 bg-[#FFFDFE] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_20px_40px_rgba(120,15,50,0.04)] cursor-pointer text-left"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF9FA] text-[#780F32] shadow-sm transition-transform duration-500 group-hover:rotate-6">
                            {feature.icon}
                          </div>
                          <span className="text-[10px] font-bold tracking-wider text-[#780F32]/60 uppercase bg-[#FDF9FA] border border-[#780F32]/10 rounded-full px-3 py-1">
                            Step 0{index + 1}
                          </span>
                        </div>
                        <h3 className="mt-5 text-base font-bold text-neutral-900 leading-tight">
                          {feature.title}
                        </h3>
                        <p className="mt-3 text-xs leading-relaxed text-neutral-500 font-light">
                          {feature.text}
                        </p>
                      </motion.article>
                    </div>

                    {/* Timeline Node Center Badge (Desktop) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.3 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      className="hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-white border-2 border-[#780F32] shadow-sm z-20"
                    >
                      <div className="h-3 w-3 rounded-full bg-[#780F32]" />
                    </motion.div>

                    {/* Spacer block */}
                    <div className="hidden md:block w-1/2" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Safety & Triage split panel */}
      <section className="px-6 sm:px-10 lg:px-16 py-20 bg-[#FDF9FA]/75 backdrop-blur-sm border-t border-neutral-100/60 relative">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] items-stretch">
            
            {/* Left Column: Focus Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="rounded-[2.5rem] bg-gradient-to-br from-[#780F32] to-[#5C0A25] p-8 sm:p-10 text-white shadow-[0_20px_50px_rgba(120,15,50,0.15)] flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/10 shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                  AI is support, <br className="hidden sm:inline" />
                  not a replacement.
                </h2>
                <p className="mt-4 text-xs leading-relaxed text-[#F4DDE6]/90 font-light">
                  Radisist is engineered specifically to accelerate triage, assist medical explanations, automate document drafts, and streamline overall clinical turnaround speed.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-[#F4DDE6]/90 font-light">
                  Final screening reviews, pathology confirmation, and treatment plans always reside securely in the hands of authorized radiologists.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 animate-pulse" />
                <span className="text-[11px] font-semibold text-[#F4DDE6] tracking-wide uppercase">
                  FDA compliant design principles
                </span>
              </div>
            </motion.div>

            {/* Right Column: Safety Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {safetyItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: index * 0.12 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-3xl border border-neutral-100/80 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_15px_35px_rgba(120,15,50,0.03)] cursor-pointer flex flex-col justify-between text-left"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FDF9FA] text-[#780F32] border border-[#780F32]/5 shadow-sm mb-4">
                      <Activity className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400 font-light">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

export default AboutPage;
