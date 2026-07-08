import React, { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Mouse coordinate and click state refs
  const mouseCoords = useRef({ x: 0, y: 0 });
  const ringCoords = useRef({ x: 0, y: 0 });
  const isClickedRef = useRef(false);

  useEffect(() => {
    // Check for touch devices
    const checkTouchDevice = () => {
      const hasTouch = 
        "ontouchstart" in window || 
        navigator.maxTouchPoints > 0 || 
        window.matchMedia("(pointer: coarse)").matches;
      setIsTouchDevice(hasTouch);
    };

    checkTouchDevice();

    if (isTouchDevice) return;

    // Track real mouse position
    const handleMouseMove = (e) => {
      mouseCoords.current.x = e.clientX;
      mouseCoords.current.y = e.clientY;
      setIsHidden(false);
    };

    const handleMouseDown = () => {
      isClickedRef.current = true;
    };

    const handleMouseUp = () => {
      isClickedRef.current = false;
    };

    const handleMouseLeave = () => {
      setIsHidden(true);
    };

    const handleMouseEnter = () => {
      setIsHidden(false);
    };

    // Listen to hover states for interactive tags globally
    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      const isInteractive =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("cursor-pointer") ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";

      setIsHovered(!!isInteractive);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    // Smooth trailing animation loop (using LERP)
    let animFrameId;
    const animateCursor = () => {
      // 1. Instantly move inner dot and scale it on click
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseCoords.current.x}px, ${mouseCoords.current.y}px, 0) scale(${isClickedRef.current ? 1.6 : 1})`;
      }

      // 2. Interpolate outer ring towards dot position (0.12 speed for buttery lagging lag effect) and contract it on click
      const lerpSpeed = 0.12;
      ringCoords.current.x += (mouseCoords.current.x - ringCoords.current.x) * lerpSpeed;
      ringCoords.current.y += (mouseCoords.current.y - ringCoords.current.y) * lerpSpeed;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringCoords.current.x}px, ${ringCoords.current.y}px, 0) scale(${isClickedRef.current ? 0.75 : 1})`;
      }

      animFrameId = requestAnimationFrame(animateCursor);
    };

    animFrameId = requestAnimationFrame(animateCursor);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [isTouchDevice]);

  // Hide on touch devices
  if (isTouchDevice) return null;

  return (
    <>
      {/* Inner Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 h-2 w-2 rounded-full bg-[#780F32] pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform] duration-150 ease-out ${
          isHidden ? "opacity-0" : "opacity-100"
        }`}
        style={{ willChange: "transform" }}
      />
      {/* Outer Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 h-10 w-10 rounded-full border border-[#780F32]/40 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 transition-[opacity,width,height,background-color,border-color,transform] duration-200 ease-out will-change-transform ${
          isHidden ? "opacity-0 scale-50" : "opacity-100"
        } ${
          isHovered
            ? "w-14 h-14 bg-[#780F32]/10 border-[#780F32]/20"
            : "w-10 h-10 bg-transparent"
        }`}
      />
    </>
  );
}
