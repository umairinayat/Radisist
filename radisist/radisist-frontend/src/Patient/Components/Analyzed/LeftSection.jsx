import React from "react";
import ProgressCard from "./ProgressCard";
import AdditionalReportCard from "./AdditionalReportCard";

const LeftSection = ({ scanData }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* First Card */}
      <ProgressCard scanData={scanData} />

      {/* Second Card */}
      <AdditionalReportCard scanData={scanData} />

      {/* Add more cards below in future easily */}
      {/* <AnotherCard /> */}
    </div>
  );
};

export default LeftSection;
