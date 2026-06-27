import React from "react";

function EndSummary() {
  return (
    <div className="p-6 bg-white shadow-[0_2px_80px_rgba(0,0,0,0.03)] rounded-xl">
      <h3 className="font-bold text-xl text-[#8C2347] mb-2">
        System Analysis Summary
      </h3>
      <p className="text-gray-700 text-base">
        Our AI system analyzed 120+ key image features to identify potential
        anomalies. The results are based on deep learning models trained on
        verified datasets.
      </p>
    </div>
  );
}

export default EndSummary;
