import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import Header from "../Components/Header";
import Footer from "../Components/Footer";

function PublicPageShell({
  eyebrow,
  title,
  highlightedTitle,
  description,
  heroCards = [],
  children,
}) {
  return (
    <div className="min-h-screen bg-[#F7F2F5] text-[#17121A] overflow-hidden">
      <Header />

      <main>
        <section className="relative isolate px-6 sm:px-10 lg:px-16 py-16 md:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#780F32]/15 blur-3xl"></div>
            <div className="absolute top-40 -left-20 h-72 w-72 rounded-full bg-[#C9DCF6]/70 blur-3xl"></div>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#780F32]/20 to-transparent"></div>
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#780F32]/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#780F32] shadow-sm">
                <Sparkles className="h-4 w-4" />
                {eyebrow}
              </div>

              <h1 className="mt-7 max-w-4xl text-4xl font-black leading-tight text-[#211620] sm:text-5xl lg:text-7xl">
                {title}{" "}
                <span className="text-[#780F32]">{highlightedTitle}</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-[#675B66] sm:text-lg">
                {description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#780F32] px-7 py-3 text-sm font-bold text-white shadow-[0_20px_45px_rgba(120,15,50,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5F102A]"
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
            </div>

            <div className="relative">
              <div className="absolute inset-4 rounded-[3rem] bg-[#780F32] blur-2xl opacity-10"></div>
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_30px_90px_rgba(48,24,37,0.14)] backdrop-blur">
                <div className="rounded-[2rem] bg-[#780F32] p-6 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#EDEBFF]/80">
                    Radisist workflow
                  </p>
                  <h2 className="mt-4 text-3xl font-black">
                    AI insight with human clinical review.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[#F3DCE5]">
                    Upload scans, run explainable analysis, route uncertain
                    cases for radiologist approval, and share patient-ready
                    reports safely.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {heroCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-3xl border border-[#780F32]/10 bg-[#F9F4F7] p-5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#780F32] shadow-sm">
                        {card.icon}
                      </div>
                      <h3 className="mt-4 text-base font-black text-[#261827]">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#716571]">
                        {card.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {children}
      </main>

      <Footer />
    </div>
  );
}

export default PublicPageShell;
