import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  HeartPulse,
  Microscope,
  Radar,
  ShieldAlert,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import PublicPageShell from "./PublicPageShell";

const missionPillars = [
  {
    icon: <Radar className="h-6 w-6 text-[#780F32]" />,
    title: "Detect earlier",
    text: "Use AI to highlight possible abnormalities and support early clinical attention.",
  },
  {
    icon: <BadgeCheck className="h-6 w-6 text-[#780F32]" />,
    title: "Review responsibly",
    text: "Keep final reporting decisions inside a clear radiologist workflow.",
  },
  {
    icon: <HeartPulse className="h-6 w-6 text-[#780F32]" />,
    title: "Explain clearly",
    text: "Translate technical AI findings into patient-friendly summaries and clinician-ready reports.",
  },
];

function MissionPage() {
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
      {/* UNIQUE HERO SECTION: Left text, Right custom stacked pillars layout */}
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
              Our Mission
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl lg:text-6xl tracking-tight">
              Make imaging support <span className="text-[#780F32]">faster, safer, and clearer</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-neutral-500 sm:text-lg">
              Our mission is to bridge AI capability with clinical responsibility, helping radiologists work faster while giving patients clearer access to finalized medical reports.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#780F32] px-7 py-3 text-sm font-bold text-white shadow-[0_15px_35px_rgba(120,15,50,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5F102A]"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          {/* Hero Right Content: Layered Stack of Mission Cards */}
          <motion.div variants={itemVariants} className="relative flex justify-center py-8">
            <div className="absolute inset-4 rounded-[2.5rem] bg-[#C9DCF6] blur-3xl opacity-20" />
            
            {/* Unique Stacked Pillars Visual */}
            <div className="relative w-full max-w-sm h-72 flex items-center justify-center">
              
              {/* Back Card (Detect Earlier) */}
              <motion.div
                whileHover={{ rotate: 0, y: -32, scale: 1.02 }}
                className="absolute w-[90%] bg-[#FDF9FA] border border-neutral-100 rounded-3xl p-6 shadow-md -rotate-6 translate-y-[-24px] opacity-75 cursor-pointer transition-all duration-300 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-[#780F32] shadow-sm mb-3">
                  <Radar className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Early Detection Support</h4>
                <p className="text-[11px] text-neutral-400 mt-1 font-light">Pre-screening flags suspicious nodes rapidly.</p>
              </motion.div>

              {/* Middle Card (Review Responsibly) */}
              <motion.div
                whileHover={{ rotate: 0, y: -32, scale: 1.02 }}
                className="absolute w-[95%] bg-[#FFFDFE] border border-neutral-100/90 rounded-3xl p-6 shadow-lg rotate-3 translate-y-[6px] opacity-90 cursor-pointer transition-all duration-300 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8EEFF] text-blue-700 shadow-sm mb-3">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Responsibility Check</h4>
                <p className="text-[11px] text-neutral-400 mt-1 font-light">Physician approval is mandated before release.</p>
              </motion.div>

              {/* Front Card (Explain Clearly) */}
              <motion.div
                whileHover={{ y: -32, scale: 1.02 }}
                className="absolute w-full bg-white border border-neutral-100 rounded-3xl p-6 shadow-xl translate-y-[36px] cursor-pointer transition-all duration-300 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6FDF0] text-emerald-700 shadow-sm mb-3">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Explainable AI Interface</h4>
                <p className="text-[11px] text-neutral-500 mt-1 font-light">Translations of raw AI weights into clinical reports.</p>
              </motion.div>

            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 1: Why Radisist Exists */}
      <section className="px-6 sm:px-10 lg:px-16 py-20 bg-gradient-to-r from-[#780F32] to-[#5C0A25] text-white relative">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center pb-12 border-b border-white/10 text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C9DCF6]/90">
                Why Radisist exists
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                The goal is not just automation. The goal is better care flow.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[#F3DCE5] opacity-95 font-light">
              Medical imaging teams face heavy workloads, delayed reporting, and pressure to make quick decisions. Radisist focuses on the gap between speed and safety by combining AI-generated evidence with radiologist review, citations, quality checks, and final patient communication.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {missionPillars.map((pillar, index) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 cursor-pointer text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9DCF6] text-[#780F32] shadow-sm">
                  {pillar.icon}
                </div>
                <h3 className="mt-6 text-xl font-bold">{pillar.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-[#F3DCE5] opacity-90 font-light">{pillar.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: Principles Checklist */}
      <section className="px-6 sm:px-10 lg:px-16 py-20 bg-white relative">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-neutral-100 bg-[#FDF9FA]/50 p-6 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#780F32]">
                Responsible AI principles
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Every feature should answer one clinical safety question.
              </h2>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Is the uploaded image supported and readable?",
                "How confident is the AI pipeline in this case?",
                "What evidence, heatmap, or segmentation supports the finding?",
                "Has a radiologist approved the final report?",
              ].map((question, index) => (
                <motion.div
                  key={question}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl bg-white border border-neutral-100 p-6 shadow-sm flex flex-col justify-between cursor-pointer text-left"
                >
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#780F32] uppercase">
                      Check {index + 1}
                    </span>
                    <p className="mt-4 text-sm font-semibold leading-relaxed text-neutral-800">
                      {question}
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

export default MissionPage;
