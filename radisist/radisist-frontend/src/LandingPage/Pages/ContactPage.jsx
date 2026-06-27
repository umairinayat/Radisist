import React, { useState } from "react";
import {
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import PublicPageShell from "./PublicPageShell";

const heroCards = [
  {
    icon: <MessageSquareText className="h-5 w-5" />,
    title: "Project support",
    text: "Ask questions about scans, reports, review flow, or the FYP demo experience.",
  },
  {
    icon: <UserRoundCheck className="h-5 w-5" />,
    title: "Radiologist workflow",
    text: "Use this channel for review dashboard, final report, and PDF export feedback.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Safety concerns",
    text: "Flag low-confidence output, unsupported images, or report wording that needs correction.",
  },
  {
    icon: <Clock3 className="h-5 w-5" />,
    title: "Response routing",
    text: "Messages can be routed later to admin, radiologist, or patient support roles.",
  },
];

const contactCards = [
  {
    icon: <Mail className="h-6 w-6" />,
    label: "Email",
    value: "support@radisist.com",
  },
  {
    icon: <Phone className="h-6 w-6" />,
    label: "Phone",
    value: "+1 (555) 123-4567",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    label: "Location",
    value: "Medical Innovation Lab, Healthcare City",
  },
];

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    setSubmitted(true);
  };

  return (
    <PublicPageShell
      eyebrow="Contact"
      title="Need help with"
      highlightedTitle="Radisist?"
      description="Reach out for patient support, radiologist workflow questions, demo feedback, or safety-related concerns about AI-assisted reporting."
      heroCards={heroCards}
    >
      <section className="px-6 sm:px-10 lg:px-16 py-16 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="rounded-[2.5rem] bg-[#780F32] p-8 text-white shadow-[0_30px_80px_rgba(120,15,50,0.18)]">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#C9DCF6]">
              Contact details
            </p>
            <h2 className="mt-4 text-3xl font-black">
              The right message should reach the right reviewer.
            </h2>
            <p className="mt-4 leading-7 text-[#F4DDE6]">
              For urgent symptoms or emergencies, contact local emergency
              services immediately. Radisist is not a replacement for direct
              medical care.
            </p>

            <div className="mt-8 space-y-4">
              {contactCards.map((card) => (
                <div
                  key={card.label}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-white/8 p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C9DCF6] text-[#780F32]">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#F1D8E2]">
                      {card.label}
                    </p>
                    <p className="mt-1 font-semibold">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="rounded-[2.5rem] border border-[#780F32]/10 bg-[#F8F3F6] p-6 sm:p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#780F32]">
                Send a message
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#211620]">
                Tell us what you need.
              </h2>
            </div>

            <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#332432]">
                  Full name
                  <input
                    required
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    className="rounded-2xl border border-[#780F32]/10 bg-white px-4 py-3 font-medium outline-none transition focus:border-[#780F32]/40 focus:ring-4 focus:ring-[#780F32]/10"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#332432]">
                  Email
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="rounded-2xl border border-[#780F32]/10 bg-white px-4 py-3 font-medium outline-none transition focus:border-[#780F32]/40 focus:ring-4 focus:ring-[#780F32]/10"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold text-[#332432]">
                Topic
                <select
                  name="topic"
                  className="rounded-2xl border border-[#780F32]/10 bg-white px-4 py-3 font-medium outline-none transition focus:border-[#780F32]/40 focus:ring-4 focus:ring-[#780F32]/10"
                >
                  <option>Patient report question</option>
                  <option>Radiologist dashboard support</option>
                  <option>AI safety or low-confidence concern</option>
                  <option>FYP demo feedback</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#332432]">
                Message
                <textarea
                  required
                  name="message"
                  rows="6"
                  placeholder="Write your message here..."
                  className="resize-none rounded-2xl border border-[#780F32]/10 bg-white px-4 py-3 font-medium outline-none transition focus:border-[#780F32]/40 focus:ring-4 focus:ring-[#780F32]/10"
                ></textarea>
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-[#780F32] px-7 py-3 text-sm font-bold text-white shadow-[0_20px_45px_rgba(120,15,50,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5F102A]"
              >
                Submit message
                <Send className="h-4 w-4" />
              </button>

              {submitted && (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Message captured for the demo. A backend email endpoint can
                  be connected next for live delivery.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

export default ContactPage;
