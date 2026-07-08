import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Header from "../Components/Header";
import Footer from "../Components/Footer";

gsap.registerPlugin(ScrollTrigger);

export default function PublicLayout() {
  const location = useLocation();
  const lenisRef = useRef(null);
  const [isPending, setIsPending] = useState(false);
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    // 1. Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    // 2. Connect Lenis scroll events to GSAP ScrollTrigger updates
    lenis.on("scroll", ScrollTrigger.update);

    // 3. Connect GSAP ticker to run Lenis raf (requestAnimationFrame) loop
    const updateRaf = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateRaf);
    gsap.ticker.lagSmoothing(0);

    // 4. Cleanup
    return () => {
      gsap.ticker.remove(updateRaf);
      lenis.destroy();
      ScrollTrigger.killAll();
    };
  }, []);

  // 5. Scroll Restoration and Loading Trigger on pathname change
  useEffect(() => {
    if (lenisRef.current) {
      window.scrollTo(0, 0);
      lenisRef.current.scrollTo(0, { immediate: true });
    }

    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      setIsPending(true);
      const timer = setTimeout(() => {
        setIsPending(false);
      }, 450); // Faster, lighter 450ms duration
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div className="w-full min-h-screen bg-[#FFFDFE] text-[#17121A] flex flex-col justify-between selection:bg-[#780F32]/10 selection:text-[#780F32]">
      {/* Shared Navbar Header */}
      <Header />

      {/* Main Content Area with instant mount and soft fade-in transition */}
      <main className="flex-1 w-full relative">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="w-full"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Shared Footer block */}
      <Footer />

      {/* Subtle top progress bar loading indicator */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "80%" }}
            exit={{ width: "100%", opacity: 0 }}
            transition={{
              width: { duration: 0.4, ease: "easeOut" },
              opacity: { duration: 0.15, ease: "easeIn" }
            }}
            className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-[#780F32] via-[#91254A] to-[#B03A64] shadow-[0_0_8px_rgba(120,15,50,0.35)] z-[99999]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
