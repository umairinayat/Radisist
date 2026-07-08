import React from "react";
import "../../index.css";
import ShinyPlateBadge from "../Components/ShinyPlateBadge";
import { GoArrowUpRight } from "react-icons/go";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ThreeHeroBackground from "../Components/ThreeHeroBackground";

// Premium icons
import { ShieldCheck, BrainCircuit, Activity, Cpu } from "lucide-react";

function HeroLayout() {
  const navigate = useNavigate();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      id="home"
      className="relative z-10 flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#FFFDFE] via-[#FDF9FB] to-[#EDEBFF] px-6 py-16 md:min-h-[calc(100vh-6rem)] lg:px-16 lg:py-24"
    >
      {/* Interactive 3D WebGL Neural Connectome Background */}
      <ThreeHeroBackground />

      {/* Grid overlay for tech look */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,#780f3206_1px,transparent_1px),linear-gradient(to_bottom,#780f3206_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-10 w-full text-center"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <ShinyPlateBadge />
        </motion.div>

        {/* Centered Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl font-extrabold tracking-tight text-neutral-950 sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] max-w-4xl"
        >
          Upload, Analyze &amp; Download <br className="hidden sm:inline" />
          <span className="relative inline-block bg-gradient-to-r from-[#6C1B36] via-[#91254A] to-[#B03A64] bg-clip-text text-transparent font-black">
            medical-grade
          </span>{" "}
          reports in minutes.
        </motion.h1>

        {/* Centered Tagline */}
        <motion.p
          variants={itemVariants}
          className="text-base text-[#524E54] sm:text-lg md:text-xl max-w-2xl leading-relaxed"
        >
          A precision-driven mammography assistant enabling timely, highly reliable
          breast cancer detection and deep-learning insights for better clinical decisions.
        </motion.p>

        {/* Centered Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center"
        >
          <button
            onClick={() => navigate("/login")}
            className="
              group relative flex items-center justify-center gap-3
              overflow-hidden rounded-full px-8 py-3.5 
              text-white text-base font-semibold 
              bg-gradient-to-r from-[#5B1C2E] to-[#780F32] 
              shadow-[0_10px_25px_rgba(120,15,50,0.25)]
              hover:shadow-[0_15px_35px_rgba(120,15,50,0.35)]
              transition-all duration-300 ease-in-out 
              active:scale-95 cursor-pointer z-10
            "
          >
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute left-0 aspect-square w-full origin-center -translate-x-full rounded-full bg-gradient-to-r from-[#431423] to-[#260510] transition-all duration-500 ease-in-out group-hover:-translate-x-0 group-hover:scale-150"></span>
            </span>

            <span className="relative z-10">Start Free Analysis</span>

            <span className="relative z-10 flex items-center justify-center w-8 h-8 bg-white/10 rounded-full group-hover:bg-white group-hover:-translate-y-[1px] transition-all duration-300">
              <GoArrowUpRight className="w-4 h-4 text-white group-hover:text-[#780F32] transition-colors duration-300" />
            </span>
          </button>

          <button
            onClick={() => navigate("/about")}
            className="
              group relative flex items-center justify-center gap-2
              rounded-full border-2 border-[#780F32]/25 bg-white/60 backdrop-blur-sm px-8 py-3.5 
              text-[#780F32] text-base font-semibold transition-all duration-300 
              hover:bg-white hover:border-[#780F32] hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)]
              active:scale-95 cursor-pointer
            "
          >
            <span>Learn More</span>
          </button>
        </motion.div>

        {/* Centered micro stats banner */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 mt-2 text-[#524E54] text-xs sm:text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#780F32]" />
            <span>HIPAA Compliant</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 hidden sm:block" />
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#780F32]" />
            <span>Deep Learning v4 AI</span>
          </div>
        </motion.div>

        {/* Center: Mammogram Scan Mockup */}
        <motion.div
          variants={itemVariants}
          className="relative flex items-center justify-center w-full max-w-2xl mt-6"
        >
          {/* Decorative glowing backdrops */}
          <div className="absolute -top-10 w-64 h-64 rounded-full bg-[#780F32]/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 w-64 h-64 rounded-full bg-[#C9DCF6]/40 blur-3xl pointer-events-none" />

          {/* Centered glassmorphic mockup frame */}
          <div className="relative w-full rounded-[2.5rem] border border-white/60 bg-white/70 p-4 sm:p-6 shadow-[0_30px_90px_rgba(48,24,37,0.12)] backdrop-blur-md">
            {/* Header of mockup */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#780F32] text-white">
                  <Activity className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-neutral-800">Radisist Analyzer</h4>
                  <p className="text-[10px] text-neutral-400">Patient ID: DICOM_ANON_0284</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>AI Connected</span>
              </div>
            </div>

            {/* Mammogram Scan Simulator */}
            <div className="relative w-full aspect-[16/9] rounded-2xl bg-neutral-950 overflow-hidden flex items-center justify-center border border-neutral-850">
              {/* Simulated Mammogram SVG Outline */}
              <svg className="w-1/2 h-4/5 text-neutral-700 opacity-60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 10 C30 35, 10 60, 20 85 C25 90, 75 90, 80 85 C90 60, 70 35, 50 10 Z" fill="rgba(255,255,255,0.02)" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                {/* Simulated abnormal node glow */}
                <circle cx="48" cy="50" r="8" stroke="#780F32" strokeWidth="1.5" className="animate-pulse" fill="rgba(120, 15, 50, 0.15)" />
                <path d="M48 50 L35 30" stroke="#780F32" strokeWidth="1" strokeDasharray="2 2" />
                {/* Pointer lines */}
                <circle cx="35" cy="30" r="2" fill="#780F32" />
              </svg>

              {/* Glowing vertical scanning line */}
              <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-[#780F32] to-transparent shadow-[0_0_15px_#780F32] animate-[scan_3.5s_ease-in-out_infinite]" />

              {/* Scan HUD Overlay details */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2 text-[10px] text-white text-left">
                <div className="font-semibold text-[#C9DCF6]">Density: Category C</div>
                <div>Contrast: 84%</div>
              </div>
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2 text-[10px] text-white font-mono text-left">
                FPS: 60.0<br/>
                ERR: 0.001
              </div>
            </div>

            {/* AI Diagnostics details pane */}
            <div className="grid grid-cols-2 gap-4 mt-4 text-left">
              <div className="rounded-xl bg-[#EDEBFF] p-3 border border-[#780F32]/10 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#780F32]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Classification</span>
                </div>
                <div className="mt-2">
                  <div className="text-xs sm:text-sm font-bold text-neutral-800">BI-RADS Category 4</div>
                  <div className="text-[9px] text-[#780F32] font-semibold">Suspicious Abnormality</div>
                </div>
              </div>

              <div className="rounded-xl bg-[#EDEBFF] p-3 border border-[#780F32]/10 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#780F32]">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">AI Confidence</span>
                </div>
                <div className="mt-1">
                  <div className="flex items-end gap-1">
                    <span className="text-base sm:text-xl font-extrabold text-neutral-900">98.4%</span>
                    <span className="text-[10px] text-emerald-600 font-bold mb-0.5">accuracy</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-[#780F32] h-full rounded-full w-[98.4%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default HeroLayout;
