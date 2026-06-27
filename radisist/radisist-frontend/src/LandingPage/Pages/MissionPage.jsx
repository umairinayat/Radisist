import React from "react";
import {
  BadgeCheck,
  HeartPulse,
  Microscope,
  Radar,
  ShieldAlert,
  Users,
} from "lucide-react";
import PublicPageShell from "./PublicPageShell";

const heroCards = [
  {
    icon: <HeartPulse className="h-5 w-5" />,
    title: "Faster decisions",
    text: "Reduce waiting time by helping clinicians move from scan upload to reviewable findings quickly.",
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: "Safer uncertainty",
    text: "Low-confidence or poor-quality scans are clearly marked for radiologist review.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Human oversight",
    text: "Radiologists remain the final authority before reports are released to patients.",
  },
  {
    icon: <Microscope className="h-5 w-5" />,
    title: "Learning-focused",
    text: "The platform is built as an FYP-ready system that demonstrates responsible clinical AI design.",
  },
];

const missionPillars = [
  {
    icon: <Radar className="h-8 w-8" />,
    title: "Detect earlier",
    text: "Use AI to highlight possible abnormalities and support early clinical attention.",
  },
  {
    icon: <BadgeCheck className="h-8 w-8" />,
    title: "Review responsibly",
    text: "Keep final reporting decisions inside a clear radiologist workflow.",
  },
  {
    icon: <HeartPulse className="h-8 w-8" />,
    title: "Explain clearly",
    text: "Translate technical AI findings into patient-friendly summaries and clinician-ready reports.",
  },
];

function MissionPage() {
  return (
    <PublicPageShell
      eyebrow="Our Mission"
      title="Make imaging support"
      highlightedTitle="faster, safer, and clearer"
      description="Our mission is to bridge AI capability with clinical responsibility, helping radiologists work faster while giving patients clearer access to finalized medical reports."
      heroCards={heroCards}
    >
      <section className="px-6 sm:px-10 lg:px-16 py-16 bg-[#780F32] text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#C9DCF6]">
                Why Radisist exists
              </p>
              <h2 className="mt-4 text-3xl font-black sm:text-5xl">
                The goal is not just automation. The goal is better care flow.
              </h2>
            </div>
            <p className="text-base leading-8 text-[#F3DCE5] sm:text-lg">
              Medical imaging teams face heavy workloads, delayed reporting,
              and pressure to make quick decisions. Radisist focuses on the
              gap between speed and safety by combining AI-generated evidence
              with radiologist review, citations, quality checks, and final
              patient communication.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {missionPillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-[2rem] border border-white/10 bg-white/8 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/12"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9DCF6] text-[#780F32]">
                  {pillar.icon}
                </div>
                <h3 className="mt-6 text-2xl font-black">{pillar.title}</h3>
                <p className="mt-3 leading-7 text-[#F3DCE5]">{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10 lg:px-16 py-16 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2.5rem] bg-[#F8F3F6] p-6 sm:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#780F32]">
                Responsible AI principles
              </p>
              <h2 className="mt-4 text-3xl font-black text-[#211620] sm:text-5xl">
                Every feature should answer one clinical safety question.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {[
                "Is the uploaded image supported and readable?",
                "How confident is the AI pipeline in this case?",
                "What evidence, heatmap, or segmentation supports the finding?",
                "Has a radiologist approved the final report?",
              ].map((question, index) => (
                <div
                  key={question}
                  className="rounded-[1.5rem] bg-white p-6 shadow-sm"
                >
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[#780F32]">
                    Check {index + 1}
                  </span>
                  <p className="mt-4 text-lg font-bold leading-7 text-[#2A1A28]">
                    {question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

export default MissionPage;
