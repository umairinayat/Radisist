import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import "../../index.css";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import coma from "../Images/coma.svg";
import illustration from "../Images/illustration.svg";
import illustrationMobile from "../Images/illustrationMobile.svg";
import HowItWorks from "./HowItWorks";

import lasthero from "../Images/lasthero.svg";

// importing cards icons
import HealthcareReimagined from "./HealthcareReimagined";
import Footer from "../Components/Footer";

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

  // Mission paragraph animation (with slower timing and proper spacing)
  useEffect(() => {
    const paragraph = missionParaRef.current;
    const words = paragraph.textContent.split(" ");

    paragraph.textContent = "";

    words.forEach((word) => {
      const span = document.createElement("span");
      span.textContent = word + " ";
      span.style.opacity = 0;
      span.style.display = "inline-block";
      span.style.transform = "translateY(20px)";
      paragraph.appendChild(span);
    });

    // Slower and smoother mission text animation
    gsap.to(paragraph.querySelectorAll("span"), {
      opacity: 1,
      y: 0,
      color: "#FFFFFF",
      ease: "power3.out",
      stagger: 0.25, // slowed from 0.08 to 0.15
      duration: 1.2,
      scrollTrigger: {
        trigger: paragraph,
        start: "top 85%",
        end: "bottom 60%",
        scrub: 1.2,
      },
    });
  }, []);

  // GSAP Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const desktopIllus = document.querySelector(".illustration-desktop");

      if (desktopIllus) {
        gsap.fromTo(
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
      }
    });

    return () => ctx.revert();
  }, []);

  // Animate "How It Works" text and cards
  useEffect(() => {
    const howItWorks = document.querySelector(".how-it-works-text");
    const cards = document.querySelectorAll(".work-card");

    // --- Smooth text fade and lift ---
    gsap.fromTo(
      howItWorks,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: howItWorks,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // --- Smooth, modern card reveal ---
    gsap.fromTo(
      cards,
      { opacity: 0, y: 80, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.3,
        ease: "power3.out",
        stagger: 0.25,
        scrollTrigger: {
          trigger: cards[0],
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    );
  }, []);

  return (
    <section id="mission" className="relative z-50 bg-[#780F32] w-full h-screen overflow-x-clip overflow-y-visible isolate">
      {/* Coma Image */}
      <img
        className="opacity-4 absolute z-10 top-4 left-4 w-200 h-200 text-white"
        src={coma}
        alt="coma"
      />
      <img
        className="md:hidden opacity-10 absolute z-10 top-0 left-0 w-40 h-40 text-white"
        src={coma}
        alt="coma"
      />

      {/* Wrapper */}
      <div className="z-10 max-w-7xl flex flex-col lg:block h-full md:overflow-visible overflow-x-hidden">
        {/* Text Block */}
        <div className="lg:w-3/5 xl:w-3/4 md:px-20 md:py-17 px-14 py-10">
          <div className="flex gap-6 items-center">
            <TargetIcon className="lg:inline hidden w-20 h-20 text-[#EDEBFF]" />
            <div className="lg:inline-block hidden w-px h-12 bg-[#EDEBFF] opacity-50"></div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#EDEBFF]">
              Our Mission
            </h2>
          </div>

          {/* Paragraph with scroll animation */}
          <p
            ref={missionParaRef}
            className="mt-6 md:text-2xl font-light text-[16px] text-[#EDEBFF] whitespace-pre-wrap"
          >
            Our mission is to empower radiologists and patients with AI-powered
            diagnostics that deliver fast, accurate, and reliable results. By
            bridging advanced technology with medical expertise, we aim to make
            diagnosis quicker, decisions smarter, and patient care stronger.
          </p>

          <div className="mt-10 h-px w-full bg-[#EDEBFF] opacity-50"></div>
        </div>

        {/* Illustration (desktop + mobile) */}
        <div className="flex items-center justify-end w-full h-full">
          <img
            ref={illustrationRef}
            className="illustration-desktop hidden lg:inline lg:w-[550px] lg:absolute lg:right-0 lg:bottom-0 lg:top-0 z-30"
            src={illustration}
            alt="Radisist AI platform on laptop"
          />
          <img
            ref={illustrationRef}
            className="illustration-mobile lg:hidden w-5/6 object-contain absolute z-10 right-0"
            src={illustrationMobile}
            alt="Radisist AI platform on laptop"
          />
        </div>
      </div>

      {/* How It Works Section */}
      <HowItWorks />

      {/* HealthCare Reimagined Section */}
      <HealthcareReimagined />

      {/* Explore Future Start Here Section + Footer - Black theme wrapper */}
      <div className="bg-black">
        <section className="relative w-full overflow-hidden">

          {/* Background image (curves preserved) */}
          <img
            src={lasthero}
            alt="Future Starts Here Background"
            className="w-full object-cover md:h-full h-[90vh]"
          />

          {/* Overlay content */}
          <div
            className="
      absolute inset-0 
      flex flex-col items-center md:items-center 
      justify-center md:justify-start 
      text-white 
      px-6 sm:px-10 md:px-16 lg:px-24 
      text-center md:text-left 
      pt-0 md:pt-32 md:mt-40
    "
          >
            {/* Heading */}
            <h1 className="md:w-2/3 text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl">
              The <span className="bg-black text-white px-3 rounded-md font-extrabold">Future</span> Starts Here.
            </h1>

            {/* Description */}
            <p className="w-full sm:mt-6 text-[13px] sm:text-base md:text-lg lg:text-xl max-w-md sm:max-w-xl opacity-90">
              Together, we're redefining the future of healthcare — blending human expertise with innovation to create a world where technology heals with precision and compassion.
            </p>

            {/* CTA Button */}
            <button className="mt-8 bg-white text-[#780F32] text-sm sm:text-base px-8 sm:px-10 md:px-12 py-2 sm:py-3 rounded-full font-semibold hover:bg-[#780F32] hover:text-white transition-all duration-300">
              Join the Future
            </button>
          </div>
        </section>

        {/* Footer Section */}
        <Footer />
      </div>

    </section>
  );
}
