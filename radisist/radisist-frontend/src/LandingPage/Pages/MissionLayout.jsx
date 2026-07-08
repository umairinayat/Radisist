import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import "../../index.css";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import coma from "../Images/coma.svg";
import illustration from "../Images/illustration.svg";
import illustrationMobile from "../Images/illustrationMobile.svg";

gsap.registerPlugin(ScrollTrigger);

const TargetIcon = (props) => (
  <svg
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

export default function MissionLayout() {
  const missionParaRef = useRef(null);
  const illustrationRef = useRef(null);

  // Mission paragraph animation
  useEffect(() => {
    const paragraph = missionParaRef.current;
    if (!paragraph) return;

    const text = paragraph.textContent || "";
    const words = text.split(" ");

    paragraph.textContent = "";

    words.forEach((word) => {
      const span = document.createElement("span");
      span.textContent = word + " ";
      span.style.opacity = "0";
      span.style.display = "inline-block";
      span.style.transform = "translateY(20px)";
      paragraph.appendChild(span);
    });

    const trigger = gsap.to(paragraph.querySelectorAll("span"), {
      opacity: 1,
      y: 0,
      color: "#FFFFFF",
      ease: "power3.out",
      stagger: 0.15,
      duration: 1.2,
      scrollTrigger: {
        trigger: paragraph,
        start: "top 85%",
        end: "bottom 60%",
        scrub: 1.2,
      },
    });

    return () => {
      trigger.scrollTrigger?.kill();
      trigger.kill();
    };
  }, []);

  // GSAP Illustration Animation
  useEffect(() => {
    const desktopIllus = document.querySelector(".illustration-desktop");
    if (!desktopIllus) return;

    const anim = gsap.fromTo(
      desktopIllus,
      { xPercent: 90, opacity: 0 },
      {
        xPercent: 0,
        opacity: 1,
        ease: "power3.out",
        duration: 2,
        scrollTrigger: {
          trigger: desktopIllus,
          start: "top 90%",
          end: "bottom 70%",
          scrub: false,
        },
      }
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  return (
    <section
      id="mission"
      className="relative z-20 bg-[#780F32] w-full min-h-[85vh] py-20 md:py-28 flex items-center overflow-x-clip isolate"
    >
      {/* Coma Image */}
      <img
        className="opacity-5 absolute z-10 top-6 left-6 w-48 h-48 text-white pointer-events-none"
        src={coma}
        alt="coma decor"
      />
      <img
        className="md:hidden opacity-10 absolute z-10 top-0 left-0 w-32 h-32 text-white pointer-events-none"
        src={coma}
        alt="coma decor mobile"
      />

      {/* Wrapper */}
      <div className="z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 w-full px-6 sm:px-8 md:px-12 relative">
        
        {/* Text Block */}
        <div className="w-full lg:w-3/5 flex flex-col justify-center">
          <div className="flex gap-4 items-center">
            <TargetIcon className="w-12 h-12 text-[#EDEBFF]" />
            <div className="w-px h-8 bg-[#EDEBFF] opacity-40"></div>
            <h2 className="text-3xl md:text-5xl font-black text-[#EDEBFF]">
              Our Mission
            </h2>
          </div>

          {/* Paragraph with scroll animation */}
          <p
            ref={missionParaRef}
            className="mt-8 text-lg sm:text-xl md:text-2xl font-light text-[#EDEBFF] leading-relaxed whitespace-pre-wrap"
          >
            Our mission is to empower radiologists and patients with AI-powered
            diagnostics that deliver fast, accurate, and reliable results. By
            bridging advanced technology with medical expertise, we aim to make
            diagnosis quicker, decisions smarter, and patient care stronger.
          </p>

          <div className="mt-10 h-px w-full bg-[#EDEBFF] opacity-30"></div>
        </div>

        {/* Custom Clinical Scan Mockup Card (replacing bad laptop SVG illustration) */}
        <div className="w-full lg:w-[45%] flex items-center justify-center lg:justify-end relative min-h-[350px] lg:min-h-0 z-30">
          <div className="w-full max-w-[460px] rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md text-white select-none">
            {/* Header of mockup */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9DCF6]">AI Diagnostic Engine</span>
              </div>
              <span className="text-[10px] text-white/50 font-mono">STATUS: ACTIVE</span>
            </div>

            {/* Simulated mammogram grid */}
            <div className="relative w-full aspect-[4/3] rounded-xl bg-black/60 overflow-hidden flex items-center justify-center border border-white/5">
              {/* Gridlines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
              
              {/* Scan target circle and box */}
              <div className="absolute border border-rose-500/80 rounded-lg p-2 flex flex-col items-center justify-center bg-rose-500/5 animate-pulse animate-[bounce_3s_infinite]" style={{ top: '35%', left: '30%' }}>
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-rose-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                </div>
                <span className="text-[8px] font-mono font-bold text-rose-400 mt-1">MASS_DET: 94.2%</span>
              </div>

              {/* Glowing vertical scanning line */}
              <div className="absolute top-0 bottom-0 left-0 w-[1.5px] bg-gradient-to-b from-transparent via-rose-500 to-transparent shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-[scan_3.2s_ease-in-out_infinite]" />

              <div className="absolute bottom-2.5 left-2.5 bg-black/40 border border-white/5 rounded px-2 py-1 text-[8px] font-mono">
                COORDS: X:42, Y:68
              </div>
            </div>

            {/* Diagnostic stats */}
            <div className="flex flex-col gap-2.5 mt-3.5 text-left">
              <div className="flex justify-between items-center bg-white/5 rounded-lg p-2.5 border border-white/5">
                <span className="text-[10px] text-white/70">AI Classification Target:</span>
                <span className="text-xs font-bold text-[#C9DCF6] uppercase">BI-RADS 4 (Suspicious)</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 rounded-lg p-2.5 border border-white/5">
                <span className="text-[10px] text-white/70">Processing speed:</span>
                <span className="text-xs font-mono font-bold text-emerald-400">0.024 SEC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
