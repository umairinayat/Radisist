import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";
import PublicPageShell from "./PublicPageShell";

const contactCards = [
  {
    icon: <Mail className="h-5 w-5" />,
    label: "Email",
    value: "support@radisist.com",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    label: "Phone",
    value: "+1 (555) 123-4567",
  },
  {
    icon: <MapPin className="h-5 w-5" />,
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
      {/* UNIQUE HERO SECTION: Centered header for a clean, layout entry */}
      <section className="relative px-6 sm:px-10 lg:px-16 pt-16 pb-8 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#780F32]/15 bg-[#FDF9FA] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#780F32] shadow-sm">
            <Sparkles className="h-4 w-4" />
            Contact
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl lg:text-6xl tracking-tight">
            Need help with <span className="text-[#780F32]">Radisist?</span>
          </h1>
          <p className="mt-5 text-sm sm:text-base leading-relaxed text-neutral-500 max-w-2xl mx-auto font-light">
            Reach out for patient support, radiologist workflow questions, demo feedback, or safety-related concerns about AI-assisted reporting. We are here to assist.
          </p>
        </motion.div>
      </section>

      {/* CORE CONTENT: 2-Column form and details section */}
      <section className="px-6 sm:px-10 lg:px-16 pb-20 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] mt-8">
          
          {/* Left Details Aside */}
          <motion.aside
            initial={{ opacity: 0, x: -35 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="rounded-[2.5rem] bg-gradient-to-br from-[#780F32] to-[#5C0A25] p-8 sm:p-10 text-white shadow-[0_20px_50px_rgba(120,15,50,0.15)] flex flex-col justify-between self-start text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C9DCF6]">
                Contact details
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight leading-snug">
                The right message should reach the right reviewer.
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-[#F4DDE6]/90 font-light">
                For urgent symptoms or emergencies, contact local emergency services immediately. Radisist is not a replacement for direct medical care.
              </p>

              <div className="mt-8 space-y-4">
                {contactCards.map((card, index) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.12 }}
                    whileHover={{ x: 6, transition: { duration: 0.2 } }}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C9DCF6] text-[#780F32] shadow-sm">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#F4DDE6]/80 uppercase">
                        {card.label}
                      </p>
                      <p className="mt-1 text-xs font-semibold">{card.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* Right Form Card */}
          <motion.div
            initial={{ opacity: 0, x: 35 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="rounded-[2.5rem] border border-neutral-100 bg-[#FDF9FA]/30 p-6 sm:p-8 shadow-sm backdrop-blur-sm text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#780F32]">
                Send a message
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-neutral-900 tracking-tight">
                Tell us what you need.
              </h2>
            </div>

            <form className="mt-6 grid gap-4 text-xs" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 font-bold text-neutral-800">
                  Full name
                  <input
                    required
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5"
                  />
                </label>
                <label className="grid gap-2 font-bold text-neutral-800">
                  Email
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5"
                  />
                </label>
              </div>

              <label className="grid gap-2 font-bold text-neutral-800">
                Topic
                <select
                  name="topic"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5 font-semibold text-neutral-700 cursor-pointer"
                >
                  <option>Patient report question</option>
                  <option>Radiologist dashboard support</option>
                  <option>AI safety or low-confidence concern</option>
                  <option>FYP demo feedback</option>
                </select>
              </label>

              <label className="grid gap-2 font-bold text-neutral-800">
                Message
                <textarea
                  required
                  name="message"
                  rows="5"
                  placeholder="Write your message here..."
                  className="resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-[#780F32]/40 focus:ring-2 focus:ring-[#780F32]/5"
                ></textarea>
              </label>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#780F32] px-6 py-3 font-semibold text-white shadow-md shadow-[#780F32]/10 cursor-pointer transition-all duration-205 hover:opacity-95"
              >
                Submit message
                <Send className="h-3.5 w-3.5" />
              </motion.button>

              {submitted && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 font-semibold text-emerald-700"
                >
                  Message captured for the demo. A backend email endpoint can be connected next for live delivery.
                </motion.p>
              )}
            </form>
          </motion.div>

        </div>
      </section>
    </PublicPageShell>
  );
}

export default ContactPage;
