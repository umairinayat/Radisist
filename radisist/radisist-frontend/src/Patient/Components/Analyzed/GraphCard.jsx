import React, { useEffect, useState } from "react";

export default function GraphCard({
  percentage = 80,
  title = "Title",
  color = "text-rose-800",
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="w-full max-w-[11rem] sm:max-w-[13rem] md:max-w-[16rem] h-52 sm:h-60 md:h-64 bg-white rounded-3xl shadow-[0_2px_80px_rgba(0,0,0,0.03)] flex flex-col justify-center items-center transform transition-all duration-700 ease-out animate-fade-in-up">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background Circle */}
          <circle
            className="text-gray-200"
            strokeWidth="18"   // ⬅️ Thicker background ring
            stroke="currentColor"
            fill="transparent"
            r="40"             // ⬅️ Slightly bigger radius
            cx="50"
            cy="50"
          />
          {/* Progress Circle */}
          <circle
            className={`${color} transition-all duration-1000 ease-out`}
            strokeWidth="18"   // ⬅️ Thicker progress ring
            strokeDasharray="251" // Adjusted for radius=40
            strokeDashoffset={251 - (progress / 100) * 251}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
          />
        </svg>

        <span className="absolute text-lg sm:text-xl md:text-2xl font-bold text-black">
          {Number.isInteger(progress) ? progress : progress.toFixed(1)}%
        </span>
      </div>
      <p className="mt-4 font-bold text-base sm:text-lg text-black">{title}</p>
    </div>
  );
}
