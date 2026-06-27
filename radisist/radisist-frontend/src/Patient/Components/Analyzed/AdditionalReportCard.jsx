import React from "react";
import GraphCard from "./GraphCard";

export default function AdditionalReportCard({ scanData }) {
  // Helper to normalize values in case backend sends 0.985 instead of 98.5
  const normalize = (val) => {
    if (val === undefined || val === null) return 0;
    const num = parseFloat(val);
    return num <= 1 ? num * 100 : num;
  };

  const benignProb = normalize(scanData?.ai_benign_prob ?? 82);
  const malignantProb = normalize(scanData?.ai_malignant_prob ?? 18);
  const confidence = normalize(scanData?.ai_confidence ?? 89);
  const predictedClass = scanData?.ai_predicted_class || "Benign";

  const data = [
    { title: "Benign Probability", percentage: benignProb, color: predictedClass === "Benign" ? "text-green-600" : "text-[#7B1E3D]" },
    { title: "Malignant Probability", percentage: malignantProb, color: predictedClass === "Malignant" ? "text-red-600" : "text-[#7B1E3D]" },
    { title: "AI Confidence", percentage: confidence, color: "text-[#7B1E3D]" },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex justify-center ${index === 2 ? "col-span-2 md:col-span-1" : ""
              }`}
          >
            <GraphCard
              title={item.title}
              percentage={item.percentage} // Removed Math.round to support decimals
              color={item.color}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
