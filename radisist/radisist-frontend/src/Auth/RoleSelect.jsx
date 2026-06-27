// RoleSelect.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaXRay } from "react-icons/fa";

function RoleSelect({ visible, onSelect }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 flex justify-center items-center z-[100] 
             bg-black/40 backdrop-blur-xl p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center max-w-4xl w-full"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight text-center">
              Select Your Role
            </h2>

            <p className="text-white/80 text-center mb-10 md:mb-14 max-w-md text-base md:text-lg">
              Choose how you want to continue your journey.
            </p>

            <div className="flex flex-col md:flex-row gap-8 md:gap-12 justify-center items-center w-full px-4">

              {/* Radiologist */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect("Radiologist")}
                className="cursor-pointer w-full max-w-[280px] bg-white text-black 
                   shadow-sm border border-gray-100 p-8 md:p-12 rounded-[2rem] 
                   text-center backdrop-blur-xl transition-all flex flex-col items-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-[#7F2040]/5 flex items-center justify-center mb-6 group-hover:bg-[#7F2040]/10 transition-colors">
                  <FaXRay style={{ color: "#7F2040", fontSize: "42px" }} />
                </div>
                <h3 className="text-2xl font-bold text-[#7F2040] mb-2 font-poppins">Radiologist</h3>
                <p className="text-gray-400 text-sm font-medium">Analyze and report scans</p>
              </motion.div>

              {/* Patient */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect("Patient")}
                className="cursor-pointer w-full max-w-[280px] bg-white text-black 
                   shadow-sm border border-gray-100 p-8 md:p-12 rounded-[2rem] 
                   text-center backdrop-blur-xl transition-all flex flex-col items-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-[#7F2040]/5 flex items-center justify-center mb-6 group-hover:bg-[#7F2040]/10 transition-colors">
                  <FaUser style={{ color: "#7F2040", fontSize: "42px" }} />
                </div>
                <h3 className="text-2xl font-bold text-[#7F2040] mb-2 font-poppins">Patient</h3>
                <p className="text-gray-400 text-sm font-medium">Manage health records</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RoleSelect;
